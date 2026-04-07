/**
 * BeatForge — Synthesizer Engine
 * Polyphonic subtractive synthesizer — FL Studio 3xOsc / FLEX equivalent
 * Built on Tone.js — 2 oscillators, filter, ADSR, LFO, reverb/delay, 8 presets
 */

class BeatMakerSynth {
  constructor (engine, ui) {
    this.engine = engine;
    this.ui = ui;

    // Synth parameters (defaults = "Lead" preset)
    this.params = {
      osc1: { type: 'sawtooth', detune: 0, volume: 0.8 },
      osc2: { type: 'square', detune: 7, volume: 0.3, enabled: true },
      filter: { type: 'lowpass', frequency: 3000, Q: 1.5 },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.6, release: 0.4 },
      lfo: { type: 'sine', frequency: 2, depth: 0, target: 'filter' },
      reverb: 0.2,
      delay: 0.0
    };

    // Tone.js nodes
    this.synth = null;
    this.filter = null;
    this.reverb = null;
    this.delay = null;
    this.lfo = null;
    this.masterGain = null;

    this.isInitialized = false;
    this.currentPreset = 'Lead';

    // Notes held via mini keyboard
    this.heldNotes = new Set();

    this.presets = this._buildPresets();
  }

  // ─── INITIALIZATION ───────────────────────────────────────────────────────

  initialize () {
    if (this.isInitialized) return this;

    try {
      // Master output → engine master channel
      this.masterGain = new Tone.Gain(0.75);
      if (this.engine && this.engine.masterChannel) {
        this.masterGain.connect(this.engine.masterChannel);
      } else {
        this.masterGain.toDestination();
      }

      // Effects chain
      this.reverb = new Tone.Reverb({ decay: 2.5, wet: this.params.reverb });
      this.delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.35, wet: this.params.delay });

      // Filter
      this.filter = new Tone.Filter({
        type: this.params.filter.type,
        frequency: this.params.filter.frequency,
        Q: this.params.filter.Q
      });

      // Signal chain: synth → filter → reverb → delay → master
      this.filter.connect(this.reverb);
      this.reverb.connect(this.delay);
      this.delay.connect(this.masterGain);

      // LFO targeting filter frequency by default
      this.lfo = new Tone.LFO({
        type: this.params.lfo.type,
        frequency: this.params.lfo.frequency,
        min: 100,
        max: 12000
      });
      this.lfo.amplitude.value = this.params.lfo.depth;
      this.lfo.connect(this.filter.frequency);
      this.lfo.start();

      // Polyphonic synth (voices for osc1 base tone)
      this.synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: this.params.osc1.type },
        envelope: { ...this.params.envelope },
        volume: Tone.gainToDb(this.params.osc1.volume)
      });
      this.synth.set({ detune: this.params.osc1.detune * 100 });
      this.synth.connect(this.filter);

      // Osc2 adds harmonic richness via a second PolySynth
      this.synth2 = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: this.params.osc2.type },
        envelope: { ...this.params.envelope },
        volume: Tone.gainToDb(this.params.osc2.volume)
      });
      this.synth2.set({ detune: this.params.osc2.detune * 100 });
      this.synth2.connect(this.filter);

      this.isInitialized = true;
      console.log('BeatMakerSynth initialized');
    } catch (err) {
      console.error('BeatMakerSynth init error:', err);
    }

    return this;
  }

  // ─── NOTE PLAYBACK ────────────────────────────────────────────────────────

  /** Play a note. note = MIDI number (0-127) or frequency string like "C4" */
  triggerAttack (note, velocity = 0.8) {
    if (!this.isInitialized) this.initialize();
    const freq = this._noteToFreq(note);
    this.synth.triggerAttack(freq, Tone.now(), velocity);
    if (this.params.osc2.enabled) {
      this.synth2.triggerAttack(freq, Tone.now(), velocity * this.params.osc2.volume);
    }
    this.heldNotes.add(note);
  }

  triggerRelease (note) {
    if (!this.isInitialized) return;
    const freq = this._noteToFreq(note);
    this.synth.triggerRelease(freq, Tone.now());
    if (this.params.osc2.enabled) {
      this.synth2.triggerRelease(freq, Tone.now());
    }
    this.heldNotes.delete(note);
  }

  /** One-shot preview note (used from piano roll or step sequencer) */
  triggerAttackRelease (note, duration = '8n', time = undefined, velocity = 0.8) {
    if (!this.isInitialized) this.initialize();
    const freq = this._noteToFreq(note);
    this.synth.triggerAttackRelease(freq, duration, time, velocity);
    if (this.params.osc2.enabled) {
      this.synth2.triggerAttackRelease(freq, duration, time, velocity * this.params.osc2.volume);
    }
  }

  // ─── PARAMETER CONTROL ───────────────────────────────────────────────────

  setParam (group, param, value) {
    if (!this.params[group]) return;
    this.params[group][param] = value;
    if (!this.isInitialized) return;

    switch (group) {
    case 'osc1':
      if (param === 'type') this.synth.set({ oscillator: { type: value } });
      if (param === 'detune') this.synth.set({ detune: value * 100 });
      if (param === 'volume') this.synth.set({ volume: Tone.gainToDb(value) });
      break;
    case 'osc2':
      if (param === 'type') this.synth2.set({ oscillator: { type: value } });
      if (param === 'detune') this.synth2.set({ detune: value * 100 });
      if (param === 'volume') this.synth2.set({ volume: Tone.gainToDb(value) });
      if (param === 'enabled') {
        if (!value) this.synth2.releaseAll();
      }
      break;
    case 'filter':
      if (param === 'frequency') this.filter.frequency.value = value;
      if (param === 'Q') this.filter.Q.value = value;
      if (param === 'type') this.filter.type = value;
      break;
    case 'envelope':
      this.synth.set({ envelope: { [param]: value } });
      this.synth2.set({ envelope: { [param]: value } });
      break;
    case 'lfo':
      if (param === 'frequency') this.lfo.frequency.value = value;
      if (param === 'depth') this.lfo.amplitude.value = value;
      if (param === 'type') this.lfo.type = value;
      if (param === 'target') this._rewireLFO(value);
      break;
    case 'reverb':
      this.reverb.wet.value = value;
      this.params.reverb = value;
      return; // params.reverb is a scalar, not an object
    case 'delay':
      this.delay.wet.value = value;
      this.params.delay = value;
      return;
    }

    this._syncUI();
  }

  // ─── PRESETS ──────────────────────────────────────────────────────────────

  loadPreset (name) {
    const preset = this.presets[name];
    if (!preset) return;
    this.params = JSON.parse(JSON.stringify(preset.params));
    this.currentPreset = name;
    if (this.isInitialized) this._applyAllParams();
    this._syncUI();
    this._syncControls();
  }

  _applyAllParams () {
    this.synth.set({
      oscillator: { type: this.params.osc1.type },
      detune: this.params.osc1.detune * 100,
      envelope: { ...this.params.envelope },
      volume: Tone.gainToDb(this.params.osc1.volume)
    });
    this.synth2.set({
      oscillator: { type: this.params.osc2.type },
      detune: this.params.osc2.detune * 100,
      envelope: { ...this.params.envelope },
      volume: Tone.gainToDb(this.params.osc2.volume)
    });
    this.filter.frequency.value = this.params.filter.frequency;
    this.filter.Q.value = this.params.filter.Q;
    this.filter.type = this.params.filter.type;
    this.reverb.wet.value = this.params.reverb;
    this.delay.wet.value = this.params.delay;
    this.lfo.frequency.value = this.params.lfo.frequency;
    this.lfo.amplitude.value = this.params.lfo.depth;
    this.lfo.type = this.params.lfo.type;
  }

  // ─── LFO ROUTING ─────────────────────────────────────────────────────────

  _rewireLFO (target) {
    if (!this.isInitialized) return;
    this.lfo.disconnect();
    switch (target) {
    case 'filter':
      this.lfo.connect(this.filter.frequency);
      break;
    case 'volume':
      this.lfo.connect(this.masterGain.gain);
      break;
    case 'pitch':
      this.lfo.min = -100;
      this.lfo.max = 100;
      this.lfo.connect(this.synth);
      break;
    }
    this.params.lfo.target = target;
  }

  // ─── UI SYNC ─────────────────────────────────────────────────────────────

  _syncUI () {
    document.querySelectorAll('.synth-preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === this.currentPreset);
    });
  }

  /** Sync HTML controls to match loaded preset */
  _syncControls () {
    const p = this.params;
    this._setControl('synthOsc1Type', p.osc1.type);
    this._setControl('synthOsc1Detune', p.osc1.detune);
    this._setControl('synthOsc1Volume', p.osc1.volume);
    this._setControl('synthOsc2Type', p.osc2.type);
    this._setControl('synthOsc2Detune', p.osc2.detune);
    this._setControl('synthOsc2Volume', p.osc2.volume);
    this._setControl('synthOsc2Enabled', p.osc2.enabled, 'checked');
    this._setControl('synthFilterType', p.filter.type);
    this._setControl('synthFilterFreq', p.filter.frequency);
    this._setControl('synthFilterQ', p.filter.Q);
    this._setControl('synthEnvAttack', p.envelope.attack);
    this._setControl('synthEnvDecay', p.envelope.decay);
    this._setControl('synthEnvSustain', p.envelope.sustain);
    this._setControl('synthEnvRelease', p.envelope.release);
    this._setControl('synthLfoType', p.lfo.type);
    this._setControl('synthLfoRate', p.lfo.frequency);
    this._setControl('synthLfoDepth', p.lfo.depth);
    this._setControl('synthLfoTarget', p.lfo.target);
    this._setControl('synthReverb', p.reverb);
    this._setControl('synthDelay', p.delay);
  }

  _setControl (id, value, prop = 'value') {
    const el = document.getElementById(id);
    if (!el) return;
    el[prop] = value;
    // Update display labels
    const display = document.getElementById(id + 'Val');
    if (display) display.textContent = typeof value === 'number' ? value.toFixed(2) : value;
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────

  _noteToFreq (note) {
    if (typeof note === 'string') return note; // already "C4" etc.
    return Tone.Frequency(note, 'midi').toFrequency();
  }

  // ─── BUILT-IN PRESETS ─────────────────────────────────────────────────────

  _buildPresets () {
    return {
      Lead: {
        icon: '🎸', color: '#ff006e',
        params: { osc1: { type: 'sawtooth', detune: 0, volume: 0.9 }, osc2: { type: 'square', detune: 5, volume: 0.3, enabled: true }, filter: { type: 'lowpass', frequency: 3500, Q: 2 }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.7, release: 0.3 }, lfo: { type: 'sine', frequency: 5, depth: 0.1, target: 'filter' }, reverb: 0.15, delay: 0.1 }
      },
      Pad: {
        icon: '🌊', color: '#6c5ce7',
        params: { osc1: { type: 'sine', detune: 0, volume: 0.7 }, osc2: { type: 'triangle', detune: 12, volume: 0.5, enabled: true }, filter: { type: 'lowpass', frequency: 1200, Q: 0.5 }, envelope: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 1.5 }, lfo: { type: 'sine', frequency: 0.5, depth: 0.3, target: 'filter' }, reverb: 0.6, delay: 0.2 }
      },
      Bass: {
        icon: '🔉', color: '#00b894',
        params: { osc1: { type: 'square', detune: 0, volume: 1.0 }, osc2: { type: 'sawtooth', detune: 0, volume: 0.5, enabled: true }, filter: { type: 'lowpass', frequency: 700, Q: 3 }, envelope: { attack: 0.005, decay: 0.3, sustain: 0.6, release: 0.2 }, lfo: { type: 'sine', frequency: 0, depth: 0, target: 'filter' }, reverb: 0.05, delay: 0 }
      },
      '808': {
        icon: '💣', color: '#d63031',
        params: { osc1: { type: 'sine', detune: 0, volume: 1.0 }, osc2: { type: 'sine', detune: 0, volume: 0.0, enabled: false }, filter: { type: 'lowpass', frequency: 400, Q: 1 }, envelope: { attack: 0.001, decay: 1.2, sustain: 0.3, release: 1.0 }, lfo: { type: 'sine', frequency: 0, depth: 0, target: 'filter' }, reverb: 0.0, delay: 0 }
      },
      Pluck: {
        icon: '🎻', color: '#fdcb6e',
        params: { osc1: { type: 'triangle', detune: 0, volume: 1.0 }, osc2: { type: 'sawtooth', detune: 3, volume: 0.2, enabled: true }, filter: { type: 'lowpass', frequency: 5000, Q: 1 }, envelope: { attack: 0.001, decay: 0.4, sustain: 0.0, release: 0.5 }, lfo: { type: 'sine', frequency: 0, depth: 0, target: 'filter' }, reverb: 0.25, delay: 0.15 }
      },
      Keys: {
        icon: '🎹', color: '#a29bfe',
        params: { osc1: { type: 'triangle', detune: 0, volume: 0.8 }, osc2: { type: 'square', detune: 0, volume: 0.2, enabled: true }, filter: { type: 'lowpass', frequency: 4000, Q: 1 }, envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 0.8 }, lfo: { type: 'sine', frequency: 0, depth: 0, target: 'filter' }, reverb: 0.3, delay: 0.05 }
      },
      Brass: {
        icon: '🎺', color: '#e17055',
        params: { osc1: { type: 'sawtooth', detune: 0, volume: 0.9 }, osc2: { type: 'square', detune: 2, volume: 0.5, enabled: true }, filter: { type: 'bandpass', frequency: 2000, Q: 2 }, envelope: { attack: 0.05, decay: 0.2, sustain: 0.8, release: 0.4 }, lfo: { type: 'sine', frequency: 5, depth: 0.05, target: 'filter' }, reverb: 0.2, delay: 0 }
      },
      Bell: {
        icon: '🔔', color: '#74b9ff',
        params: { osc1: { type: 'sine', detune: 0, volume: 0.8 }, osc2: { type: 'sine', detune: 1200, volume: 0.4, enabled: true }, filter: { type: 'highpass', frequency: 500, Q: 0.5 }, envelope: { attack: 0.001, decay: 2.0, sustain: 0.0, release: 2.0 }, lfo: { type: 'sine', frequency: 0, depth: 0, target: 'filter' }, reverb: 0.4, delay: 0.2 }
      }
    };
  }

  // ─── EVENT LISTENERS ─────────────────────────────────────────────────────

  setupListeners () {
    // Map of [elementId, group, param, valueProp]
    const map = [
      ['synthOsc1Type', 'osc1', 'type', 'value'],
      ['synthOsc1Detune', 'osc1', 'detune', 'valueAsNumber'],
      ['synthOsc1Volume', 'osc1', 'volume', 'valueAsNumber'],
      ['synthOsc2Enabled', 'osc2', 'enabled', 'checked'],
      ['synthOsc2Type', 'osc2', 'type', 'value'],
      ['synthOsc2Detune', 'osc2', 'detune', 'valueAsNumber'],
      ['synthOsc2Volume', 'osc2', 'volume', 'valueAsNumber'],
      ['synthFilterType', 'filter', 'type', 'value'],
      ['synthFilterFreq', 'filter', 'frequency', 'valueAsNumber'],
      ['synthFilterQ', 'filter', 'Q', 'valueAsNumber'],
      ['synthEnvAttack', 'envelope', 'attack', 'valueAsNumber'],
      ['synthEnvDecay', 'envelope', 'decay', 'valueAsNumber'],
      ['synthEnvSustain', 'envelope', 'sustain', 'valueAsNumber'],
      ['synthEnvRelease', 'envelope', 'release', 'valueAsNumber'],
      ['synthLfoType', 'lfo', 'type', 'value'],
      ['synthLfoRate', 'lfo', 'frequency', 'valueAsNumber'],
      ['synthLfoDepth', 'lfo', 'depth', 'valueAsNumber'],
      ['synthLfoTarget', 'lfo', 'target', 'value'],
      ['synthReverb', 'reverb', 'wet', 'valueAsNumber'],
      ['synthDelay', 'delay', 'wet', 'valueAsNumber']
    ];

    map.forEach(([id, group, param, prop]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        const value = el[prop];
        this.setParam(group, param, value);
        const display = document.getElementById(id + 'Val');
        if (display) display.textContent = typeof value === 'number' ? value.toFixed(2) : value;
      });
    });

    // Preset button clicks
    document.querySelectorAll('.synth-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => this.loadPreset(btn.dataset.preset));
    });
  }

  // ─── MINI KEYBOARD ───────────────────────────────────────────────────────

  mountKeyboard (containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const isBlack = [false, true, false, true, false, false, true, false, true, false, true, false];
    const WHITE_W = 28;
    const WHITE_H = 68;
    const BLACK_W = 18;
    const BLACK_H = 42;

    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.height = WHITE_H + 'px';

    // Build note list C3(48) to B4(71)
    const notes = [];
    for (let midi = 48; midi <= 71; midi++) {
      const mod = midi % 12;
      notes.push({ midi, name: noteNames[mod], octave: Math.floor(midi / 12) - 1, black: isBlack[mod] });
    }

    // First pass: assign x position to white keys
    let wx = 0;
    const whitePosMap = {};
    notes.forEach(n => {
      if (!n.black) {
        whitePosMap[n.midi] = wx * WHITE_W;
        wx++;
      }
    });
    const totalWidth = wx * WHITE_W;
    container.style.width = totalWidth + 'px';

    // Render white keys
    notes.forEach(n => {
      if (n.black) return;
      const key = document.createElement('div');
      key.className = 'mk-key mk-white';
      key.dataset.note = n.midi;
      key.title = `${n.name}${n.octave} (${n.midi})`;
      key.style.cssText = `left:${whitePosMap[n.midi]}px;width:${WHITE_W - 1}px;height:${WHITE_H}px;`;
      container.appendChild(key);
    });

    // Render black keys (on top)
    notes.forEach(n => {
      if (!n.black) return;
      // Find the lower adjacent white key's position
      const prevWhite = notes.find(k => !k.black && k.midi < n.midi && n.midi - k.midi <= 2);
      if (!prevWhite) return;
      const leftPx = whitePosMap[prevWhite.midi] + WHITE_W - Math.round(BLACK_W / 2);
      const key = document.createElement('div');
      key.className = 'mk-key mk-black';
      key.dataset.note = n.midi;
      key.title = `${n.name}${n.octave} (${n.midi})`;
      key.style.cssText = `left:${leftPx}px;width:${BLACK_W}px;height:${BLACK_H}px;`;
      container.appendChild(key);
    });

    // Event listeners for all keys
    container.querySelectorAll('.mk-key').forEach(key => {
      const midi = parseInt(key.dataset.note);
      const onStart = (e) => {
        e.preventDefault();
        key.classList.add('mk-active');
        this.triggerAttack(midi, 0.8);
      };
      const onEnd = () => {
        key.classList.remove('mk-active');
        this.triggerRelease(midi);
      };
      key.addEventListener('mousedown', onStart);
      key.addEventListener('mouseup', onEnd);
      key.addEventListener('mouseleave', () => {
        if (key.classList.contains('mk-active')) onEnd();
      });
      key.addEventListener('touchstart', onStart, { passive: false });
      key.addEventListener('touchend', onEnd);
    });
  }

  dispose () {
    this.synth?.dispose();
    this.synth2?.dispose();
    this.filter?.dispose();
    this.reverb?.dispose();
    this.delay?.dispose();
    this.lfo?.dispose();
    this.masterGain?.dispose();
    this.isInitialized = false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BeatMakerSynth;
}
