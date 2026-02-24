const mongoose = require('mongoose');

const beatSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 1000
  },
  producer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 29.99
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  audioFile: {
    type: String,
    required: true
  },
  artwork: {
    type: String
  },
  bpm: {
    type: Number,
    min: 60,
    max: 200
  },
  key: {
    type: String
  },
  genre: {
    type: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  duration: {
    type: Number
  },
  waveform: {
    type: [Number]
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  plays: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  exclusiveRights: {
    sold: {
      type: Boolean,
      default: false
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    soldAt: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
beatSchema.index({ producer: 1, createdAt: -1 });
beatSchema.index({ genre: 1 });
beatSchema.index({ tags: 1 });
beatSchema.index({ bpm: 1 });
beatSchema.index({ price: 1 });
beatSchema.index({ plays: -1 });

module.exports = mongoose.model('Beat', beatSchema);
