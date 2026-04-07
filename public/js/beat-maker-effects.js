/**
 * Effects Manager - UI for managing audio effects
 */

class EffectsManager {
  constructor (engine, uiController) {
    this.engine = engine;
    this.ui = uiController;
    this.currentTrackId = null;
    this.effectsRack = document.getElementById('effectsRack');

    this.initializeEffectTypes();
    this.attachEventListeners();
  }

  /**
   * Define available effect types with default parameters
   */
  initializeEffectTypes () {
    this.effectTypes = {
      eq: {
        name: 'EQ Three Band',
        icon: 'sliders-h',
        params: {
          low: { name: 'Low', min: -20, max: 20, default: 0, unit: 'dB' },
          mid: { name: 'Mid', min: -20, max: 20, default: 0, unit: 'dB' },
          high: { name: 'High', min: -20, max: 20, default: 0, unit: 'dB' }
        }
      },
      compressor: {
        name: 'Compressor',
        icon: 'compress',
        params: {
          threshold: { name: 'Threshold', min: -60, max: 0, default: -24, unit: 'dB' },
          ratio: { name: 'Ratio', min: 1, max: 20, default: 4, unit: ':1' },
          attack: { name: 'Attack', min: 0, max: 1, default: 0.003, unit: 's' },
          release: { name: 'Release', min: 0, max: 1, default: 0.25, unit: 's' }
        }
      },
      reverb: {
        name: 'Reverb',
        icon: 'water',
        params: {
          decay: { name: 'Decay', min: 0.1, max: 10, default: 1.5, unit: 's' },
          preDelay: { name: 'Pre-Delay', min: 0, max: 0.5, default: 0.01, unit: 's' },
          wet: { name: 'Wet', min: 0, max: 1, default: 0.3, unit: '' }
        }
      },
      delay: {
        name: 'Delay',
        icon: 'sync',
        params: {
          delayTime: { name: 'Time', min: 0, max: 1, default: 0.25, unit: 's' },
          feedback: { name: 'Feedback', min: 0, max: 0.9, default: 0.5, unit: '' },
          wet: { name: 'Wet', min: 0, max: 1, default: 0.3, unit: '' }
        }
      },
      distortion: {
        name: 'Distortion',
        icon: 'wave-square',
        params: {
          distortion: { name: 'Drive', min: 0, max: 1, default: 0.4, unit: '' },
          wet: { name: 'Wet', min: 0, max: 1, default: 1, unit: '' }
        }
      },
      filter: {
        name: 'Filter',
        icon: 'filter',
        params: {
          frequency: { name: 'Frequency', min: 20, max: 20000, default: 1000, unit: 'Hz' },
          Q: { name: 'Resonance', min: 0.1, max: 30, default: 1, unit: '' },
          type: { name: 'Type', options: ['lowpass', 'highpass', 'bandpass'], default: 'lowpass' }
        }
      },
      chorus: {
        name: 'Chorus',
        icon: 'layer-group',
        params: {
          frequency: { name: 'Rate', min: 0.1, max: 10, default: 1.5, unit: 'Hz' },
          depth: { name: 'Depth', min: 0, max: 1, default: 0.7, unit: '' },
          wet: { name: 'Wet', min: 0, max: 1, default: 0.5, unit: '' }
        }
      },
      phaser: {
        name: 'Phaser',
        icon: 'circle-notch',
        params: {
          frequency: { name: 'Rate', min: 0.1, max: 10, default: 0.5, unit: 'Hz' },
          octaves: { name: 'Octaves', min: 1, max: 8, default: 3, unit: '' },
          wet: { name: 'Wet', min: 0, max: 1, default: 0.5, unit: '' }
        }
      },
      flanger: {
        name: 'Flanger',
        icon: 'wave-sine',
        params: {
          delayTime: { name: 'Delay', min: 0.001, max: 0.02, default: 0.005, unit: 's' },
          depth: { name: 'Depth', min: 0, max: 1, default: 0.5, unit: '' },
          baseFrequency: { name: 'Rate', min: 0.1, max: 10, default: 0.5, unit: 'Hz' },
          wet: { name: 'Wet', min: 0, max: 1, default: 0.5, unit: '' }
        }
      },
      limiter: {
        name: 'Limiter',
        icon: 'compress-arrows-alt',
        params: {
          threshold: { name: 'Threshold', min: -60, max: 0, default: -3, unit: 'dB' }
        }
      },
      gate: {
        name: 'Noise Gate',
        icon: 'door-closed',
        params: {
          threshold: { name: 'Threshold', min: -100, max: 0, default: -40, unit: 'dB' },
          smoothing: { name: 'Smoothing', min: 0, max: 1, default: 0.1, unit: '' }
        }
      },
      bitcrusher: {
        name: 'Bitcrusher',
        icon: 'microchip',
        params: {
          bits: { name: 'Bit Depth', min: 1, max: 16, default: 8, unit: 'bit' },
          wet: { name: 'Wet', min: 0, max: 1, default: 1, unit: '' }
        }
      },
      stereoWidener: {
        name: 'Stereo Widener',
        icon: 'arrows-alt-h',
        params: {
          width: { name: 'Width', min: 0, max: 1, default: 0.5, unit: '' }
        }
      },
      pitchShift: {
        name: 'Pitch Shift',
        icon: 'arrows-alt-v',
        params: {
          pitch: { name: 'Semitones', min: -12, max: 12, default: 0, unit: 'st' },
          wet: { name: 'Wet', min: 0, max: 1, default: 1, unit: '' }
        }
      },
      tremolo: {
        name: 'Tremolo',
        icon: 'chart-line',
        params: {
          frequency: { name: 'Rate', min: 0.1, max: 20, default: 4, unit: 'Hz' },
          depth: { name: 'Depth', min: 0, max: 1, default: 0.5, unit: '' },
          wet: { name: 'Wet', min: 0, max: 1, default: 1, unit: '' }
        }
      }
    };
  }

