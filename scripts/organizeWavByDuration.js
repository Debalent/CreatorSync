const fs = require('fs');
const path = require('path');
const { parseFile } = require('music-metadata');

const UPLOADS_DIR = path.join(__dirname, '../public/uploads/beats');
const SAMPLES_DIR = path.join(__dirname, '../public/uploads/samples');
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

async function organizeWavFiles() {
  try {
    const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.toLowerCase().endsWith('.wav'));

    if (files.length === 0) {
      console.log('No WAV files found in beats directory');
      return;
    }

    console.log(`Found ${files.length} WAV files to analyze...`);

    const samples = [];
    const userProfileBeats = [];
    let processed = 0;

    for (const file of files) {
      const filePath = path.join(UPLOADS_DIR, file);
      const duration = await getAudioDuration(filePath);

      if (duration !== null) {
        processed++;
        console.log(`[${processed}/${files.length}] ${file}: ${(duration / 1000).toFixed(2)}s`);

        if (duration < ONE_MINUTE_MS) {
          samples.push({ file, duration: duration / 1000 });
        } else {
          userProfileBeats.push({ file, duration: duration / 1000 });
        }
      }
    }

    console.log('\n=== Organization Summary ===');
    console.log(`Total files processed: ${processed}`);
    console.log(`\nSamples (<1 minute): ${samples.length}`);
    console.log(`User Profile Beats (>1 minute): ${userProfileBeats.length}`);

    // Create organization report
    const report = {
      timestamp: new Date().toISOString(),
      totalProcessed: processed,
      samples: {
        count: samples.length,
        files: samples.sort((a, b) => a.duration - b.duration)
      },
      userProfileBeats: {
        count: userProfileBeats.length,
        files: userProfileBeats.sort((a, b) => b.duration - a.duration)
      }
    };

    // Save report
    const reportPath = path.join(__dirname, '../organization-log-wav.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: organization-log-wav.json`);

    // Display top samples
    if (samples.length > 0) {
      console.log('\nTop 10 Samples:');
      samples.slice(-10).forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.file} (${s.duration.toFixed(2)}s)`);
      });
    }

    // Display top user profile beats
    if (userProfileBeats.length > 0) {
      console.log('\nTop 10 User Profile Beats:');
      userProfileBeats.slice(0, 10).forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.file} (${(s.duration / 60).toFixed(2)}m)`);
      });
    }

  } catch (error) {
    console.error('Error organizing WAV files:', error);
    process.exit(1);
  }
}

console.log('Starting WAV file organization by duration...\n');
organizeWavFiles();
