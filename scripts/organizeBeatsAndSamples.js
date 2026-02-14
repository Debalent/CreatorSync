/**
 * Organize Beats and Samples
 * Separates one-shot samples from complete beats
 * - Samples go to beat maker library
 * - Beats get imported to MB Productions user account
 */

const fs = require('fs').promises;
const path = require('path');
const { existsSync, mkdirSync, copyFileSync } = require('fs');
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../server/models/UserMongoose');
const Beat = require('../server/models/BeatMongoose');
const Sample = require('../server/models/Sample');

// Configuration
const EXTRACTED_DIR = path.join(__dirname, '../extracted_beats');
const SAMPLE_LIBRARY_BASE = path.join(__dirname, '../public/uploads/samples/library');
const BEATS_UPLOAD_DIR = path.join(__dirname, '../public/uploads/beats');
const ARTWORK_DIR = path.join(__dirname, '../public/uploads/artwork');

const PRODUCER_CONFIG = {
  username: 'MB_Productions',
  email: 'mbproductions@creatorsync.com',
  password: 'MBProd2026!',
  displayName: 'MB Productions',
  bio: 'Professional beat maker specializing in Hip Hop, Trap, and R&B. Creating fire beats since day one.',
  role: 'producer',
  subscription: 'pro'
};

// Patterns to identify samples (one-shots, loops, instruments)
const SAMPLE_PATTERNS = [
  // Drums
  /\b(kick|bd|bassdrum|bass drum)\b/i,
  /\b(snare|sd|snr)\b/i,
  /\b(hihat|hi-hat|hh|hat|ch|oh)\b/i,
  /\b(clap|handclap|cp)\b/i,
  /\b(tom|toms|lt|mt|ht)\b/i,
  /\b(crash|ride|cymbal|splash)\b/i,
  /\b(perc|percussion|shaker|tamb|conga|bongo)\b/i,
  /\b(rim|rimshot|stick)\b/i,

  // Bass
  /\b(808|bass|sub|sine)\b/i,
  /\b(reese|wobble)\b/i,

  // Melodic
  /\b(piano|keys|rhodes|organ|synth|pad|lead|pluck|arp)\b/i,
  /\b(guitar|strat|tele|acoustic)\b/i,
  /\b(string|violin|cello|orchestra)\b/i,
  /\b(bell|chime|mallet)\b/i,
  /\b(flute|sax|horn|brass|trumpet)\b/i,

  // FX
  /\b(fx|sfx|riser|down|sweep|whoosh|impact|crash)\b/i,
  /\b(noise|vinyl|static|atmos)\b/i,
  /\b(vocal|voc|voice|choir|ah|oh)\b/i,

  // Sample indicators
  /\b(one.?shot|oneshot|hit|sample|loop)\b/i,
  /\b(layer|layered)\b/i,
  /\d{2,3}(bpm)?\s*(loop|sample)/i,
  /_\d{1,3}$/, // Files ending with numbers like _01, _12
  /^[A-Z]{2,4}_/, // Files starting with abbreviations like VT_, STR_
];

// Patterns that indicate it's a complete beat/track
const BEAT_PATTERNS = [
  /\(mastered\)/i,
  /\(master\)/i,
  /\(final\)/i,
  /\(mixed\)/i,
  /\bbeat\b.*\d{2,3}\s*bpm/i, // "beat 140bpm"
  /\bprod\.?\s*by\b/i,
  /\bft\.?\b/i, // featuring
  /instrumental/i,
];

// Known beat names from the listing (user's productions)
const KNOWN_BEAT_NAMES = [
  'takin over', 'through the worst', 'the pride', 'to the rescue',
  'undone', 'up and done', 'vibe', 'views', 'woah', 'tuff',
  'u aint ready', 'wait 4 it', 'watchulookinat', 'what u drinkin',
  'what u take me fo', 'what u will take for it', 'whatchagonnado',
  'when in tulsa', 'who says', 'why!', 'woah now!', 'worth',
  'wtf', 'yooo', 'you and me', 'stop playin wit me mane',
  'targets', 'temptation', 'the high ride', 'think b4 u speak',
  'this whats poppin'
];

/**
 * Categorize a file as sample or beat
 */
