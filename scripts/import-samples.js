/**
 * Import Samples to MongoDB
 * Converts audio files from data folder to Sample documents
 */

const mongoose = require('mongoose');
const Sample = require('../server/models/Sample');
const path = require('path');
const fs = require('fs');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/creatorsync';

// Sample categories based on file names/folders
const categorizeSample = (filename) => {
  const lower = filename.toLowerCase();
  
  if (lower.includes('kick') || lower.includes('bd')) return { category: 'drum', subcategory: 'kick' };
  if (lower.includes('snare') || lower.includes('sd')) return { category: 'drum', subcategory: 'snare' };
  if (lower.includes('hat') || lower.includes('hh') || lower.includes('hihat')) return { category: 'drum', subcategory: 'hi-hat' };
  if (lower.includes('clap') || lower.includes('cp')) return { category: 'drum', subcategory: 'clap' };
  if (lower.includes('tom')) return { category: 'drum', subcategory: 'tom' };
  if (lower.includes('cymbal') || lower.includes('crash') || lower.includes('ride')) return { category: 'drum', subcategory: 'cymbal' };
  if (lower.includes('perc') || lower.includes('shaker') || lower.includes('tambourine')) return { category: 'percussion', subcategory: 'percussion' };
  if (lower.includes('bass') || lower.includes('808') || lower.includes('sub')) return { category: 'bass', subcategory: 'bass' };
  if (lower.includes('synth') || lower.includes('lead') || lower.includes('pad')) return { category: 'synth', subcategory: 'synth' };
  if (lower.includes('vocal') || lower.includes('vox') || lower.includes('voice')) return { category: 'vocal', subcategory: 'vocal' };
  if (lower.includes('fx') || lower.includes('sfx') || lower.includes('effect')) return { category: 'fx', subcategory: 'effect' };
  if (lower.includes('loop')) return { category: 'loop', subcategory: 'loop' };
  
  // Default
  return { category: 'instrument', subcategory: 'other' };
};

// Extract tags from filename
const extractTags = (filename) => {
  const tags = [];
  const lower = filename.toLowerCase();
  
  // Genre tags
  if (lower.includes('hip') || lower.includes('hop')) tags.push('hip-hop');
  if (lower.includes('trap')) tags.push('trap');
  if (lower.includes('drill')) tags.push('drill');
  if (lower.includes('house')) tags.push('house');
  if (lower.includes('techno')) tags.push('techno');
  if (lower.includes('dnb') || lower.includes('drum') && lower.includes('bass')) tags.push('dnb');
  
  // Characteristics
  if (lower.includes('heavy') || lower.includes('hard')) tags.push('heavy');
  if (lower.includes('soft') || lower.includes('light')) tags.push('soft');
  if (lower.includes('vintage') || lower.includes('retro')) tags.push('vintage');
  if (lower.includes('modern')) tags.push('modern');
  if (lower.includes('acoustic')) tags.push('acoustic');
  if (lower.includes('electric')) tags.push('electric');
  
  return tags.length > 0 ? tags : ['general'];
};

// Get audio duration (mock - you'd use audio library in production)
const getAudioDuration = (filepath) => {
  try {
    const stats = fs.statSync(filepath);
    // Estimate: MP3 128kbps = ~1MB per minute
    // WAV 44.1kHz 16-bit stereo = ~10MB per minute
    const extension = path.extname(filepath).toLowerCase();
    const sizeInMB = stats.size / (1024 * 1024);
    
    if (extension === '.wav') {
      return Math.max(0.1, sizeInMB / 10 * 60); // seconds
    } else {
      return Math.max(0.1, sizeInMB / 1 * 60); // seconds for MP3
    }
  } catch (error) {
    return 1.0; // default 1 second
  }
};

