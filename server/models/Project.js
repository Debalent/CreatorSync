const mongoose = require('mongoose');

/**
 * Project Schema - Stores beat maker projects
 * Free users can create but must subscribe to save/share/export
 */
const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  bpm: {
    type: Number,
    default: 120,
    min: 40,
    max: 240
  },
  timeSignature: {
    numerator: { type: Number, default: 4 },
    denominator: { type: Number, default: 4 }
  },
  // Project state stored as JSON for flexibility
  tracks: [{
    id: String,
    name: String,
    type: { type: String, enum: ['audio', 'instrument', 'midi'], default: 'audio' },
    volume: { type: Number, default: 0.8 },
    pan: { type: Number, default: 0 },
    mute: { type: Boolean, default: false },
    solo: { type: Boolean, default: false },
    color: String,
    // Audio samples or MIDI data
    patterns: [{
      id: String,
      startTime: Number,
      duration: Number,
      sampleId: String,
      sampleUrl: String,
      notes: Array // MIDI notes for instrument tracks
    }],
    // Effects chain
    effects: [{
      type: { type: String, enum: ['eq', 'compressor', 'reverb', 'delay', 'distortion', 'filter'] },
      params: mongoose.Schema.Types.Mixed,
      enabled: { type: Boolean, default: true }
    }]
  }],
  // Step sequencer patterns (for drum machine style)
  patterns: [{
    id: String,
    name: String,
    length: { type: Number, default: 16 }, // 16 steps
    steps: [[Boolean]], // 2D array: tracks x steps
    tracks: [String] // sample IDs for each track
  }],
  // Automation data
  automation: [{
    trackId: String,
    parameter: String,
    points: [{
      time: Number,
      value: Number
    }]
  }],
  // Master channel settings
  master: {
    volume: { type: Number, default: 0.8 },
    effects: [{
      type: String,
      params: mongoose.Schema.Types.Mixed,
      enabled: { type: Boolean, default: true }
    }]
  },
  // Metadata
  duration: { type: Number, default: 0 }, // in seconds
  tags: [String],
  genre: String,
  isPublic: { type: Boolean, default: false },
  collaborators: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permissions: { type: String, enum: ['view', 'edit'], default: 'view' }
  }],
  // Version control
  version: { type: Number, default: 1 },
  parentVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  // Export tracking
  exports: [{
    format: { type: String, enum: ['wav', 'mp3', 'flac'] },
    exportedAt: Date,
    fileUrl: String
  }]
}, {
  timestamps: true
});

// Indexes for performance
projectSchema.index({ creator: 1, createdAt: -1 });
projectSchema.index({ isPublic: 1, createdAt: -1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ genre: 1 });

// Virtual for checking if user can save
projectSchema.methods.canSave = function (user) {
  // Must be creator and have active subscription
  return this.creator.toString() === user._id.toString() &&
         (user.subscription === 'premium' || user.subscription === 'professional');
};

// Virtual for checking export permission
projectSchema.methods.canExport = function (user) {
  return this.canSave(user);
};

module.exports = mongoose.model('Project', projectSchema);
