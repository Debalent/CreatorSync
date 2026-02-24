/**
 * Extract WAV Files from Flash Drive
 * Simple file copier - no database required
 */

const fs = require('fs').promises;
const path = require('path');
const { existsSync, mkdirSync } = require('fs');

// Audio file extensions to extract
const AUDIO_EXTENSIONS = ['.wav', '.mp3', '.flac', '.ogg', '.aac', '.m4a'];
const OUTPUT_DIR = path.join(__dirname, '../extracted_beats');

/**
 * Recursively scan directory for audio files
 */
async function scanDirectory(dirPath, audioFiles = []) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip system directories
        if (entry.name.startsWith('.') || entry.name === 'System Volume Information' || entry.name === '$RECYCLE.BIN') {
          continue;
        }
        await scanDirectory(fullPath, audioFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (AUDIO_EXTENSIONS.includes(ext)) {
          const stats = await fs.stat(fullPath);
          audioFiles.push({
            path: fullPath,
            name: entry.name,
            size: stats.size,
            extension: ext
          });
        }
      }
    }

    return audioFiles;
  } catch (error) {
    console.error(`❌ Error scanning ${dirPath}:`, error.message);
    return audioFiles;
  }
}

/**
 * Copy files to output directory
 */
async function copyFiles(files) {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let copied = 0;
  let failed = 0;

  console.log(`\n📁 Output directory: ${OUTPUT_DIR}\n`);

  for (const file of files) {
    try {
      const timestamp = Date.now();
      const uniqueName = `${path.parse(file.name).name}_${timestamp}${file.extension}`;
      const outputPath = path.join(OUTPUT_DIR, uniqueName);

      await fs.copyFile(file.path, outputPath);
      console.log(`✅ Copied: ${file.name} → ${uniqueName}`);
      copied++;
    } catch (error) {
      console.error(`❌ Failed to copy ${file.name}:`, error.message);
      failed++;
    }
  }

  return { copied, failed };
}

/**
 * Main extraction function
 */
async function extractFiles(drivePath) {
  console.log('🎵 Starting audio file extraction...\n');
  console.log(`📂 Scanning drive: ${drivePath}\n`);

  // Validate drive path
  if (!existsSync(drivePath)) {
    console.error(`❌ Drive path not found: ${drivePath}`);
    console.log('\n💡 Make sure your flash drive is inserted and the path is correct.');
    console.log('   Example: E:\\ or D:\\MyBeats\n');
    process.exit(1);
  }

  try {
    // Scan for audio files
    console.log('🔍 Scanning for audio files...\n');
    const audioFiles = await scanDirectory(drivePath);

    if (audioFiles.length === 0) {
      console.log('❌ No audio files found on the drive.');
      console.log(`   Supported formats: ${AUDIO_EXTENSIONS.join(', ')}\n`);
      return;
    }

    console.log(`\n✅ Found ${audioFiles.length} audio files:\n`);

    // Group by extension
    const byExtension = audioFiles.reduce((acc, file) => {
      acc[file.extension] = (acc[file.extension] || 0) + 1;
      return acc;
    }, {});

    Object.entries(byExtension).forEach(([ext, count]) => {
      console.log(`   ${ext}: ${count} files`);
    });

    // Calculate total size
    const totalSize = audioFiles.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    console.log(`   Total size: ${totalSizeMB} MB\n`);

    // Copy files
    console.log('📋 Copying files...\n');
    const { copied, failed } = await copyFiles(audioFiles);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✨ EXTRACTION COMPLETE');
    console.log('='.repeat(50));
    console.log(`✅ Successfully copied: ${copied} files`);
    if (failed > 0) {
      console.log(`❌ Failed: ${failed} files`);
    }
    console.log(`📁 Location: ${OUTPUT_DIR}`);
    console.log('='.repeat(50) + '\n');

    // List all copied files
    if (copied > 0) {
      console.log('📝 Copied files:\n');
      const outputFiles = await fs.readdir(OUTPUT_DIR);
      outputFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Extraction error:', error.message);
    process.exit(1);
  }
}

// Get drive path from command line
const drivePath = process.argv[2];

if (!drivePath) {
  console.log('❌ Please provide the drive path\n');
  console.log('Usage: node scripts/extractWavFiles.js <drive-path>\n');
  console.log('Examples:');
  console.log('  node scripts/extractWavFiles.js E:\\');
  console.log('  node scripts/extractWavFiles.js "D:\\My Beats"\n');
  process.exit(1);
}

// Run extraction
extractFiles(drivePath);
