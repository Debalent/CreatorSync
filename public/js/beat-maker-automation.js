/**
 * Beat Maker - Automation
 * Parameter automation recording and playback
 */

class BeatMakerAutomation {
  constructor (engine, ui) {
    this.engine = engine;
    this.ui = ui;
    this.automationData = [];
    this.isRecording = false;
    this.currentParameter = null;
    this.recordingStartTime = 0;

    this.attachEventListeners();
  }

  open () {
    this.ui.showModal('automationModal');
    this.render();
  }

  attachEventListeners () {
    document.getElementById('automationParameter')?.addEventListener('change', (e) => {
      this.currentParameter = e.target.value;
      this.loadAutomation();
    });

    document.getElementById('automationRecord')?.addEventListener('click', () => {
      this.toggleRecording();
    });

    document.getElementById('automationClear')?.addEventListener('click', () => {
      this.clearAutomation();
    });

    const lane = document.getElementById('automationLane');
    if (lane) {
      lane.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    }
  }

  toggleRecording () {
    this.isRecording = !this.isRecording;
    const btn = document.getElementById('automationRecord');

    if (this.isRecording) {
      btn?.classList.add('recording');
      this.recordingStartTime = this.engine.transport?.seconds || 0;
      this.startRecording();
    } else {
      btn?.classList.remove('recording');
      this.stopRecording();
    }
  }

  startRecording () {
    if (!this.currentParameter) {
      alert('Please select a parameter to automate');
      this.isRecording = false;
      return;
    }
    // Start recording automation points
  }

  stopRecording () {
    this.render();
  }

  recordAutomationPoint (time, value) {
    this.automationData.push({
      parameter: this.currentParameter,
      time,
      value
    });
  }

  render () {
    const lane = document.getElementById('automationLane');
    if (!lane || !this.currentParameter) return;

    lane.innerHTML = '';

    const points = this.automationData.filter(p => p.parameter === this.currentParameter);
    points.forEach((point, index) => {
      const pointElement = document.createElement('div');
      pointElement.className = 'automation-point';
      pointElement.style.left = `${point.time * 100}px`;
      pointElement.style.top = `${(1 - point.value) * 100}%`;
      pointElement.dataset.index = index;
      lane.appendChild(pointElement);
    });
  }

  handleMouseDown (e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - ((e.clientY - rect.top) / rect.height);

    this.addAutomationPoint(x * 10, Math.max(0, Math.min(1, y)));
  }

  addAutomationPoint (time, value) {
    if (!this.currentParameter) return;

    this.automationData.push({
      parameter: this.currentParameter,
      time,
      value
    });
    this.render();
  }

  loadAutomation () {
    this.render();
  }

  clearAutomation () {
    if (!confirm('Clear all automation for this parameter?')) return;

    this.automationData = this.automationData.filter(
      p => p.parameter !== this.currentParameter
    );
    this.render();
  }

  playbackAutomation () {
    // Apply automation during playback
    const currentTime = this.engine.transport?.seconds || 0;

    this.automationData.forEach(point => {
      if (Math.abs(point.time - currentTime) < 0.01) {
        this.applyAutomationValue(point.parameter, point.value);
      }
    });
  }

  applyAutomationValue (parameter, value) {
    const [_target, _param] = parameter.split('.');
    // Apply the value to the engine parameter
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BeatMakerAutomation;
}
