/**
 * Import Beats from Flash Drive
 * Creates a demo producer account and imports beats from external drive
 */

const fs = require('fs').promises;
const path = require('path');
const { copyFile } = require('fs').promises;
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../server/models/User');
const Beat = require('../server/models/Beat');

// Configuration
const PRODUCER_CONFIG = {
  username: 'MB_Productions',
  email: 'mbproductions@creatorsync.com',
  password: 'MBProd2026!', // Change this after first login
  displayName: 'MB Productions',
  bio: 'Professional beat maker specializing in Hip Hop, Trap, and R&B. Creating fire beats since day one.',
  role: 'producer',
  subscription: 'pro' // Give demo account pro features
};

const UPLOAD_DIR = path.join(__dirname, '../public/uploads/beats');
const ARTWORK_DIR = path.join(__dirname, '../public/uploads/artwork');

async function connectDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/creatorsync';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function createProducerAccount() {
  console.log('\n👤 Creating MB Productions account...');

  // Check if user already exists
  let user = await User.findOne({ username: PRODUCER_CONFIG.username });

  if (user) {
    console.log('⚠️  MB Productions account already exists');
    console.log(`   User ID: ${user._id}`);
    return user;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(PRODUCER_CONFIG.password, 12);

  // Create user
  user = await User.create({
    username: PRODUCER_CONFIG.username,
    email: PRODUCER_CONFIG.email,
    password: hashedPassword,
    displayName: PRODUCER_CONFIG.displayName,
    bio: PRODUCER_CONFIG.bio,
    role: PRODUCER_CONFIG.role,
    subscription: PRODUCER_CONFIG.subscription,
    verified: true,
    createdAt: new Date()
  });

  console.log('✅ MB Productions account created');
  console.log(`   Username: ${user.username}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   User ID: ${user._id}`);
  console.log(`   Subscription: ${user.subscription}`);

  return user;
}