  /**
   * Attach event listeners
   */
  attachEventListeners () {
    // Add effect button
    const btnAddEffect = document.querySelector('.btn-add-effect');
    if (btnAddEffect) {
      btnAddEffect.addEventListener('click', () => this.showEffectSelector());
    }
  }

  /**
   * Set the current track for effects editing
   */
  setCurrentTrack (trackId) {
    this.currentTrackId = trackId;
    this.renderEffects();
  }

  /**
   * Show effect selector modal
   */
  showEffectSelector () {
    if (!this.currentTrackId) {
      alert('Please select a track first');
      return;
    }

    const effectTypes = Object.keys(this.effectTypes);
    const html = `
      <div class="effect-selector-grid">
        ${effectTypes.map(type => {
          const effect = this.effectTypes[type];
          return `
            <button class="effect-selector-btn" data-effect-type="${type}">
              <i class="fas fa-${effect.icon}"></i>
              <span>${effect.name}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;

    // Create temporary modal
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Add Effect</h2>
          <button class="btn-close" onclick="this.closest('.modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          ${html}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add click listeners
    modal.querySelectorAll('.effect-selector-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const effectType = btn.dataset.effectType;
        this.addEffect(effectType);
        modal.remove();
      });
    });
  }

  /**
   * Add effect to current track
   */
  addEffect (effectType) {
    if (!this.currentTrackId) return;

    const effectConfig = this.effectTypes[effectType];
    if (!effectConfig) return;

    // Get default parameters
    const defaultParams = {};
    Object.keys(effectConfig.params).forEach(key => {
      defaultParams[key] = effectConfig.params[key].default;
    });

    // Add effect to engine
    const effect = this.engine.addEffect(this.currentTrackId, effectType, defaultParams);

    if (effect) {
      this.renderEffects();
    }
  }

  /**
   * Render effects for current track
   */
  renderEffects () {
    if (!this.effectsRack) return;

    if (!this.currentTrackId) {
      this.effectsRack.innerHTML = `
        <div class="placeholder">Select a track to add effects</div>
      `;
      return;
    }

    const track = this.engine.getTrack(this.currentTrackId);
    if (!track || track.effects.length === 0) {
      this.effectsRack.innerHTML = `
        <button class="btn-add-effect">
          <i class="fas fa-plus"></i> Add Effect
        </button>
      `;
      this.attachEventListeners();
      return;
    }

    const effectsHtml = track.effects.map(effect => this.renderEffectCard(effect)).join('');

    this.effectsRack.innerHTML = `
      ${effectsHtml}
      <button class="btn-add-effect">
        <i class="fas fa-plus"></i> Add Effect
      </button>
    `;

    this.attachEventListeners();
    this.attachEffectControls();
  }

  /**
   * Render individual effect card
   */
  renderEffectCard (effect) {
    const effectConfig = this.effectTypes[effect.type];
    if (!effectConfig) return '';

    const controlsHtml = Object.keys(effectConfig.params).map(paramKey => {
      const param = effectConfig.params[paramKey];
      const value = effect.params[paramKey] || param.default;

      if (param.options) {
        // Dropdown for options
        return `
          <div class="effect-param">
            <label>${param.name}</label>
            <select class="effect-control" data-effect-id="${effect.id}" data-param="${paramKey}">
              ${param.options.map(opt => `
                <option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>
              `).join('')}
            </select>
          </div>
        `;
      } else {
        // Slider for numeric values
        return `
          <div class="effect-param">
            <label>${param.name}</label>
            <div class="param-control-group">
              <input type="range"
                     class="effect-control"
                     data-effect-id="${effect.id}"
                     data-param="${paramKey}"
                     min="${param.min}"
                     max="${param.max}"
                     step="${(param.max - param.min) / 100}"
                     value="${value}">
              <span class="param-value">${value.toFixed(2)}${param.unit}</span>
            </div>
          </div>
        `;
      }
    }).join('');

    return `
      <div class="effect-card" data-effect-id="${effect.id}">
        <div class="effect-header">
          <div class="effect-title">
            <i class="fas fa-${effectConfig.icon}"></i>
            <span>${effectConfig.name}</span>
          </div>
          <div class="effect-actions">
            <button class="btn-icon btn-effect-toggle ${effect.enabled ? 'active' : ''}"
                    data-effect-id="${effect.id}"
                    title="Toggle">
              <i class="fas fa-power-off"></i>
            </button>
            <button class="btn-icon btn-effect-remove"
                    data-effect-id="${effect.id}"
                    title="Remove">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="effect-controls">
          ${controlsHtml}
        </div>
      </div>
    `;
  }

  /**
   * Attach effect control event listeners
   */
  attachEffectControls () {
    // Parameter controls
    document.querySelectorAll('.effect-control').forEach(control => {
      control.addEventListener('input', (e) => {
        const effectId = e.target.dataset.effectId;
        const param = e.target.dataset.param;
        const value = parseFloat(e.target.value);

        // Update engine
        this.engine.updateEffect(this.currentTrackId, effectId, { [param]: value });

        // Update display
        const valueDisplay = e.target.closest('.param-control-group')?.querySelector('.param-value');
        if (valueDisplay) {
          const effectConfig = this.effectTypes[this.getEffectType(effectId)];
          const unit = effectConfig?.params[param]?.unit || '';
          valueDisplay.textContent = `${value.toFixed(2)}${unit}`;
        }
      });
    });

    // Toggle buttons
    document.querySelectorAll('.btn-effect-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const effectId = btn.dataset.effectId;
        const enabled = this.engine.toggleEffect(this.currentTrackId, effectId);
        btn.classList.toggle('active', enabled);
      });
    });

    // Remove buttons
    document.querySelectorAll('.btn-effect-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const effectId = btn.dataset.effectId;
        if (confirm('Remove this effect?')) {
          this.engine.removeEffect(this.currentTrackId, effectId);
          this.renderEffects();
        }
      });
    });
  }

  /**
   * Get effect type from effect ID
   */
  getEffectType (effectId) {
    if (!this.currentTrackId) return null;
    const track = this.engine.getTrack(this.currentTrackId);
    const effect = track?.effects.find(e => e.id === effectId);
    return effect?.type;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EffectsManager;
}
