# Sample Library Download Guide

This guide will help you download free, high-quality samples to populate the CreatorSync beat maker library.

## Quick Start (Recommended Packs)

### Hip Hop / Trap Essentials

**Looperman - Top Trap & Hip Hop Packs:**
1. Visit: https://www.looperman.com/loops/tags/trap
2. Download these popular packs:
   - "Trap Drums Vol 1" by various artists
   - "808 Bass Collection" packs
   - "Hip Hop Percussion Essentials"
3. Save to: `public/uploads/samples/library/drums/`

**Freesound - 808 Collection:**
1. Visit: https://freesound.org/search/?q=808+bass&f=license%3A%22Creative+Commons+0%22
2. Filter by "Creative Commons 0" license
3. Download 20-30 variations of:
   - 808 kicks
   - 808 bass
   - 808 snares
4. Save to appropriate folders in `library/`

### Essential Drum Kit

**99Sounds - Free Drum Kits:**
1. Visit: https://99sounds.org/drum-samples/
2. Download:
   - "Essential Kicks Collection"
   - "Snare Drum Collection"
   - "Hi-Hat Pack"
3. Extract and organize into:
   - `library/drums/kicks/`
   - `library/drums/snares/`
   - `library/drums/hi-hats/`

**Sample Focus (Free Samples):**
1. Visit: https://samplefocus.com/
2. Create free account
3. Download 100 free samples per day
4. Search and download:
   - Trap drums
   - Hip hop percussion
   - 808 bass

### Melodic & FX

**LANDR Samples (Free):**
1. Visit: https://samples.landr.com/
2. Create free account
3. Download free packs:
   - "Keys & Chords"
   - "Synth Essentials"
   - "FX & Transitions"
4. Save to `library/melodic/` and `library/fx/`

**Bedroom Producers Blog:**
1. Visit: https://bedroomproducersblog.com/free-samples/
2. Download recent free sample packs
3. Look for genre-specific packs

## Step-by-Step Installation

### 1. Download Samples

Create a temporary folder on your desktop for downloads:
```
C:\Users\Admin\Desktop\SampleDownloads\
```

Download samples from the sites above and organize by type.

### 2. Organize Downloaded Files

Move files into the library folder structure:

```
CreatorSync/public/uploads/samples/library/
├── drums/
│   ├── kicks/      <- Move all kick drum samples here
│   ├── snares/     <- Move all snare samples here
│   ├── hi-hats/    <- Move all hi-hat samples here
│   ├── claps/      <- Move all clap samples here
│   └── percussion/ <- Move other percussion here
├── bass/           <- Move all bass samples here
├── melodic/        <- Move melodic/chord samples here
└── fx/             <- Move effects/transitions here
```

### 3. Run the Seeding Script

Once samples are in place, seed the database:

```bash
# From CreatorSync root directory
node scripts/seedSamples.js
```

Options:
- `--merge` - Add new samples to existing library
- `--force` - Replace all existing library samples

### 4. Verify in Beat Maker

1. Start the server: `npm run dev`
2. Open beat maker: http://localhost:3000/beat-maker.html
3. Check the "Library" tab - samples should appear

## Recommended Starter Collection

**Minimum Viable Library (500+ samples):**

- **Kicks:** 50-100 variations
  - 808 kicks (20)
  - Acoustic kicks (15)
  - Electronic kicks (15)
  - Layered kicks (10)

- **Snares:** 40-60 variations
  - Acoustic snares (15)
  - 808 snares (10)
  - Claps (10)
  - Rimshots (5)

- **Hi-Hats:** 30-50 variations
  - Closed hi-hats (15)
  - Open hi-hats (10)
  - Rolls (5)

- **Bass:** 40-60 samples
  - 808 bass (20)
  - Synth bass (15)
  - Sub bass (5)

- **Melodic:** 30-50 samples
  - Keys/piano (10)
  - Synth chords (10)
  - Pads (10)

- **FX:** 20-30 samples
  - Risers (5)
  - Impacts (5)
  - Transitions (5)
  - White noise (5)

## Bulk Download Scripts

### Option 1: Freesound API (Requires API Key)

```bash
# Install required package
npm install freesound-client

# Create script to download
node scripts/downloadFreesound.js
```

### Option 2: Manual Download with Browser Extension

Use a browser extension like "Download All Files" to batch download from Looperman or Freesound search results.

## File Naming Conventions

For best results, rename files with metadata:

**Good naming:**
- `kick_808_deep_120bpm_Cmaj.wav`
- `snare_acoustic_bright_140bpm.wav`
- `bass_808_sub_trap_Am.wav`

**Pattern:**
```
[type]_[style]_[descriptor]_[bpm]bpm_[key].ext
```

The seeding script will extract:
- BPM from filename
- Musical key
- Genre tags
- Descriptors

## License Compliance

**Safe to use (no attribution needed):**
- CC0 (Public Domain)
- Explicit "Royalty-free" licenses

**Attribution required:**
- CC-BY licenses
- Store attribution in sample metadata
- Display in credits section

**Avoid:**
- NC (Non-Commercial) licenses
- Copyrighted material without permission

## After Seeding

### Test the Library

1. Open beat maker
2. Switch to "Library" tab
3. Test search and filtering
4. Load a sample into a track
5. Verify playback works

### Add More Over Time

- Monitor Bedroom Producers Blog for new releases
- Check Looperman weekly for new packs
- Use Freesound API for automated additions
- Encourage users to make quality uploads public

## Troubleshooting

**"No samples found" after seeding:**
- Verify files are in correct folders
- Check file extensions (.wav, .mp3, .flac)
- Ensure MongoDB is running
- Check server logs for errors

**Samples not playing:**
- Verify file URLs are accessible
- Check MIME types are correct
- Test file playback directly in browser

**Database errors:**
- Ensure MongoDB connection in .env
- Check Sample model matches seeding data
- Verify uploadedBy field is valid

## Next Steps

After populating the library:

1. **Test beat maker** with library samples
2. **Create demo beats** to showcase platform
3. **Add more genres** (EDM, Rock, Jazz, etc.)
4. **Implement sample preview** player in library tab
5. **Add download tracking** for analytics

## Maintenance

**Weekly:**
- Add new samples from free sources
- Check for broken file links
- Update tags based on usage

**Monthly:**
- Review most/least used samples
- Add requested genres
- Clean up duplicates
- Update sample metadata

## Resources

- Looperman: https://www.looperman.com/
- Freesound: https://freesound.org/
- 99Sounds: https://99sounds.org/
- LANDR: https://samples.landr.com/
- Sample Focus: https://samplefocus.com/
- Bedroom Producers Blog: https://bedroomproducersblog.com/
- SampleSwap: https://sampleswap.org/

## Support

If you need help with sample library setup, check:
- `scripts/seedSamples.js` - Seeding script
- `server/models/Sample.js` - Sample database schema
- `server/routes/samples.js` - Sample API endpoints
