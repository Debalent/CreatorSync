const mongoose = require('mongoose');
const Sample = require('../models/Sample');
const SamplePack = require('../models/SamplePack');
require('dotenv').config();

/**
 * Seed sample database with initial drum samples
 * Run this script once to populate the database
 */

const drumSamples = [
  // Kicks
  { name: 'Deep Kick', category: 'drum', subcategory: 'kick', fileUrl: '/uploads/samples/kick-deep.wav', duration: 1.2, tags: ['kick', 'deep', 'bass', '808'] },
  { name: 'Punchy Kick', category: 'drum', subcategory: 'kick', fileUrl: '/uploads/samples/kick-punchy.wav', duration: 0.8, tags: ['kick', 'punchy', 'edm'] },
  { name: 'Classic 808 Kick', category: 'drum', subcategory: 'kick', fileUrl: '/uploads/samples/kick-808.wav', duration: 1.5, tags: ['kick', '808', 'trap', 'hip-hop'], isPremium: false },
  { name: 'Hard Kick', category: 'drum', subcategory: 'kick', fileUrl: '/uploads/samples/kick-hard.wav', duration: 0.6, tags: ['kick', 'hard', 'techno'] },

  // Snares
  { name: 'Crispy Snare', category: 'drum', subcategory: 'snare', fileUrl: '/uploads/samples/snare-crispy.wav', duration: 0.7, tags: ['snare', 'crispy', 'bright'] },
  { name: 'Fat Snare', category: 'drum', subcategory: 'snare', fileUrl: '/uploads/samples/snare-fat.wav', duration: 0.9, tags: ['snare', 'fat', 'punchy'] },
  { name: 'Trap Snare', category: 'drum', subcategory: 'snare', fileUrl: '/uploads/samples/snare-trap.wav', duration: 0.5, tags: ['snare', 'trap', 'hip-hop'] },
  { name: 'Acoustic Snare', category: 'drum', subcategory: 'snare', fileUrl: '/uploads/samples/snare-acoustic.wav', duration: 1.0, tags: ['snare', 'acoustic', 'live'], isPremium: true },

  // Hi-Hats
  { name: 'Closed Hi-Hat', category: 'drum', subcategory: 'hihat', fileUrl: '/uploads/samples/hihat-closed.wav', duration: 0.3, tags: ['hihat', 'closed', 'tight'] },
  { name: 'Open Hi-Hat', category: 'drum', subcategory: 'hihat', fileUrl: '/uploads/samples/hihat-open.wav', duration: 0.8, tags: ['hihat', 'open'] },
  { name: 'Pedal Hi-Hat', category: 'drum', subcategory: 'hihat', fileUrl: '/uploads/samples/hihat-pedal.wav', duration: 0.4, tags: ['hihat', 'pedal'] },
  { name: '808 Hi-Hat', category: 'drum', subcategory: 'hihat', fileUrl: '/uploads/samples/hihat-808.wav', duration: 0.2, tags: ['hihat', '808', 'trap'] },

  // Claps
  { name: 'Studio Clap', category: 'percussion', subcategory: 'clap', fileUrl: '/uploads/samples/clap-studio.wav', duration: 0.6, tags: ['clap', 'studio'] },
  { name: 'Tight Clap', category: 'percussion', subcategory: 'clap', fileUrl: '/uploads/samples/clap-tight.wav', duration: 0.4, tags: ['clap', 'tight', 'edm'] },
  { name: 'Reverb Clap', category: 'percussion', subcategory: 'clap', fileUrl: '/uploads/samples/clap-reverb.wav', duration: 1.2, tags: ['clap', 'reverb', 'spacious'], isPremium: true },

  // Percussion
  { name: 'Rim Shot', category: 'percussion', subcategory: 'rim', fileUrl: '/uploads/samples/rim-shot.wav', duration: 0.3, tags: ['rim', 'percussion'] },
  { name: 'Tom High', category: 'percussion', subcategory: 'tom', fileUrl: '/uploads/samples/tom-high.wav', duration: 0.8, tags: ['tom', 'high', 'percussion'] },
  { name: 'Tom Low', category: 'percussion', subcategory: 'tom', fileUrl: '/uploads/samples/tom-low.wav', duration: 1.0, tags: ['tom', 'low', 'percussion'] },
  { name: 'Shaker', category: 'percussion', subcategory: 'shaker', fileUrl: '/uploads/samples/shaker.wav', duration: 0.5, tags: ['shaker', 'percussion', 'rhythm'] },
  { name: 'Tambourine', category: 'percussion', subcategory: 'tambourine', fileUrl: '/uploads/samples/tambourine.wav', duration: 0.7, tags: ['tambourine', 'percussion'] }
];

const bassSamples = [
  { name: '808 Bass C', category: 'bass', subcategory: '808', fileUrl: '/uploads/samples/bass-808-c.wav', duration: 2.0, key: 'C', tags: ['bass', '808', 'sub'], isPremium: false },
  { name: 'Sub Bass C', category: 'bass', subcategory: 'sub', fileUrl: '/uploads/samples/bass-sub-c.wav', duration: 2.5, key: 'C', tags: ['bass', 'sub', 'deep'], isPremium: true },
  { name: 'Synth Bass C', category: 'bass', subcategory: 'synth', fileUrl: '/uploads/samples/bass-synth-c.wav', duration: 1.5, key: 'C', tags: ['bass', 'synth', 'edm'] }
];

