const mongoose = require('mongoose');

/**
 * Sample Schema - Audio samples for the beat maker
 * Includes drums, instruments, loops, etc.
 */
const sampleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  // Sample metadata
  category: {
    type: String,
    required: true,
    enum: ['drum', 'bass', 'synth', 'vocal', 'fx', 'loop', 'instrument', 'percussion'],
    index: true
  },
  subcategory: {
    type: String // kick, snare, hi-hat, etc.
  },
  // Audio file info
  fileUrl: {
    type: String,
    required: true
  },
  waveformData: [Number], // Pre-computed waveform for visualization
  duration: {
    type: Number,
    required: true // in seconds
  },
  bpm: Number, // Original BPM if loop
  key: String, // Musical key
  // Audio analysis
  metadata: {
    sampleRate: Number,
    bitDepth: Number,
    channels: Number,
    format: String
  },
  // Organization
  tags: {
    type: [String],
    index: true
  },
  packId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SamplePack'
  },
  // Access control
  isPublic: {
    type: Boolean,
    default: true
  },
  isPremium: {
    type: Boolean,
    default: false // Premium samples require subscription
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Usage stats
  downloads: {
    type: Number,
    default: 0
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
sampleSchema.index({ category: 1, isPremium: 1 });
sampleSchema.index({ tags: 1 });
sampleSchema.index({ isPublic: 1, createdAt: -1 });
sampleSchema.index({ packId: 1 });

module.exports = mongoose.model('Sample', sampleSchema);
