const fs = require('fs');
const path = require('path');
const { parseFile } = require('music-metadata');

const UPLOADS_DIR = path.join(__dirname, '../public/uploads/beats');
const ONE_MINUTE_MS = 60000;

async function getAudioDuration(filePath) {
  try {
    const metadata = await parseFile(filePath);
    if (metadata.format && metadata.format.duration) {
      return metadata.format.duration * 1000;
    }
  } catch (error) {
    return null;
  }
  return null;
}

async function generateSeedData() {
  try {
    const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.toLowerCase().endsWith('.wav'));

    const samples = [];
    const beats = [];

    console.log(`Generating seed data for ${files.length} files...\n`);

    for (const file of files) {
      const filePath = path.join(UPLOADS_DIR, file);
      const duration = await getAudioDuration(filePath);

      if (duration !== null) {
        const durationSeconds = duration / 1000;
        const stats = fs.statSync(filePath);

        if (duration < ONE_MINUTE_MS) {
          // Sample data
          samples.push({
            filename: file,
            name: file.replace(/_[0-9]+\.wav$/, '').replace(/_/g, ' '),
            type: 'sample',
            duration: durationSeconds,
            size: stats.size,
            uploadedAt: new Date(stats.mtimeMs),
            tags: extractTags(file),
            isPublic: true
          });
        } else {
          // Beat data
          beats.push({
            filename: file,
            title: file.replace(/_[0-9]+\.wav$/, '').replace(/_/g, ' '),
            type: 'beat',
            duration: durationSeconds,
            size: stats.size,
            uploadedAt: new Date(stats.mtimeMs),
            price: 9.99,
            tags: extractTags(file),
            isPublic: true,
            bpm: 90
          });
        }
      }
    }

    const seedData = {
      timestamp: new Date().toISOString(),
      samples: {
        count: samples.length,
        data: samples
      },
      beats: {
        count: beats.length,
        data: beats
      }
    };

    const seedPath = path.join(__dirname, '../data/seed-audio-files.json');
    fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2));

    console.log(`✓ Seed data saved to: data/seed-audio-files.json`);
    console.log(`  - ${samples.length} samples`);
    console.log(`  - ${beats.length} beats`);

  } catch (error) {
    console.error('Error generating seed data:', error);
    process.exit(1);
  }
}

function extractTags(filename) {
  const tags = [];
  const name = filename.toLowerCase();

  // Extract genre/type tags
  if (name.includes('drum') || name.includes('kick') || name.includes('snare') || name.includes('crash')) tags.push('drum');
  if (name.includes('bass') || name.includes('sub')) tags.push('bass');
  if (name.includes('synth') || name.includes('pad') || name.includes('lead')) tags.push('synth');
  if (name.includes('piano') || name.includes('key') || name.includes('acoustic')) tags.push('melodic');
  if (name.includes('vocal') || name.includes('choir') || name.includes('voice')) tags.push('vocal');
  if (name.includes('fx') || name.includes('effect') || name.includes('noise')) tags.push('effect');
  if (name.includes('lo-fi') || name.includes('lofi')) tags.push('lo-fi');
  if (name.includes('trap') || name.includes('hip') || name.includes('hop')) tags.push('hip-hop');
  if (name.includes('house') || name.includes('electronic') || name.includes('edm')) tags.push('electronic');

  return tags.length > 0 ? tags : ['general'];
}

console.log('Starting seed data generation...\n');
generateSeedData();
