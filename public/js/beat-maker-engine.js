/**
 * Beat Maker Engine - Core audio processing using Tone.js
 * Handles audio context, sample playback, mixing, and timing
 */

class BeatMakerEngine {
  constructor () {
    this.initialized = false;
    this.isPlaying = false;
    this.bpm = 120;
    this.timeSignature = [4, 4];

    // Audio components
    this.players = new Map(); // Sample players
    this.channels = new Map(); // Mixer channels
    this.masterChannel = null;
    this.transport = null;

    // Project state
    this.tracks = [];
    this.patterns = [];
    this.currentPattern = null;
    this.currentStep = 0;

    // Callbacks
    this.onStepCallback = null;
    this.onPlayCallback = null;
    this.onStopCallback = null;
  }

  /**
   * Initialize audio context and Tone.js
   */
  async initialize () {
    if (this.initialized) return;

    try {
      // Don't start audio context yet - wait for user interaction
      // await Tone.start();
      console.log('Audio engine initializing (audio will start on first interaction)');

      // Setup transport
      this.transport = Tone.Transport;
      this.transport.bpm.value = this.bpm;
      this.transport.timeSignature = this.timeSignature;

      // Setup master channel
      this.masterChannel = new Tone.Channel().toDestination();
      this.masterChannel.volume.value = -6; // -6dB default

      // Setup transport callbacks
      this.transport.scheduleRepeat((time) => {
        this.onTransportStep(time);
      }, '16n'); // 16th note resolution

      this.initialized = true;
      console.log('Beat Maker Engine initialized (audio pending user interaction)');
      return true;
    } catch (error) {
      console.error('Failed to initialize audio engine:', error);
      throw error;
    }
  }

  /**
   * Load a sample into the engine
   */
  async loadSample (sampleId, url) {
    try {
      const player = new Tone.Player({
        url,
        onload: () => {
          console.log(`Sample loaded: ${sampleId}`);
        }
      });

      // Create a channel for this sample
      const channel = new Tone.Channel().connect(this.masterChannel);
      player.connect(channel);

      this.players.set(sampleId, player);
      this.channels.set(sampleId, channel);

      return true;
    } catch (error) {
      console.error(`Failed to load sample ${sampleId}:`, error);
      return false;
    }
  }

  /**
   * Create a new track
   */
  createTrack (trackId, name, type = 'audio') {
    const track = {
      id: trackId,
      name,
      type,
      volume: 0.8,
      pan: 0,
      mute: false,
      solo: false,
      patterns: [],
      effects: []
    };

    // Create channel for track with effects chain
    const channel = new Tone.Channel({
      volume: Tone.gainToDb(track.volume),
      pan: track.pan
    }).connect(this.masterChannel);

    this.channels.set(trackId, channel);
    this.tracks.push(track);

    return track;
  }

  /**
   * Add effect to track
   */
  addEffect (trackId, effectType, params = {}) {
    const track = this.getTrack(trackId);
    if (!track) return false;

    const channel = this.channels.get(trackId);
    if (!channel) return false;

    let effect;

    // Create effect based on type
    switch (effectType) {
      case 'eq':
        effect = new Tone.EQ3(params);
        break;
      case 'compressor':
        effect = new Tone.Compressor(params);
        break;
      case 'reverb':
        effect = new Tone.Reverb(params);
        break;
      case 'delay':
        effect = new Tone.FeedbackDelay(params);
        break;
      case 'distortion':
        effect = new Tone.Distortion(params);
        break;
      case 'filter':
        effect = new Tone.Filter(params);
        break;
      case 'chorus':
        effect = new Tone.Chorus(params);
        break;
      case 'phaser':
        effect = new Tone.Phaser(params);
        break;
      case 'tremolo':
        effect = new Tone.Tremolo(params);
        effect.start();
        break;
      case 'autoFilter':
        effect = new Tone.AutoFilter(params);
        effect.start();
        break;
      case 'flanger':
        // Flanger = chorus with short delay and feedback
        effect = new Tone.Chorus({
          frequency: params.baseFrequency || 0.5,
          delayTime: (params.delayTime || 0.005) * 1000,
          depth: params.depth || 0.5,
          wet: params.wet || 0.5
        });
        effect.start();
        break;
      case 'limiter':
        effect = new Tone.Limiter(params.threshold || -3);
        break;
      case 'gate':
        effect = new Tone.Gate({ threshold: params.threshold || -40, smoothing: params.smoothing || 0.1 });
        break;
      case 'bitcrusher':
        effect = new Tone.BitCrusher({ bits: params.bits || 8, wet: params.wet || 1 });
        break;
      case 'stereoWidener':
        effect = new Tone.StereoWidener(params.width || 0.5);
        break;
      case 'pitchShift':
        effect = new Tone.PitchShift({ pitch: params.pitch || 0, wet: params.wet || 1 });
        break;
      default:
        console.warn(`Unknown effect type: ${effectType}`);
        return false;
    }

    // Connect effect to channel
    channel.disconnect();
    channel.connect(effect);
    effect.connect(this.masterChannel);

    // Store effect reference
    const effectData = {
      id: `${trackId}_effect_${track.effects.length}`,
      type: effectType,
      params,
      enabled: true,
      toneEffect: effect
    };

    track.effects.push(effectData);
    return effectData;
  }

