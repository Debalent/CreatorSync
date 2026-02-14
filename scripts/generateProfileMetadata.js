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

async function generateProfileMetadata() {
  try {
    const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.toLowerCase().endsWith('.wav'));

    const profileMetadata = {
      profile: {
        id: 'user-default',
        username: 'Creator',
        bio: 'Music Producer and Beat Creator',
        verified: false,
        joinDate: new Date().toISOString()
      },
      samples: [],
      beats: []
    };

    console.log(`Generating profile metadata for ${files.length} files...\n`);

    for (const file of files) {
      const filePath = path.join(UPLOADS_DIR, file);
      const duration = await getAudioDuration(filePath);

      if (duration !== null) {
        const durationSeconds = duration / 1000;
        const fileId = path.basename(file, '.wav');

        if (duration < ONE_MINUTE_MS) {
          profileMetadata.samples.push({
            id: fileId,
            filename: file,
            name: file.replace(/_[0-9]+\.wav$/, '').replace(/_/g, ' '),
            duration: durationSeconds,
            category: categorizeAudio(file),
            url: `/public/uploads/samples/${file}`,
            metadata: {
              format: 'wav',
              uploadedAt: new Date().toISOString(),
              isPublic: true
            }
          });
        } else {
          profileMetadata.beats.push({
            id: fileId,
            filename: file,
            title: file.replace(/_[0-9]+\.wav$/, '').replace(/_/g, ' '),
            duration: durationSeconds,
            category: categorizeAudio(file),
            url: `/public/uploads/user-beats/${file}`,
            price: 9.99,
            license: 'non-exclusive',
            metadata: {
              format: 'wav',
              bpm: 90,
              key: 'C',
              uploadedAt: new Date().toISOString(),
              isPublic: true,
              purchasable: true
            }
          });
        }
      }
    }

    // Save main profile metadata
    const profilePath = path.join(__dirname, '../data/profile-audio-metadata.json');
    fs.writeFileSync(profilePath, JSON.stringify(profileMetadata, null, 2));

    console.log(`✓ Profile metadata saved to: data/profile-audio-metadata.json`);
    console.log(`  - ${profileMetadata.samples.length} samples`);
    console.log(`  - ${profileMetadata.beats.length} beats`);

    // Save samples manifest
    const samplesManifest = {
      version: '1.0',
      count: profileMetadata.samples.length,
      samples: profileMetadata.samples
    };
    const samplesPath = path.join(__dirname, '../data/samples-manifest.json');
    fs.writeFileSync(samplesPath, JSON.stringify(samplesManifest, null, 2));
    console.log(`✓ Samples manifest saved to: data/samples-manifest.json`);

    // Save beats manifest
    const beatsManifest = {
      version: '1.0',
      count: profileMetadata.beats.length,
      beats: profileMetadata.beats
    };
    const beatsPath = path.join(__dirname, '../data/beats-manifest.json');
    fs.writeFileSync(beatsPath, JSON.stringify(beatsManifest, null, 2));
    console.log(`✓ Beats manifest saved to: data/beats-manifest.json`);

  } catch (error) {
    console.error('Error generating profile metadata:', error);
    process.exit(1);
  }
}

function categorizeAudio(filename) {
  const name = filename.toLowerCase();

  if (name.includes('drum') || name.includes('kick') || name.includes('snare') || name.includes('crash') || name.includes('cymbal') || name.includes('hat')) {
    return 'drums';
  }
  if (name.includes('bass') || name.includes('sub')) {
    return 'bass';
  }
  if (name.includes('synth') || name.includes('pad') || name.includes('lead') || name.includes('digi')) {
    return 'synth';
  }
  if (name.includes('piano') || name.includes('key') || name.includes('acoustic') || name.includes('guitar') || name.includes('string')) {
    return 'melodic';
  }
  if (name.includes('vocal') || name.includes('choir') || name.includes('voice') || name.includes('adlib')) {
    return 'vocal';
  }
  if (name.includes('fx') || name.includes('effect') || name.includes('noise') || name.includes('transition')) {
    return 'effects';
  }
  if (name.includes('loop') || name.includes('break')) {
    return 'loops';
  }

  return 'other';
}

console.log('Starting profile metadata generation...\n');
generateProfileMetadata();
