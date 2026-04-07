/**
 * Beat Maker - Audio Recording
 * Record audio from microphone or line input
 */

class BeatMakerRecording {
  constructor (engine, ui) {
    this.engine = engine;
    this.ui = ui;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.isRecording = false;
    this.audioContext = null;
    this.analyser = null;

    this.attachEventListeners();
  }

  async open () {
    this.ui.showModal('recordModal');
    await this.enumerateDevices();
  }

  attachEventListeners () {
    document.getElementById('startRecording')?.addEventListener('click', () => {
      this.startRecording();
    });

    document.getElementById('stopRecording')?.addEventListener('click', () => {
      this.stopRecording();
    });

    document.getElementById('saveRecording')?.addEventListener('click', () => {
      this.saveToProject();
    });
  }

  async enumerateDevices () {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');

      const select = document.getElementById('audioInputDevice');
      if (select) {
        select.innerHTML = '<option value="">Select Input Device</option>' +
          audioInputs.map(device =>
            `<option value="${device.deviceId}">${device.label || 'Microphone'}</option>`
          ).join('');
      }
    } catch (error) {
      console.error('Failed to enumerate devices:', error);  
    }
  }

  async startRecording () {
    try {
      const deviceId = document.getElementById('audioInputDevice')?.value;
      if (!deviceId) {
        alert('Please select an input device');
        return;
      }

      const constraints = {
        audio: {
          deviceId: { exact: deviceId }
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.audioChunks = [];

      // Setup audio context for monitoring
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      source.connect(this.analyser);

      // Start monitoring levels
      this.startLevelMonitoring();

      // Setup MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.createAudioBlob();
      };

      this.mediaRecorder.start();
      this.isRecording = true;

      // Update UI
      document.getElementById('startRecording').disabled = true;
      document.getElementById('stopRecording').disabled = false;

    } catch (error) {
      console.error('Recording start failed:', error);  
      alert('Failed to start recording. Please check microphone permissions.');
    }
  }

  stopRecording () {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;

      // Stop all tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }

      // Stop level monitoring
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }

      // Update UI
      document.getElementById('startRecording').disabled = false;
      document.getElementById('stopRecording').disabled = true;
    }
  }

  createAudioBlob () {
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);

    // Display preview
    const preview = document.getElementById('recordingPreview');
    const playback = document.getElementById('recordingPlayback');

    if (preview && playback) {
      preview.style.display = 'block';
      playback.src = audioUrl;
    }

    this.currentRecording = {
      blob: audioBlob,
      url: audioUrl
    };
  }

  startLevelMonitoring () {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    const meterFill = document.querySelector('.recording-meter-fill');

    if (!meterFill) {
      // Create meter fill element
      const meter = document.getElementById('recordingMeter');
      if (meter) {
        const fill = document.createElement('div');
        fill.className = 'recording-meter-fill';
        meter.appendChild(fill);
      }
    }

    this.monitoringInterval = setInterval(() => {
      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const level = (average / 255) * 100;

      const fill = document.querySelector('.recording-meter-fill');
      if (fill) {
        fill.style.width = `${level}%`;
      }
    }, 50);
  }

  async saveToProject () {
    if (!this.currentRecording) {
      alert('No recording to save');
      return;
    }

    try {
      // Upload recorded audio
      const formData = new FormData();
      formData.append('audio', this.currentRecording.blob, 'recording.webm');

      const token = localStorage.getItem('token');
      const response = await fetch('/api/beat-maker/upload-recording', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Add to engine as a sample
        await this.engine.loadSample('recording', data.url);
        this.ui.showSuccess('Recording added to project');
        this.ui.closeModal('recordModal');
      } else {
        this.ui.showError(data.error || 'Failed to save recording');
      }
    } catch (error) {
      console.error('Save recording failed:', error);  
      this.ui.showError('Failed to save recording');
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BeatMakerRecording;
}