function categorizeFile(filename) {
  const lowerName = filename.toLowerCase();
  const nameWithoutExt = path.parse(filename).name.toLowerCase();

  // Check if it's a known beat name
  for (const beatName of KNOWN_BEAT_NAMES) {
    if (nameWithoutExt.includes(beatName.toLowerCase())) {
      return { type: 'beat', name: beatName };
    }
  }

  // Check for beat patterns
  for (const pattern of BEAT_PATTERNS) {
    if (pattern.test(lowerName)) {
      return { type: 'beat', name: path.parse(filename).name };
    }
  }

  // Check for sample patterns
  for (const pattern of SAMPLE_PATTERNS) {
    if (pattern.test(lowerName)) {
      return { type: 'sample', category: determineSampleCategory(filename) };
    }
  }

  // Default: if it has common instrument/sample words, it's a sample
  // Otherwise, consider it a beat
  const hasInstrumentWords = /kick|snare|hat|clap|tom|808|bass|synth|pad|piano|guitar|fx/i.test(lowerName);

  if (hasInstrumentWords) {
    return { type: 'sample', category: determineSampleCategory(filename) };
  }

  // If file is very short (likely a one-shot), treat as sample
  // We'll check file size later
  return { type: 'beat', name: path.parse(filename).name };
}

/**
 * Determine sample category
 */
function determineSampleCategory(filename) {
  const lower = filename.toLowerCase();

  // Drum categories
  if (/kick|bd|bassdrum/i.test(lower)) return 'drums/kicks';
  if (/snare|sd|snr/i.test(lower)) return 'drums/snares';
  if (/hihat|hi-hat|hh|hat|ch|oh/i.test(lower)) return 'drums/hi-hats';
  if (/clap|handclap|cp/i.test(lower)) return 'drums/claps';
  if (/tom|lt|mt|ht/i.test(lower)) return 'drums/toms';
  if (/crash|ride|cymbal|splash/i.test(lower)) return 'drums/cymbals';
  if (/perc|shaker|tamb|conga|bongo|rim|stick/i.test(lower)) return 'drums/percussion';

  // Bass
  if (/808|bass|sub|reese|wobble/i.test(lower)) return 'bass';

  // Melodic
  if (/piano|keys|rhodes|organ|synth|pad|lead|pluck|arp|bell|chime/i.test(lower)) return 'melodic';
  if (/guitar|strat|tele/i.test(lower)) return 'melodic';
  if (/string|violin|cello|orchestra|brass|horn|flute|sax/i.test(lower)) return 'melodic';

  // FX
  if (/fx|sfx|riser|down|sweep|whoosh|impact|noise|vinyl|vocal|voc|voice/i.test(lower)) return 'fx';

  // Default to misc drums
  return 'drums/percussion';
}

/**
 * Connect to database
 */
async function connectDatabase() {
  const MONGODB_URI = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/creatorsync';
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');
}

/**
 * Create or get MB Productions user
 */
async function getOrCreateProducer() {
  let user = await User.findOne({ username: PRODUCER_CONFIG.username });

  if (user) {
    console.log(`✅ Found existing user: ${PRODUCER_CONFIG.username}\n`);
    return user;
  }

  console.log(`📝 Creating new user: ${PRODUCER_CONFIG.username}...`);

  const hashedPassword = await bcrypt.hash(PRODUCER_CONFIG.password, 12);

  user = new User({
    username: PRODUCER_CONFIG.username,
    email: PRODUCER_CONFIG.email,
    password: hashedPassword,
    displayName: PRODUCER_CONFIG.displayName,
    bio: PRODUCER_CONFIG.bio,
    role: PRODUCER_CONFIG.role,
    subscription: PRODUCER_CONFIG.subscription,
    profilePicture: '/assets/default-avatar.png'
  });

  await user.save();
  console.log(`✅ User created: ${PRODUCER_CONFIG.username}\n`);

  return user;
}

/**
 * Process samples
 */