  /**
   * Remove effect from track
   */
  removeEffect (trackId, effectId) {
    const track = this.getTrack(trackId);
    if (!track) return false;

    const effectIndex = track.effects.findIndex(e => e.id === effectId);
    if (effectIndex === -1) return false;

    const effect = track.effects[effectIndex];

    // Dispose Tone.js effect
    if (effect.toneEffect) {
      effect.toneEffect.dispose();
    }

    track.effects.splice(effectIndex, 1);

    // Reconnect channel
    this.reconnectChannelEffects(trackId);
    return true;
  }

  /**
   * Update effect parameters
   */
  updateEffect (trackId, effectId, params) {
    const track = this.getTrack(trackId);
    if (!track) return false;

    const effect = track.effects.find(e => e.id === effectId);
    if (!effect || !effect.toneEffect) return false;

    // Update Tone.js effect parameters
    Object.keys(params).forEach(key => {
      if (effect.toneEffect[key] !== undefined) {
        if (typeof effect.toneEffect[key] === 'object' && effect.toneEffect[key].value !== undefined) {
          effect.toneEffect[key].value = params[key];
        } else {
          effect.toneEffect[key] = params[key];
        }
      }
    });

    // Update stored params
    Object.assign(effect.params, params);
    return true;
  }

  /**
   * Toggle effect enabled state
   */
  toggleEffect (trackId, effectId) {
    const track = this.getTrack(trackId);
    if (!track) return false;

    const effect = track.effects.find(e => e.id === effectId);
    if (!effect || !effect.toneEffect) return false;

    effect.enabled = !effect.enabled;
    effect.toneEffect.wet.value = effect.enabled ? 1 : 0;

    return effect.enabled;
  }

  /**
   * Reconnect channel effects chain
   */
  reconnectChannelEffects (trackId) {
    const track = this.getTrack(trackId);
    const channel = this.channels.get(trackId);
    if (!track || !channel) return;

    // Disconnect everything
    channel.disconnect();

    // Reconnect effects in order
    let currentNode = channel;
    for (const effect of track.effects) {
      if (effect.toneEffect) {
        currentNode.connect(effect.toneEffect);
        currentNode = effect.toneEffect;
      }
    }

    // Connect to master
    currentNode.connect(this.masterChannel);
  }

  /**
   * Get track by ID
   */
  getTrack (trackId) {
    return this.tracks.find(t => t.id === trackId);
  }

  /**
   * Update track properties
   */
  updateTrack (trackId, updates) {
    const track = this.getTrack(trackId);
    if (!track) return false;

    const channel = this.channels.get(trackId);
    if (!channel) return false;

    // Update track object
    Object.assign(track, updates);

    // Update channel properties
    if (updates.volume !== undefined) {
      channel.volume.value = Tone.gainToDb(updates.volume);
    }

    if (updates.pan !== undefined) {
      channel.pan.value = updates.pan;
    }

    if (updates.mute !== undefined) {
      channel.mute = updates.mute;
    }

    if (updates.solo !== undefined) {
      channel.solo = updates.solo;
    }

    return true;
  }

  /**
   * Delete a track
   */
  deleteTrack (trackId) {
    const index = this.tracks.findIndex(t => t.id === trackId);
    if (index === -1) return false;

    // Dispose channel
    const channel = this.channels.get(trackId);
    if (channel) {
      channel.dispose();
      this.channels.delete(trackId);
    }

    this.tracks.splice(index, 1);
    return true;
  }

  /**
   * Create a step sequencer pattern
   */
  createPattern (patternId, name, length = 16) {
    const pattern = {
      id: patternId,
      name,
      length,
      steps: [], // 2D array [trackIndex][stepIndex]
      tracks: [] // Array of sample IDs
    };

    this.patterns.push(pattern);
    return pattern;
  }

  /**
   * Toggle a step in the pattern
   */
  toggleStep (patternId, trackIndex, stepIndex) {
    const pattern = this.patterns.find(p => p.id === patternId);
    if (!pattern) return false;

    if (!pattern.steps[trackIndex]) {
      pattern.steps[trackIndex] = new Array(pattern.length).fill(false);
    }

    pattern.steps[trackIndex][stepIndex] = !pattern.steps[trackIndex][stepIndex];
    return pattern.steps[trackIndex][stepIndex];
  }

