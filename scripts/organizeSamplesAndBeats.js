const fs = require('fs');
const path = require('path');
const { parseFile } = require('music-metadata');

const UPLOADS_DIR = path.join(__dirname, '../public/uploads/beats');
const SAMPLES_DIR = path.join(__dirname, '../public/uploads/samples');
const BEATS_DIR = path.join(__dirname, '../public/uploads/user-beats');
const ONE_MINUTE_MS = 60000;

async function getAudioDuration(filePath) {
  try {
    const metadata = await parseFile(filePath);
    if (metadata.format && metadata.format.duration) {
      return metadata.format.duration * 1000; // Convert to milliseconds
    }
  } catch (error) {
    console.error(`Error reading metadata for ${filePath}:`, error.message);
  }
  return null;
}

async function organizeSamplesAndBeats() {
  try {
    // Create directories if they don't exist
    if (!fs.existsSync(SAMPLES_DIR)) {
      fs.mkdirSync(SAMPLES_DIR, { recursive: true });
      console.log(`Created directory: ${SAMPLES_DIR}`);
    }
    if (!fs.existsSync(BEATS_DIR)) {
      fs.mkdirSync(BEATS_DIR, { recursive: true });
      console.log(`Created directory: ${BEATS_DIR}`);
    }

    const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.toLowerCase().endsWith('.wav'));

    if (files.length === 0) {
      console.log('No WAV files found in beats directory');
      return;
    }

    console.log(`\nOrganizing ${files.length} WAV files...\n`);

    let samplesCount = 0;
    let beatsCount = 0;
    let errorCount = 0;

    for (const file of files) {
      const sourcePath = path.join(UPLOADS_DIR, file);
      const duration = await getAudioDuration(sourcePath);

      if (duration !== null) {
        if (duration < ONE_MINUTE_MS) {
          // Copy to samples folder
          const destPath = path.join(SAMPLES_DIR, file);
          fs.copyFileSync(sourcePath, destPath);
          samplesCount++;
          console.log(`✓ SAMPLE: ${file} (${(duration / 1000).toFixed(2)}s)`);
        } else {
          // Copy to beats folder
          const destPath = path.join(BEATS_DIR, file);
          fs.copyFileSync(sourcePath, destPath);
          beatsCount++;
          console.log(`✓ BEAT: ${file} (${(duration / 60).toFixed(2)}m)`);
        }
      } else {
        errorCount++;
        console.log(`✗ ERROR reading: ${file}`);
      }
    }

    console.log('\n=== Organization Complete ===');
    console.log(`Samples copied to: ${SAMPLES_DIR}`);
    console.log(`Beats copied to: ${BEATS_DIR}`);
    console.log(`\nTotal samples: ${samplesCount}`);
    console.log(`Total beats: ${beatsCount}`);
    console.log(`Errors: ${errorCount}`);

  } catch (error) {
    console.error('Error organizing files:', error);
    process.exit(1);
  }
}

console.log('Starting WAV file organization into separate folders...\n');
organizeSamplesAndBeats();