async function processSamples(sampleFiles, userId) {
  console.log(`\n📦 Processing ${sampleFiles.length} samples...\n`);

  const categoryCounts = {};
  let imported = 0;
  let skipped = 0;

  for (const file of sampleFiles) {
    try {
      const sourcePath = path.join(EXTRACTED_DIR, file.filename);
      const destDir = path.join(SAMPLE_LIBRARY_BASE, file.category);

      // Create directory if needed
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      // Copy file with timestamp
      const timestamp = Date.now();
      const uniqueName = `${path.parse(file.filename).name}_${timestamp}${path.extname(file.filename)}`;
      const destPath = path.join(destDir, uniqueName);

      copyFileSync(sourcePath, destPath);

      // Create database record
      const relativePath = `/uploads/samples/library/${file.category}/${uniqueName}`;

      // Map our categories to schema categories
      const mainCategory = file.category.split('/')[0];
      let schemaCategory;
      if (mainCategory === 'drums') schemaCategory = 'drum';
      else if (mainCategory === 'bass') schemaCategory = 'bass';
      else if (mainCategory === 'melodic') schemaCategory = 'instrument';
      else if (mainCategory === 'fx') schemaCategory = 'fx';
      else schemaCategory = 'percussion';

      const sample = new Sample({
        name: path.parse(file.filename).name.replace(/_\d+$/, ''), // Remove timestamp from display name
        fileUrl: relativePath,
        category: schemaCategory,
        subcategory: file.category.includes('/') ? file.category.split('/')[1] : undefined,
        duration: 1.0, // Default, would need audio analysis for real value
        isPublic: true,
        isPremium: false,
        creator: userId
      });
      await sample.save();

      categoryCounts[file.category] = (categoryCounts[file.category] || 0) + 1;
      imported++;

      if (imported % 100 === 0) {
        console.log(`   Processed ${imported} samples...`);
      }

    } catch (error) {
      console.error(`❌ Failed to process ${file.filename}:`, error.message);
      skipped++;
    }
  }

  console.log(`\n✅ Imported ${imported} samples to library`);
  if (skipped > 0) {
    console.log(`⚠️  Skipped ${skipped} samples\n`);
  }

  console.log('📊 Samples by category:');
  Object.entries(categoryCounts).forEach(([category, count]) => {
    console.log(`   ${category}: ${count}`);
  });

  return { imported, skipped };
}

/**
 * Process beats
 */
async function processBeats(beatFiles, userId) {
  console.log(`\n🎵 Processing ${beatFiles.length} beats...\n`);

  if (!existsSync(BEATS_UPLOAD_DIR)) {
    mkdirSync(BEATS_UPLOAD_DIR, { recursive: true });
  }

  let imported = 0;
  let skipped = 0;

  for (const file of beatFiles) {
    try {
      const sourcePath = path.join(EXTRACTED_DIR, file.filename);
      const timestamp = Date.now();
      const uniqueName = `${timestamp}_${file.filename}`;
      const destPath = path.join(BEATS_UPLOAD_DIR, uniqueName);

      // Copy beat file
      copyFileSync(sourcePath, destPath);

      // Extract metadata from filename
      const metadata = parseBeatMetadata(file.beatName);

      // Create beat record
      const beat = new Beat({
        title: file.beatName,
        producer: userId,
        audioFile: `/uploads/beats/${uniqueName}`,
        bpm: metadata.bpm || 140,
        key: metadata.key || 'Unknown',
        genre: metadata.genre || 'Hip Hop',
        price: 29.99,
        tags: metadata.tags,
        description: `Original production by MB Productions`,
        artwork: '/assets/default-artwork.jpg',
        plays: 0,
        duration: 180 // Default, will be calculated on upload
      });

      await beat.save();
      imported++;

      console.log(`✅ ${file.beatName}`);

    } catch (error) {
      console.error(`❌ Failed to import ${file.beatName}:`, error.message);
      skipped++;
    }
  }

  console.log(`\n✅ Imported ${imported} beats`);
  if (skipped > 0) {
    console.log(`⚠️  Skipped ${skipped} beats`);
  }

  return { imported, skipped };
}

/**
 * Extract metadata from filename
 */
