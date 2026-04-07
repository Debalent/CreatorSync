/**
 * BeatForge — Spectrum Analyzer
 * Real-time FFT spectrum, oscilloscope, stereo scope, and peak/RMS meter
 * FL Studio equivalent: Spectrum analyzer + Stereo scope + Peak meter
 */

class BeatMakerAnalyzer {
  constructor (engine) {
    this.engine = engine;

    // Tone.js analyzer nodes
    this.fft = null;
    this.waveform = null;
    this.meter = null;
    this.stereometer = null;

    // Canvas rendering
    this.canvas = null;
    this.ctx = null;
    this.animId = null;
    this.isRunning = false;

    // Display mode
    this.mode = 'spectrum'; // 'spectrum' | 'waveform' | 'scope'

    // Peak hold for spectrum
    this.peakValues = null;
    this.peakDecay = 0.97;

    // Colors matching BeatForge theme
    this.theme = {
      bg: '#0a0a14',
      grid: 'rgba(255,255,255,0.04)',
      gradientLow: '#00b894',
      gradientMid: '#6c5ce7',
      gradientHigh: '#ff006e',
      peak: '#ff006e',
      waveform: '#6c5ce7',
      scope: '#00b894',
      text: 'rgba(255,255,255,0.5)'
    };
  }

  // ─── INITIALIZATION ───────────────────────────────────────────────────────

  initialize () {
    if (this.fft) return this; // already initialized

    try {
      this.fft = new Tone.FFT(2048);
      this.waveform = new Tone.Waveform(2048);
      this.meter = new Tone.Meter({ normalRange: true });

      // Connect to master channel
      const master = this.engine?.masterChannel;
      if (master) {
        master.connect(this.fft);
        master.connect(this.waveform);
        master.connect(this.meter);
      } else {
        // Fallback: connect Tone.Destination
        Tone.Destination.connect(this.fft);
        Tone.Destination.connect(this.waveform);
        Tone.Destination.connect(this.meter);
      }

      // Init peak hold array after first FFT access
      this.peakValues = new Float32Array(512).fill(-140);

      console.log('BeatMakerAnalyzer initialized');
    } catch (err) {
      console.error('BeatMakerAnalyzer init error:', err);
    }

    return this;
  }

  // ─── CANVAS MOUNTING ──────────────────────────────────────────────────────