const synthSamples = [
  { name: 'Pluck C', category: 'synth', subcategory: 'pluck', fileUrl: '/uploads/samples/synth-pluck-c.wav', duration: 1.0, key: 'C', tags: ['synth', 'pluck', 'melodic'] },
  { name: 'Pad C', category: 'synth', subcategory: 'pad', fileUrl: '/uploads/samples/synth-pad-c.wav', duration: 4.0, key: 'C', tags: ['synth', 'pad', 'ambient'], isPremium: true },
  { name: 'Lead C', category: 'synth', subcategory: 'lead', fileUrl: '/uploads/samples/synth-lead-c.wav', duration: 2.0, key: 'C', tags: ['synth', 'lead', 'melody'] }
];

const fxSamples = [
  { name: 'Riser', category: 'fx', subcategory: 'riser', fileUrl: '/uploads/samples/fx-riser.wav', duration: 2.0, tags: ['fx', 'riser', 'transition'] },
  { name: 'Impact', category: 'fx', subcategory: 'impact', fileUrl: '/uploads/samples/fx-impact.wav', duration: 1.0, tags: ['fx', 'impact', 'hit'] },
  { name: 'Sweep Down', category: 'fx', subcategory: 'sweep', fileUrl: '/uploads/samples/fx-sweep-down.wav', duration: 1.5, tags: ['fx', 'sweep', 'transition'], isPremium: true },
  { name: 'White Noise', category: 'fx', subcategory: 'noise', fileUrl: '/uploads/samples/fx-noise.wav', duration: 1.0, tags: ['fx', 'noise', 'texture'] }
];

const loopSamples = [
  { name: 'Drum Loop 120 BPM', category: 'loop', subcategory: 'drum', fileUrl: '/uploads/samples/loop-drum-120.wav', duration: 4.0, bpm: 120, tags: ['loop', 'drum', 'hip-hop'] },
  { name: 'Melody Loop 128 BPM', category: 'loop', subcategory: 'melody', fileUrl: '/uploads/samples/loop-melody-128.wav', duration: 8.0, bpm: 128, key: 'Am', tags: ['loop', 'melody', 'edm'], isPremium: true },
  { name: 'Bass Loop 140 BPM', category: 'loop', subcategory: 'bass', fileUrl: '/uploads/samples/loop-bass-140.wav', duration: 4.0, bpm: 140, key: 'Em', tags: ['loop', 'bass', 'dnb'], isPremium: true }
];

async function seedSamples () {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/creatorsync', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Clear existing samples (optional - comment out if you want to keep existing data)
    // await Sample.deleteMany({});
    // await SamplePack.deleteMany({});
    // console.log('Cleared existing samples');

    // Create sample packs
    const starterPack = await SamplePack.create({
      name: 'Starter Drum Kit',
      description: 'Essential drum sounds to get you started',
      genre: 'hip-hop',
      tags: ['drums', 'starter', 'free'],
      isPublic: true,
      isPremium: false
    });

    const trapPack = await SamplePack.create({
      name: 'Trap Essentials',
      description: 'Hard-hitting trap drums and 808s',
      genre: 'trap',
      tags: ['trap', '808', 'hip-hop'],
      isPublic: true,
      isPremium: false
    });

    const edmPack = await SamplePack.create({
      name: 'EDM Pro Pack',
      description: 'Professional EDM sounds and loops',
      genre: 'edm',
      tags: ['edm', 'house', 'premium'],
      isPublic: true,
      isPremium: true,
      price: 9.99
    });

    console.log('Created sample packs');

    // Insert drum samples
    const drumSamplesWithPack = drumSamples.map(sample => ({
      ...sample,
      packId: sample.isPremium ? edmPack._id : starterPack._id
    }));
    await Sample.insertMany(drumSamplesWithPack);

    // Insert bass samples
    const bassSamplesWithPack = bassSamples.map(sample => ({
      ...sample,
      packId: sample.isPremium ? edmPack._id : trapPack._id
    }));
    await Sample.insertMany(bassSamplesWithPack);

    // Insert synth samples
    const synthSamplesWithPack = synthSamples.map(sample => ({
      ...sample,
      packId: sample.isPremium ? edmPack._id : starterPack._id
    }));
    await Sample.insertMany(synthSamplesWithPack);

    // Insert FX samples
    const fxSamplesWithPack = fxSamples.map(sample => ({
      ...sample,
      packId: sample.isPremium ? edmPack._id : starterPack._id
    }));
    await Sample.insertMany(fxSamplesWithPack);

    // Insert loop samples
    const loopSamplesWithPack = loopSamples.map(sample => ({
      ...sample,
      packId: sample.isPremium ? edmPack._id : trapPack._id
    }));
    await Sample.insertMany(loopSamplesWithPack);

    // Update pack sample counts
    const starterCount = await Sample.countDocuments({ packId: starterPack._id });
    const trapCount = await Sample.countDocuments({ packId: trapPack._id });
    const edmCount = await Sample.countDocuments({ packId: edmPack._id });

    await SamplePack.findByIdAndUpdate(starterPack._id, { sampleCount: starterCount });
    await SamplePack.findByIdAndUpdate(trapPack._id, { sampleCount: trapCount });
    await SamplePack.findByIdAndUpdate(edmPack._id, { sampleCount: edmCount });

    console.log(`✅ Seeded ${drumSamples.length} drum samples`);
    console.log(`✅ Seeded ${bassSamples.length} bass samples`);
    console.log(`✅ Seeded ${synthSamples.length} synth samples`);
    console.log(`✅ Seeded ${fxSamples.length} FX samples`);
    console.log(`✅ Seeded ${loopSamples.length} loop samples`);
    console.log(`✅ Created ${3} sample packs`);
    console.log('Sample database seeded successfully!');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding samples:', error);
    process.exit(1);
  }
}

// Run the seed function
if (require.main === module) {
  seedSamples();
}

module.exports = seedSamples;