function parseBeatMetadata(name) {
  const metadata = {
    bpm: null,
    key: null,
    genre: null,
    tags: []
  };

  // Extract BPM
  const bpmMatch = name.match(/(\d{2,3})\s*bpm/i);
  if (bpmMatch) {
    metadata.bpm = parseInt(bpmMatch[1]);
  }

  // Extract key
  const keyMatch = name.match(/\b([A-G][#b]?)\s*(maj|min|m)?\b/i);
  if (keyMatch) {
    metadata.key = keyMatch[1] + (keyMatch[2] || '');
  }

  // Detect genre from keywords
  const lower = name.toLowerCase();
  if (/trap|808|drill/i.test(lower)) metadata.genre = 'Trap';
  else if (/hip.?hop|rap|boom.?bap/i.test(lower)) metadata.genre = 'Hip Hop';
  else if (/r&b|rnb|soul/i.test(lower)) metadata.genre = 'R&B';
  else if (/drill/i.test(lower)) metadata.genre = 'Drill';
  else if (/pop/i.test(lower)) metadata.genre = 'Pop';
  else if (/edm|house|techno/i.test(lower)) metadata.genre = 'EDM';

  // Generate tags
  metadata.tags = [metadata.genre, 'MB Productions'].filter(Boolean);
  if (metadata.bpm) metadata.tags.push(`${metadata.bpm}bpm`);

  return metadata;
}

/**
 * Extract tags from sample name
 */
function extractTags(filename) {
  const tags = [];
  const lower = filename.toLowerCase();

  if (/808/i.test(lower)) tags.push('808');
  if (/trap/i.test(lower)) tags.push('trap');
  if (/lo-?fi/i.test(lower)) tags.push('lofi');
  if (/vintage|retro/i.test(lower)) tags.push('vintage');
  if (/hard|heavy/i.test(lower)) tags.push('hard');
  if (/soft|smooth/i.test(lower)) tags.push('soft');

  return tags;
}

/**
 * Scan and categorize extracted files
 */
async function scanExtractedFiles() {
  console.log('🔍 Scanning extracted files...\n');

  const files = await fs.readdir(EXTRACTED_DIR);
  const audioFiles = files.filter(f => /\.(wav|mp3|flac|ogg|aac|m4a)$/i.test(f));

  console.log(`📁 Found ${audioFiles.length} audio files\n`);

  const samples = [];
  const beats = [];

  for (const filename of audioFiles) {
    const result = categorizeFile(filename);

    if (result.type === 'sample') {
      samples.push({
        filename,
        category: result.category
      });
    } else {
      beats.push({
        filename,
        beatName: result.name
      });
    }
  }

  console.log(`✅ Categorization complete:`);
  console.log(`   📦 Samples: ${samples.length}`);
  console.log(`   🎵 Beats: ${beats.length}\n`);

  return { samples, beats };
}

/**
 * Main function
 */
async function organize() {
  try {
    console.log('🎵 Starting organization process...\n');

    // Check if extracted directory exists
    if (!existsSync(EXTRACTED_DIR)) {
      console.error(`❌ Extracted beats directory not found: ${EXTRACTED_DIR}`);
      console.log('   Run extractWavFiles.js first to extract files from your drive.\n');
      process.exit(1);
    }

    // Scan and categorize
    const { samples, beats } = await scanExtractedFiles();

    if (samples.length === 0 && beats.length === 0) {
      console.log('❌ No files to process.\n');
      return;
    }

    // Connect to database
    console.log('🔌 Connecting to database...');
    await connectDatabase();

    // Get or create producer
    const producer = await getOrCreateProducer();

    // Process samples
    if (samples.length > 0) {
      await processSamples(samples, producer._id);
    }

    // Process beats
    if (beats.length > 0) {
      await processBeats(beats, producer._id);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✨ ORGANIZATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`👤 User: ${producer.username} (${producer.email})`);
    console.log(`📦 Samples added to beat maker library: ${samples.length}`);
    console.log(`🎵 Beats imported to profile: ${beats.length}`);
    console.log('='.repeat(60));
    console.log('\n💡 Login credentials:');
    console.log(`   Username: ${PRODUCER_CONFIG.username}`);
    console.log(`   Password: ${PRODUCER_CONFIG.password}`);
    console.log('   (Change password after first login)\n');

    await mongoose.disconnect();

  } catch (error) {
    console.error('\n❌ Organization error:', error);
    process.exit(1);
  }
}

// Run
organize();
