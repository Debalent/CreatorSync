#!/usr/bin/env node

/**
 * CreatorSync Document Conversion Script
 *
 * This script helps convert Markdown files to DOCX format for investor presentations.
 *
 * Usage:
 *   node docs/convert_to_docx.js
 *
 * Requirements:
 *   - Node.js
 *   - pandoc (optional, for command line conversion)
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const docsDir = path.join(__dirname);
const filesToConvert = [
    'Market_Need_and_Revenue_Projections.md',
    'Acquisition_Pitch_Deck.md',
    'Conversion_and_Investor_Guide.md'
];

console.log('🎵 CreatorSync Document Conversion Tool');
console.log('=====================================\n');

// Check if pandoc is available
exec('pandoc --version', (error, stdout, stderr) => {
    const hasPandoc = !error;

    if (hasPandoc) {
        console.log('✅ Pandoc detected - using command line conversion\n');

        filesToConvert.forEach(file => {
            const inputPath = path.join(docsDir, file);
            const outputPath = path.join(docsDir, file.replace('.md', '.docx'));

            if (fs.existsSync(inputPath)) {
                console.log(`Converting ${file}...`);

                exec(`pandoc "${inputPath}" -o "${outputPath}"`, (error, stdout, stderr) => {
                    if (error) {
                        console.log(`❌ Error converting ${file}: ${error.message}`);
                        console.log(`💡 Manual conversion needed for ${file}`);
                    } else {
                        console.log(`✅ Successfully converted ${file} to ${file.replace('.md', '.docx')}`);
                    }
                });
            } else {
                console.log(`⚠️  File not found: ${file}`);
            }
        });
    } else {
        console.log('❌ Pandoc not detected - please use manual conversion\n');
        console.log('📋 Manual Conversion Instructions:');
        console.log('1. Open each .md file in a text editor');
        console.log('2. Copy all content (Ctrl+A, Ctrl+C)');
        console.log('3. Open Microsoft Word or similar');
        console.log('4. Paste content (Ctrl+V)');
        console.log('5. Save as .docx format\n');

        console.log('📄 Files to convert:');
        filesToConvert.forEach(file => {
            const filePath = path.join(docsDir, file);
            if (fs.existsSync(filePath)) {
                console.log(`   - ${file} (${fs.statSync(filePath).size} bytes)`);
            }
        });

        console.log('\n🔗 Online Conversion Tools:');
        console.log('   - https://www.markdowntopdf.com/');
        console.log('   - https://pandoc.org/try/');
        console.log('   - https://cloudconvert.com/md-to-docx');
    }
});

console.log('\n📞 Need help? Contact: demond.balentine@atlasschool.com');