async function scanFlashDrive(drivePath) {
  console.log(`\n📂 Scanning flash drive: ${drivePath}`);

  const audioFiles = [];

  try {
    const entries = await fs.readdir(drivePath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(drivePath, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subFiles = await scanFlashDrive(fullPath);
        audioFiles.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const audioExtensions = ['.wav', '.mp3', '.flac', '.ogg', '.aac', '.m4a'];

        if (audioExtensions.includes(ext)) {
          audioFiles.push({
            originalPath: fullPath,
            filename: entry.name,
            extension: ext
          });
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error scanning directory ${drivePath}:`, error.message);
  }

  return audioFiles;
}

function parseBeatMetadata(filename) {
  // Remove extension
  const nameWithoutExt = path.basename(filename, path.extname(filename));

  const metadata = {
    title: nameWithoutExt,
    bpm: null,
    key: null,
    tags: [],
    category: 'Hip Hop' // Default
  };

  // Extract BPM
  const bpmMatch = nameWithoutExt.match(/(\d{2,3})\s*bpm/i);
  if (bpmMatch) {
    metadata.bpm = parseInt(bpmMatch[1]);
  }

  // Extract key
  const keyMatch = nameWithoutExt.match(/([A-G][#b]?)(maj|min|m)?/i);
  if (keyMatch) {
    metadata.key = keyMatch[0];
  }

  // Extract genre/category
  const genres = {
    'trap': 'Trap',
    'hiphop': 'Hip Hop',
    'hip hop': 'Hip Hop',
    'rnb': 'R&B',
    'r&b': 'R&B',
    'drill': 'Drill',
    'pop': 'Pop',
    'edm': 'EDM',
    'house': 'House',
    'techno': 'Techno'
  };

  const lowerName = nameWithoutExt.toLowerCase();
  for (const [key, value] of Object.entries(genres)) {
    if (lowerName.includes(key)) {
      metadata.category = value;
      metadata.tags.push(value.toLowerCase());
      break;
    }
  }

  // Common descriptors
  const descriptors = ['hard', 'soft', 'dark', 'melodic', 'aggressive', 'chill', 'bouncy', 'emotional'];
  descriptors.forEach(desc => {
    if (lowerName.includes(desc)) {
      metadata.tags.push(desc);
    }
  });

  // Clean title (remove metadata markers)
  metadata.title = nameWithoutExt
    .replace(/\d{2,3}\s*bpm/gi, '')
    .replace(/[A-G][#b]?(maj|min|m)?/gi, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  return metadata;
}

async function copyBeatFiles(audioFile, userId) {
  try {
    // Create unique filename
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${audioFile.filename}`;
    const destPath = path.join(UPLOAD_DIR, uniqueFilename);

    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Copy file from flash drive to server
    await copyFile(audioFile.originalPath, destPath);

    // Generate relative URL
    const audioUrl = `/uploads/beats/${uniqueFilename}`;

    console.log(`  ✓ Copied: ${audioFile.filename}`);

    return {
      audioUrl,
      filename: uniqueFilename
    };
  } catch (error) {
    console.error(`  ❌ Failed to copy ${audioFile.filename}:`, error.message);
    return null;
  }
}

async function createBeatRecord(audioFile, userId) {
  const metadata = parseBeatMetadata(audioFile.filename);

  // Copy files
  const files = await copyBeatFiles(audioFile, userId);
  if (!files) return null;

  // Create beat record
  const beat = await Beat.create({
    title: metadata.title,
    artist: PRODUCER_CONFIG.displayName,
    producer: userId,
    category: metadata.category,
    audioUrl: files.audioUrl,
    artwork: '/assets/default-artwork.jpg', // Use default artwork
    bpm: metadata.bpm,
    key: metadata.key,
    tags: metadata.tags,
    price: 29.99, // Default price
    license: 'basic',
    isPublic: true,
    plays: 0,
    likes: 0,
    downloads: 0,
    createdAt: new Date()
  });

  return beat;
}

async function importBeats(drivePath) {
  console.log('\n🎵 Starting beat import process...\n');

  // Connect to database
  await connectDatabase();

  // Create producer account
  const user = await createProducerAccount();

  // Scan flash drive
  const audioFiles = await scanFlashDrive(drivePath);

  if (audioFiles.length === 0) {
    console.log('\n⚠️  No audio files found on flash drive');
    console.log(`   Path: ${drivePath}`);
    console.log('\nSupported formats: .wav, .mp3, .flac, .ogg, .aac, .m4a');
    process.exit(0);
  }

  console.log(`\n📊 Found ${audioFiles.length} audio files`);
  console.log('\n💾 Importing beats...\n');

  let imported = 0;
  let failed = 0;

  for (const audioFile of audioFiles) {
    try {
      const beat = await createBeatRecord(audioFile, user._id);
      if (beat) {
        imported++;
        console.log(`  ✅ Imported: ${beat.title}`);
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`  ❌ Failed: ${audioFile.filename} - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`\n📊 Summary:`);
  console.log(`  Total files: ${audioFiles.length}`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Failed: ${failed}`);

  console.log(`\n👤 MB Productions Account:`);
  console.log(`  Username: ${user.username}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Password: ${PRODUCER_CONFIG.password}`);
  console.log(`  Total Beats: ${imported}`);

  console.log(`\n🔐 IMPORTANT: Change the password after first login!`);

  await mongoose.connection.close();
  console.log('\n🔌 Database connection closed');
}

// Get drive path from command line arguments
const drivePath = process.argv[2];

if (!drivePath) {
  console.log('\n❌ Error: Flash drive path required\n');
  console.log('Usage:');
  console.log('  node scripts/importBeatsFromDrive.js <drive-path>\n');
  console.log('Examples:');
  console.log('  Windows: node scripts/importBeatsFromDrive.js D:\\MyBeats');
  console.log('  Windows: node scripts/importBeatsFromDrive.js "E:\\MB Productions\\Beats"');
  console.log('  Mac/Linux: node scripts/importBeatsFromDrive.js /Volumes/FlashDrive/Beats\n');
  process.exit(1);
}

// Run import
importBeats(drivePath).catch(error => {
  console.error('\n❌ Import failed:', error);
  process.exit(1);
});