  /**
   * Set the active pattern
   */
  setActivePattern (patternId) {
    const pattern = this.patterns.find(p => p.id === patternId);
    if (!pattern) return false;

    this.currentPattern = pattern;
    this.currentStep = 0;
    return true;
  }

  /**
   * Play a sample immediately (for preview/testing)
   */
  playSample (sampleId, time = undefined) {
    const player = this.players.get(sampleId);
    if (!player) {
      console.warn(`Sample not loaded: ${sampleId}`);
      return false;
    }

    try {
      if (player.state === 'started') {
        player.stop();
      }
      player.start(time);
      return true;
    } catch (error) {
      console.error(`Failed to play sample ${sampleId}:`, error);
      return false;
    }
  }

  /**
   * Transport step callback - triggers on each 16th note
   */
  onTransportStep (time) {
    if (!this.currentPattern) return;

    const pattern = this.currentPattern;
    const currentStep = this.currentStep % pattern.length;

    // Trigger samples for this step
    pattern.tracks.forEach((sampleId, trackIndex) => {
      if (pattern.steps[trackIndex] && pattern.steps[trackIndex][currentStep]) {
        this.playSample(sampleId, time);
      }
    });

    // Call callback for UI update
    if (this.onStepCallback) {
      // Schedule callback slightly ahead of audio for visual sync
      Tone.Draw.schedule(() => {
        this.onStepCallback(currentStep);
      }, time);
    }

    this.currentStep++;
  }

  /**
   * Start playback
   */
  play () {
    if (!this.initialized) {
      console.error('Engine not initialized');
      return false;
    }

    this.transport.start();
    this.isPlaying = true;

    if (this.onPlayCallback) {
      this.onPlayCallback();
    }

    return true;
  }

  /**
   * Stop playback
   */
  stop () {
    this.transport.stop();
    this.transport.position = 0;
    this.currentStep = 0;
    this.isPlaying = false;

    if (this.onStopCallback) {
      this.onStopCallback();
    }

    return true;
  }

  /**
   * Pause playback
   */
  pause () {
    this.transport.pause();
    this.isPlaying = false;
    return true;
  }

  /**
   * Set BPM
   */
  setBPM (bpm) {
    if (bpm < 40 || bpm > 240) return false;

    this.bpm = bpm;
    this.transport.bpm.value = bpm;
    return true;
  }

  /**
   * Get current BPM
   */
  getBPM () {
    return this.bpm;
  }

  /**
   * Set master volume
   */
  setMasterVolume (volume) {
    if (!this.masterChannel) return false;

    this.masterChannel.volume.value = Tone.gainToDb(volume);
    return true;
  }

  /**
   * Get master volume
   */
  getMasterVolume () {
    if (!this.masterChannel) return 0;

    return Tone.dbToGain(this.masterChannel.volume.value);
  }

  /**
   * Get current playback position
   */
  getPosition () {
    return this.transport.position;
  }

  /**
   * Set callbacks
   */
  setCallbacks ({ onStep, onPlay, onStop }) {
    if (onStep) this.onStepCallback = onStep;
    if (onPlay) this.onPlayCallback = onPlay;
    if (onStop) this.onStopCallback = onStop;
  }

  /**
   * Export project state
   */
  exportState () {
    return {
      bpm: this.bpm,
      timeSignature: this.timeSignature,
      tracks: this.tracks.map(track => ({
        ...track,
        // Don't include functions or Tone.js objects
      })),
      patterns: this.patterns
    };
  }

  /**
   * Import project state
   */
  async importState (state) {
    try {
      this.bpm = state.bpm || 120;
      this.timeSignature = state.timeSignature || [4, 4];
      this.transport.bpm.value = this.bpm;

      // Clear existing state
      this.tracks = [];
      this.patterns = [];

      // Recreate tracks
      for (const trackData of state.tracks || []) {
        this.createTrack(trackData.id, trackData.name, trackData.type);
        this.updateTrack(trackData.id, trackData);
      }

      // Recreate patterns
      this.patterns = state.patterns || [];

      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }

  /**
   * Cleanup and dispose
   */
  dispose () {
    this.stop();

    // Dispose all players
    this.players.forEach(player => player.dispose());
    this.players.clear();

    // Dispose all channels
    this.channels.forEach(channel => channel.dispose());
    this.channels.clear();

    // Dispose master channel
    if (this.masterChannel) {
      this.masterChannel.dispose();
    }

    this.initialized = false;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BeatMakerEngine;
}
