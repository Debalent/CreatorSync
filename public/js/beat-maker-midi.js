/**
 * Beat Maker - MIDI Support
 * MIDI input/output and controller mapping using Web MIDI API
 */

class BeatMakerMIDI {
  constructor (engine, ui) {
    this.engine = engine;
    this.ui = ui;
    this.midiAccess = null;
    this.inputs = [];
    this.outputs = [];
    this.mappings = new Map();
    this.learnMode = false;
    this.learnTarget = null;

    this.initialize();
  }

  async initialize () {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not supported');  
      return;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      this.scanDevices();
      this.attachEventListeners();
    } catch (error) {
      console.error('MIDI initialization failed:', error);  
    }
  }

  scanDevices () {
    if (!this.midiAccess) return;

    this.inputs = Array.from(this.midiAccess.inputs.values());
    this.outputs = Array.from(this.midiAccess.outputs.values());

    // Attach listeners to inputs
    this.inputs.forEach(input => {
      input.onmidimessage = (e) => this.handleMIDIMessage(e);
    });

    this.renderDevices();
  }

  attachEventListeners () {
    document.getElementById('midiLearnBtn')?.addEventListener('click', () => {
      this.toggleLearnMode();
    });
  }

  handleMIDIMessage (event) {
    const [status, data1, data2] = event.data;
    const command = status >> 4;
    const channel = status & 0x0F;

    if (this.learnMode) {
      this.learnMapping(command, data1, channel);
      return;
    }

    switch (command) {
    case 9: // Note on
      this.handleNoteOn(data1, data2, channel);
      break;
    case 8: // Note off
      this.handleNoteOff(data1, channel);
      break;
    case 11: // Control change
      this.handleControlChange(data1, data2, channel);
      break;
    }
  }

  handleNoteOn (note, velocity, channel) {
    // Trigger note in piano roll or step sequencer
    const frequency = 440 * Math.pow(2, (note - 69) / 12);
    const synth = new Tone.Synth().toDestination();  
    synth.triggerAttackRelease(frequency, '8n', undefined, velocity / 127);
  }

  handleNoteOff (note, _channel) {
    // Stop note
  }

  handleControlChange (controller, value, channel) {
    const mappingKey = `cc_${controller}_${channel}`;
    const mapping = this.mappings.get(mappingKey);

    if (mapping) {
      this.applyMapping(mapping, value / 127);
    }
  }

  toggleLearnMode () {
    this.learnMode = !this.learnMode;
    const btn = document.getElementById('midiLearnBtn');

    if (this.learnMode) {
      btn?.classList.add('active');
      btn.innerHTML = '<i class="fas fa-magic"></i> Learning... (move a control)';
    } else {
      btn?.classList.remove('active');
      btn.innerHTML = '<i class="fas fa-magic"></i> MIDI Learn Mode';
    }
  }

  learnMapping (command, data1, channel) {
    if (command === 11) { // Control change
      const parameter = prompt('Enter parameter to map (e.g., volume, pan):');
      if (parameter) {
        const mappingKey = `cc_${data1}_${channel}`;
        this.mappings.set(mappingKey, {
          controller: data1,
          channel,
          parameter
        });
        this.renderMappings();
      }
    }
    this.toggleLearnMode();
  }

  applyMapping (mapping, normalizedValue) {
    // Apply the mapped value to the engine parameter
    console.log(`Applying ${mapping.parameter}: ${normalizedValue}`);  
  }

  renderDevices () {
    const inputsContainer = document.getElementById('midiInputs');
    const outputsContainer = document.getElementById('midiOutputs');

    if (inputsContainer) {
      if (this.inputs.length === 0) {
        inputsContainer.innerHTML = '<p class="text-muted">No MIDI input devices detected</p>';
      } else {
        inputsContainer.innerHTML = this.inputs.map(input => `
          <div class="device-item connected">
            <span>${input.name}</span>
            <i class="fas fa-check text-success"></i>
          </div>
        `).join('');
      }
    }

    if (outputsContainer) {
      if (this.outputs.length === 0) {
        outputsContainer.innerHTML = '<p class="text-muted">No MIDI output devices detected</p>';
      } else {
        outputsContainer.innerHTML = this.outputs.map(output => `
          <div class="device-item connected">
            <span>${output.name}</span>
            <i class="fas fa-check text-success"></i>
          </div>
        `).join('');
      }
    }
  }

  renderMappings () {
    const container = document.getElementById('midiMappings');
    if (!container) return;

    if (this.mappings.size === 0) {
      container.innerHTML = '<p class="text-muted">No mappings configured</p>';
      return;
    }

    container.innerHTML = Array.from(this.mappings.entries()).map(([key, mapping]) => `
      <div class="mapping-item">
        <div class="mapping-info">
          <div class="mapping-label">CC ${mapping.controller} (Ch ${mapping.channel + 1})</div>
          <div class="mapping-value">${mapping.parameter}</div>
        </div>
        <button class="btn-icon" onclick="beatMakerMIDI.removeMapping('${key}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
  }

  removeMapping (key) {
    this.mappings.delete(key);
    this.renderMappings();
  }

  open () {
    this.ui.showModal('midiModal');
    this.scanDevices();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BeatMakerMIDI;
}
