/**
 * Sample Library Seeding Script
 * Scans the library folder and adds samples to the database
 */

const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Import database connection (adjust based on your setup)
const mongoose = require('mongoose');
const Sample = require('../server/models/Sample');

const LIBRARY_PATH = path.join(__dirname, '../public/uploads/samples/library');
const SYSTEM_USER_ID = 'system'; // Or use actual admin user ID

// Category mapping based on folder structure
const CATEGORY_MAP = {
  'kicks': 'Drums',
  'snares': 'Drums',
  'hi-hats': 'Drums',
  'claps': 'Drums',
  'percussion': 'Drums',
  'bass': 'Bass',
  'melodic': 'Melodic',
  'fx': 'FX'
};

// Tag mapping for better organization
const TAG_MAP = {
  'kicks': ['kick', 'bass drum', 'bd'],
  'snares': ['snare', 'sd'],
  'hi-hats': ['hi-hat', 'hihat', 'hh', 'closed', 'open'],
  'claps': ['clap', 'handclap'],
  'percussion': ['percussion', 'perc', 'shaker', 'conga', 'bongo'],
  'bass': ['bass', '808', 'sub', 'low end'],
  'melodic': ['melody', 'synth', 'keys', 'piano', 'chord'],
  'fx': ['effect', 'riser', 'impact', 'transition', 'sweep']
};

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

async function scanDirectory(dir, baseCategory = '') {
  const samples = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subSamples = await scanDirectory(fullPath, entry.name);
        samples.push(...subSamples);
      } else if (entry.isFile()) {
        // Check if it's an audio file
        const ext = path.extname(entry.name).toLowerCase();
        const audioExtensions = ['.wav', '.mp3', '.flac', '.ogg', '.aac', '.m4a'];

        if (audioExtensions.includes(ext)) {
          // Create relative URL for web access
          const relativePath = fullPath.replace(
            path.join(__dirname, '../public'),
            ''
          ).replace(/\\/g, '/');

          const category = CATEGORY_MAP[baseCategory] || 'Other';
          const tags = TAG_MAP[baseCategory] || [];

          // Parse filename for additional metadata
          const nameWithoutExt = path.basename(entry.name, ext);
          const metadata = parseFilename(nameWithoutExt);

          samples.push({
            name: metadata.name || nameWithoutExt,
            fileUrl: relativePath,
            category: category,
            tags: [...tags, ...metadata.tags],
            bpm: metadata.bpm || null,
            key: metadata.key || null,
            uploadedBy: SYSTEM_USER_ID,
            isPublic: true,
            isLibrary: true,
            fileSize: (await fs.stat(fullPath)).size
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }

  return samples;
}

function parseFilename(filename) {
  const metadata = {
    name: filename,
    tags: [],
    bpm: null,
    key: null
  };

  // Extract BPM (e.g., "120bpm", "120 BPM", "120-bpm")
  const bpmMatch = filename.match(/(\d{2,3})\s*bpm/i);
  if (bpmMatch) {
    metadata.bpm = parseInt(bpmMatch[1]);
    metadata.tags.push(`${metadata.bpm}bpm`);
  }

  // Extract key (e.g., "Cmaj", "C#min", "Am")
  const keyMatch = filename.match(/([A-G][#b]?)(maj|min|m)?/i);
  if (keyMatch) {
    metadata.key = keyMatch[0];
    metadata.tags.push(metadata.key);
  }

  // Common genre tags
  const genres = ['trap', 'hip hop', 'edm', 'house', 'techno', 'r&b', 'pop', 'drill'];
  genres.forEach(genre => {
    if (filename.toLowerCase().includes(genre.replace(' ', ''))) {
      metadata.tags.push(genre);
    }
  });

  // Common descriptors
  const descriptors = ['hard', 'soft', 'deep', 'bright', 'dark', 'vintage', 'modern', 'analog', 'digital'];
  descriptors.forEach(desc => {
    if (filename.toLowerCase().includes(desc)) {
      metadata.tags.push(desc);
    }
  });

  return metadata;
}

async function seedSamples() {
  console.log('🌱 Starting sample library seeding...\n');

  await connectDatabase();

  console.log('📂 Scanning library folder...');
  const samples = await scanDirectory(LIBRARY_PATH);

  console.log(`\n📊 Found ${samples.length} audio files\n`);

  if (samples.length === 0) {
    console.log('⚠️  No samples found. Please add audio files to:');
    console.log(`   ${LIBRARY_PATH}`);
    console.log('\nFolder structure:');
    console.log('  - library/drums/kicks/');
    console.log('  - library/drums/snares/');
    console.log('  - library/drums/hi-hats/');
    console.log('  - library/bass/');
    console.log('  - library/melodic/');
    console.log('  - library/fx/');
    process.exit(0);
  }

  // Check if samples already exist
  console.log('🔍 Checking for existing library samples...');
  const existingCount = await Sample.countDocuments({ isLibrary: true });

  if (existingCount > 0) {
    console.log(`\n⚠️  Found ${existingCount} existing library samples.`);
    console.log('Do you want to:');
    console.log('  1. Skip seeding (keep existing)');
    console.log('  2. Add new samples (merge)');
    console.log('  3. Replace all (delete existing, add new)');
    console.log('\nRun with --force to auto-replace or --merge to auto-merge');

    const mode = process.argv.includes('--force') ? 'replace' :
                 process.argv.includes('--merge') ? 'merge' : 'skip';

    if (mode === 'skip') {
      console.log('\n✅ Skipping seeding. Use --merge or --force flags to proceed.');
      process.exit(0);
    }

    if (mode === 'replace') {
      console.log('\n🗑️  Removing existing library samples...');
      await Sample.deleteMany({ isLibrary: true });
      console.log('✅ Existing samples removed');
    }
  }

  // Insert samples in batches
  console.log('\n💾 Inserting samples into database...');
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < samples.length; i += batchSize) {
    const batch = samples.slice(i, i + batchSize);

    try {
      await Sample.insertMany(batch, { ordered: false });
      inserted += batch.length;
      console.log(`  ✓ Inserted ${inserted}/${samples.length} samples`);
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error - some samples already exist
        const duplicates = error.writeErrors?.length || 0;
        inserted += (batch.length - duplicates);
        console.log(`  ⚠️  Skipped ${duplicates} duplicates, inserted ${inserted}/${samples.length}`);
      } else {
        console.error('  ❌ Batch insert error:', error.message);
      }
    }
  }

  console.log(`\n✅ Seeding complete!`);
  console.log(`\n📊 Summary:`);
  console.log(`  Total files scanned: ${samples.length}`);
  console.log(`  Samples inserted: ${inserted}`);
  console.log(`  Duplicates skipped: ${samples.length - inserted}`);

  // Category breakdown
  const categories = {};
  samples.forEach(s => {
    categories[s.category] = (categories[s.category] || 0) + 1;
  });

  console.log(`\n📂 By Category:`);
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} samples`);
  });

  await mongoose.connection.close();
  console.log('\n🔌 Database connection closed');
}

// Run the seeding
seedSamples().catch(error => {
  console.error('\n❌ Seeding failed:', error);
  process.exit(1);
});