async function importSamples() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Path to samples folder (adjust based on your structure)
    const samplesPath = path.join(__dirname, '../public/uploads/samples');
    
    // Check if samples directory exists
    if (!fs.existsSync(samplesPath)) {
      console.log(`Creating samples directory: ${samplesPath}`);
      fs.mkdirSync(samplesPath, { recursive: true });
    }

    // Get all audio files
    const files = fs.readdirSync(samplesPath).filter(file => 
      /\.(mp3|wav|flac|ogg)$/i.test(file)
    );

    if (files.length === 0) {
      console.log('⚠️  No audio files found in uploads/samples folder');
      console.log('Creating 10 example sample documents with placeholder data...\n');
      
      // Create example samples for testing
      const exampleSamples = [
        { name: 'Kick Heavy 808', category: 'drum', subcategory: 'kick', tags: ['hip-hop', '808', 'heavy'] },
        { name: 'Snare Trap Clap', category: 'drum', subcategory: 'snare', tags: ['trap', 'clap'] },
        { name: 'Hi-Hat Closed', category: 'drum', subcategory: 'hi-hat', tags: ['drum', 'closed'] },
        { name: 'Hi-Hat Open', category: 'drum', subcategory: 'hi-hat', tags: ['drum', 'open'] },
        { name: 'Bass 808 Sub', category: 'bass', subcategory: 'bass', tags: ['808', 'sub', 'heavy'] },
        { name: 'Synth Lead Pluck', category: 'synth', subcategory: 'synth', tags: ['lead', 'pluck'] },
        { name: 'Vocal Chop', category: 'vocal', subcategory: 'vocal', tags: ['chop', 'vocal'] },
        { name: 'Clap Layered', category: 'drum', subcategory: 'clap', tags: ['layered', 'clap'] },
        { name: 'Tom Low', category: 'drum', subcategory: 'tom', tags: ['tom', 'low'] },
        { name: 'Cymbal Crash', category: 'drum', subcategory: 'cymbal', tags: ['cymbal', 'crash'] }
      ];

      for (const example of exampleSamples) {
        await Sample.create({
          name: example.name,
          description: `Example ${example.category} sample`,
          category: example.category,
          subcategory: example.subcategory,
          fileUrl: '/uploads/samples/placeholder.mp3', // Placeholder
          duration: 1.5,
          tags: example.tags,
          isPublic: true,
          isPremium: false,
          metadata: {
            sampleRate: 44100,
            bitDepth: 16,
            channels: 2,
            format: 'mp3'
          }
        });
        console.log(`✅ Created: ${example.name}`);
      }

      console.log(`\n✅ Successfully created ${exampleSamples.length} example samples`);
      
    } else {
      console.log(`Found ${files.length} audio files to import\n`);

      let imported = 0;
      let skipped = 0;

      for (const file of files) {
        try {
          const filepath = path.join(samplesPath, file);
          const filename = path.parse(file).name;
          
          // Check if already exists
          const existing = await Sample.findOne({ fileUrl: `/uploads/samples/${file}` });
          if (existing) {
            console.log(`⏭️  Skipped (exists): ${filename}`);
            skipped++;
            continue;
          }

          // Categorize
          const { category, subcategory } = categorizeSample(filename);
          const tags = extractTags(filename);
          const duration = getAudioDuration(filepath);
          const extension = path.extname(file).substring(1);

          // Create sample document
          const sample = await Sample.create({
            name: filename,
            description: `${category} sample - ${subcategory}`,
            category,
            subcategory,
            fileUrl: `/uploads/samples/${file}`,
            duration,
            tags,
            isPublic: true,
            isPremium: false,
            metadata: {
              sampleRate: 44100,
              bitDepth: 16,
              channels: 2,
              format: extension
            }
          });

          console.log(`✅ Imported: ${filename} (${category}/${subcategory})`);
          imported++;

        } catch (error) {
          console.error(`❌ Error importing ${file}:`, error.message);
        }
      }

      console.log(`\n✅ Successfully imported ${imported} samples`);
      if (skipped > 0) {
        console.log(`⏭️  Skipped ${skipped} existing samples`);
      }
    }

    // Show stats
    const totalSamples = await Sample.countDocuments();
    const byCategory = await Sample.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log(`\n📊 Database Stats:`);
    console.log(`Total Samples: ${totalSamples}`);
    console.log(`\nBy Category:`);
    byCategory.forEach(cat => {
      console.log(`  ${cat._id}: ${cat.count}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run import
importSamples();