  mount (canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());
    this.start();
  }

  _resizeCanvas () {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth || 600;
      this.canvas.height = parent.clientHeight || 140;
    }
  }

  start () {
    this.isRunning = true;
    this._drawLoop();
  }

  stop () {
    this.isRunning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId); // eslint-disable-line no-undef
      this.animId = null;
    }
  }

  // ─── DRAW LOOP ────────────────────────────────────────────────────────────

  _drawLoop () {
    if (!this.isRunning || !this.ctx || !this.canvas) return;
    this.animId = requestAnimationFrame(() => this._drawLoop());

    switch (this.mode) {
    case 'spectrum': this._drawSpectrum(); break;
    case 'waveform': this._drawWaveform(); break;
    case 'scope': this._drawScope(); break;
    }

    this._updateMeter();
  }

  // ─── SPECTRUM MODE ────────────────────────────────────────────────────────

  _drawSpectrum () {
    if (!this.fft || !this.ctx) return;

    const canvas = this.canvas;
    const ctx = this.ctx;
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = this.theme.bg;
    ctx.fillRect(0, 0, W, H);

    this._drawGrid(W, H);

    let values;
    try { values = this.fft.getValue(); } catch { return; }

    const numBars = 256;
    const barW = (W / numBars) - 0.5;

    // Gradient for bars
    const grad = ctx.createLinearGradient(0, H, 0, 0);
    grad.addColorStop(0, this.theme.gradientLow);
    grad.addColorStop(0.5, this.theme.gradientMid);
    grad.addColorStop(1, this.theme.gradientHigh);

    for (let i = 0; i < numBars; i++) {
      // Map bar index logarithmically to FFT bins
      const binIndex = Math.floor(Math.pow(i / numBars, 2) * (values.length / 2));
      const db = Math.max(-100, values[binIndex] || -100);
      const normalized = Math.max(0, (db + 100) / 100);
      const barH = normalized * (H - 4);

      const x = i * (barW + 0.5);

      // Bar
      ctx.fillStyle = grad;
      ctx.fillRect(x, H - barH, barW, barH);

      // Peak hold
      const peakDb = Math.max(db, (this.peakValues[i] || -100) * 0.98);
      this.peakValues[i] = peakDb;
      const peakNorm = Math.max(0, (peakDb + 100) / 100);
      const peakY = H - peakNorm * (H - 4) - 2;

      if (peakDb > -90) {
        ctx.fillStyle = this.theme.peak;
        ctx.fillRect(x, peakY, barW, 2);
      }
    }

    // Frequency labels
    this._drawFreqLabels(W, H);
  }

  _drawGrid (W, H) {
    const ctx = this.ctx;
    ctx.strokeStyle = this.theme.grid;
    ctx.lineWidth = 1;

    // Horizontal dB lines
    const dbLines = [-80, -60, -40, -20, -6, 0];
    dbLines.forEach(db => {
      const y = H - Math.max(0, (db + 100) / 100) * (H - 4);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();

      ctx.fillStyle = this.theme.text;
      ctx.font = '10px monospace';
      ctx.fillText(`${db}dB`, 4, y - 3);
    });
  }

  _drawFreqLabels (W, H) {
    const ctx = this.ctx;
    const freqs = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

    freqs.forEach(freq => {
      const x = W * Math.pow(Math.log10(freq / 20) / Math.log10(20000 / 20), 1.0);
      ctx.fillStyle = this.theme.text;
      ctx.font = '9px monospace';
      const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
      ctx.fillText(label, Math.max(0, x - 8), H - 3);
    });
  }

  // ─── WAVEFORM MODE ────────────────────────────────────────────────────────

  _drawWaveform () {
    if (!this.waveform || !this.ctx) return;

    const canvas = this.canvas;
    const ctx = this.ctx;
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = this.theme.bg;
    ctx.fillRect(0, 0, W, H);

    // Center line
    ctx.strokeStyle = this.theme.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    let values;
    try { values = this.waveform.getValue(); } catch { return; }

    ctx.strokeStyle = this.theme.waveform;
    ctx.lineWidth = 2;
    ctx.shadowColor = this.theme.waveform;
    ctx.shadowBlur = 4;
    ctx.beginPath();

    for (let i = 0; i < values.length; i++) {
      const x = (i / values.length) * W;
      const y = ((values[i] + 1) / 2) * H;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ─── SCOPE (LISSAJOUS) MODE ───────────────────────────────────────────────

  _drawScope () {
    if (!this.waveform || !this.ctx) return;

    const canvas = this.canvas;
    const ctx = this.ctx;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    // Fade trail for motion blur effect
    ctx.fillStyle = 'rgba(10, 10, 20, 0.15)';
    ctx.fillRect(0, 0, W, H);

    let values;
    try { values = this.waveform.getValue(); } catch { return; }

    ctx.strokeStyle = this.theme.scope;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = this.theme.scope;
    ctx.shadowBlur = 3;
    ctx.beginPath();

    const step = 2;
    for (let i = 0; i + step < values.length; i++) {
      const x = cx + values[i] * cx * 0.92;
      const y = cy - values[i + step] * cy * 0.92;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
    ctx.shadowBlur = 0;

    // Center crosshair
    ctx.strokeStyle = this.theme.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
    ctx.moveTo(0, cy); ctx.lineTo(W, cy);
    ctx.stroke();
  }

  // ─── LEVEL METER ─────────────────────────────────────────────────────────

  _updateMeter () {
    if (!this.meter) return;

    try {
      const level = this.meter.getValue();
      const normalized = Array.isArray(level)
        ? Math.max(level[0] || 0, level[1] || 0)
        : (level || 0);

      // Update DOM meter bar
      const meterFill = document.getElementById('analyzerMeterFill');
      if (meterFill) {
        const pct = Math.min(100, normalized * 100);
        meterFill.style.width = `${pct}%`;
        meterFill.style.background = pct > 90 ? '#d63031'
          : pct > 70 ? '#fdcb6e'
            : '#00b894';
      }

      // Peak LED
      const peakLed = document.getElementById('analyzerPeakLed');
      if (peakLed) {
        if (normalized >= 1.0) {
          peakLed.classList.add('clipping');
          setTimeout(() => peakLed.classList.remove('clipping'), 500);
        }
      }
    } catch { /* meter may not be ready */ }
  }

  // ─── MODE SWITCHING ───────────────────────────────────────────────────────

  setMode (mode) {
    this.mode = mode;

    // Update mode buttons
    document.querySelectorAll('.analyzer-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Clear canvas on mode switch
    if (this.ctx && this.canvas) {
      this.ctx.fillStyle = this.theme.bg;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // ─── EVENT LISTENERS ─────────────────────────────────────────────────────

  setupListeners () {
    // Mode buttons: .analyzer-mode-btn[data-mode]
    document.querySelectorAll('.analyzer-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });
  }

  // ─── CLEANUP ─────────────────────────────────────────────────────────────

  dispose () {
    this.stop();
    try {
      this.fft?.dispose();
      this.waveform?.dispose();
      this.meter?.dispose();
    } catch { /* ignore */ }
    this.fft = null;
    this.waveform = null;
    this.meter = null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BeatMakerAnalyzer;
}
