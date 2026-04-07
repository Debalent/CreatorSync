const mongoose = require('mongoose');

/**
 * Sample Pack Schema - Collections of samples
 */
const samplePackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 1000
  },
  coverImage: String,
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Organization
  genre: {
    type: String,
    enum: ['hip-hop', 'trap', 'edm', 'house', 'techno', 'dubstep', 'drum-and-bass', 'pop', 'rock', 'jazz', 'other']
  },
  tags: [String],
  // Samples in this pack (populated from Sample model)
  sampleCount: {
    type: Number,
    default: 0
  },
  // Access
  isPublic: {
    type: Boolean,
    default: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    default: 0
  },
  // Stats
  downloads: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
samplePackSchema.index({ genre: 1, isPremium: 1 });
samplePackSchema.index({ creator: 1 });
samplePackSchema.index({ isPublic: 1, createdAt: -1 });

module.exports = mongoose.model('SamplePack', samplePackSchema);
