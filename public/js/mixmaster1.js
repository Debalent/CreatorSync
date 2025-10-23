/**
 * Mixmaster1 - Professional Audio Mixing Suite
 * Web Audio API powered mixing application
 */

class Mixmaster1 {
    constructor () {
        this.audioContext = null;
        this.tracks = new Map();
        this.masterGain = null;
        this.analyzer = null;
        this.compressor = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 225; // 3:45 in seconds
        this.bpm = 120;
        this.isRecording = false;

        // UI Elements
        this.playBtn = null;
        this.pauseBtn = null;
        this.stopBtn = null;
        this.currentTimeDisplay = null;
        this.tempoInput = null;

        // Analysis
        this.spectrumCanvas = null;
        this.waveformCanvas = null;
        this.histogramCanvas = null;
        this.analyzerData = new Uint8Array(256);
        this.waveformData = new Float32Array(1024);

        this.init();
    }

    async init () {
        console.log('🎛️ Initializing Mixmaster1...');

        try {
            // Initialize Web Audio API
            await this.initializeAudioContext();

            // Set up UI elements
            this.initializeUI();

            // Set up event listeners
            this.setupEventListeners();

            // Initialize tracks
            this.initializeTracks();

            // Start analysis loop
            this.startAnalysis();

            console.log('✅ Mixmaster1 initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Mixmaster1:', error);
            this.showError('Failed to initialize audio system. Please check your browser permissions.');
        }
    }

    async initializeAudioContext () {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Resume context if needed (Chrome autoplay policy)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        // Create master gain node
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);

        // Create master compressor
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-12, this.audioContext.currentTime);
        this.compressor.knee.setValueAtTime(4, this.audioContext.currentTime);
        this.compressor.ratio.setValueAtTime(4, this.audioContext.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
        this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

        // Create analyzer
        this.analyzer = this.audioContext.createAnalyser();
        this.analyzer.fftSize = 512;
        this.analyzer.smoothingTimeConstant = 0.8;

        // Connect the audio chain
        this.compressor.connect(this.analyzer);
        this.analyzer.connect(this.masterGain);
    }

    initializeUI () {
        // Transport controls
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.currentTimeDisplay = document.getElementById('currentTime');
        this.tempoInput = document.getElementById('tempoInput');

        // Analysis canvases
        this.spectrumCanvas = document.getElementById('spectrumCanvas');
        this.waveformCanvas = document.getElementById('waveformCanvas');
        this.histogramCanvas = document.getElementById('histogramCanvas');

        // Set up canvas contexts
        this.spectrumCtx = this.spectrumCanvas?.getContext('2d');
        this.waveformCtx = this.waveformCanvas?.getContext('2d');
        this.histogramCtx = this.histogramCanvas?.getContext('2d');
    }

    setupEventListeners () {
        // Transport controls
        this.playBtn?.addEventListener('click', () => this.play());
        this.pauseBtn?.addEventListener('click', () => this.pause());
        this.stopBtn?.addEventListener('click', () => this.stop());

        // Navigation
        document.getElementById('backToFinisher')?.addEventListener('click', () => {
            this.navigateToFinisher();
        });

        // Project controls
        document.getElementById('saveProject')?.addEventListener('click', () => this.saveProject());
        document.getElementById('exportAudio')?.addEventListener('click', () => this.exportAudio());
        document.getElementById('shareProject')?.addEventListener('click', () => this.shareProject());

        // Mixer controls
        document.getElementById('addTrack')?.addEventListener('click', () => this.addTrack());
        document.getElementById('resetMixer')?.addEventListener('click', () => this.resetMixer());

        // Tempo control
        this.tempoInput?.addEventListener('input', (e) => {
            this.bpm = parseInt(e.target.value);
            this.updateProjectInfo();
        });

        // Analysis tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchAnalysisTab(e.target.dataset.tab));
        });

        // Channel controls
        this.setupChannelControls();

        // Record button
        document.getElementById('recordBtn')?.addEventListener('click', () => this.toggleRecording());
    }

    setupChannelControls () {
        // EQ controls
        document.querySelectorAll('.eq-knob').forEach(knob => {
            knob.addEventListener('input', (e) => this.updateEQ(e));
        });

        // Effect controls
        document.querySelectorAll('.effect-knob').forEach(knob => {
            knob.addEventListener('input', (e) => this.updateEffect(e));
        });

        // Volume faders
        document.querySelectorAll('.volume-fader').forEach(fader => {
            fader.addEventListener('input', (e) => this.updateVolume(e));
        });

        // Pan controls
        document.querySelectorAll('.pan-knob').forEach(pan => {
            pan.addEventListener('input', (e) => this.updatePan(e));
        });

        // Solo/Mute buttons
        document.querySelectorAll('.solo').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleSolo(e));
        });

        document.querySelectorAll('.mute').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleMute(e));
        });
    }

    initializeTracks () {
        // Initialize default tracks
        const defaultTracks = [
            { id: 1, name: 'Lead Synth', type: 'synth', color: '#ff6b6b' },
            { id: 2, name: 'Bass', type: 'bass', color: '#4ecdc4' },
            { id: 3, name: 'Drums', type: 'drums', color: '#ffa726' }
        ];

        defaultTracks.forEach(trackConfig => {
            this.createTrack(trackConfig);
        });
    }

    createTrack (config) {
        try {
            const track = {
                id: config.id,
                name: config.name,
                type: config.type,

                // Audio nodes
                gain: this.audioContext.createGain(),
                panner: this.audioContext.createStereoPanner(),
                eq: {
                    high: this.audioContext.createBiquadFilter(),
                    mid: this.audioContext.createBiquadFilter(),
                    low: this.audioContext.createBiquadFilter()
                },
                effects: {
                    reverb: this.audioContext.createConvolver(),
                    delay: this.audioContext.createDelay()
                },

                // State
                isSolo: false,
                isMuted: false,
                volume: 0.75,
                pan: 0,
                eqSettings: { high: 0, mid: 0, low: 0 },
                effectSettings: { reverb: 20, delay: 0 }
            };

            // Configure EQ filters
            track.eq.high.type = 'highshelf';
            track.eq.high.frequency.setValueAtTime(8000, this.audioContext.currentTime);
            track.eq.mid.type = 'peaking';
            track.eq.mid.frequency.setValueAtTime(1000, this.audioContext.currentTime);
            track.eq.mid.Q.setValueAtTime(1, this.audioContext.currentTime);
            track.eq.low.type = 'lowshelf';
            track.eq.low.frequency.setValueAtTime(320, this.audioContext.currentTime);

            // Connect audio chain
            track.eq.high.connect(track.eq.mid);
            track.eq.mid.connect(track.eq.low);
            track.eq.low.connect(track.panner);
            track.panner.connect(track.gain);
            track.gain.connect(this.compressor);

            // Set initial values
            track.gain.gain.setValueAtTime(track.volume, this.audioContext.currentTime);

            this.tracks.set(config.id, track);
        } catch (error) {
            console.error('❌ Error creating track:', error);
        }
    }

    updateEQ (event) {
        const knob = event.target;
        const value = parseFloat(knob.value);
        const freq = knob.dataset.freq;
        const channel = knob.closest('.mixer-channel');
        const trackId = channel.dataset.track;

        if (trackId === 'master') {
            // Update master EQ (placeholder)
            console.log(`Master ${freq} EQ: ${value}dB`);
        } else {
            const track = this.tracks.get(parseInt(trackId));
            if (track && track.eq[freq]) {
                track.eq[freq].gain.setValueAtTime(value, this.audioContext.currentTime);
                track.eqSettings[freq] = value;
            }
        }

        // Update display
        const valueDisplay = knob.nextElementSibling;
        if (valueDisplay) {
            valueDisplay.textContent = value >= 0 ? `+${value}dB` : `${value}dB`;
        }
    }

    updateEffect (event) {
        const knob = event.target;
        const value = parseFloat(knob.value);
        const effect = knob.dataset.effect;
        const channel = knob.closest('.mixer-channel');
        const trackId = channel.dataset.track;

        if (trackId !== 'master') {
            const track = this.tracks.get(parseInt(trackId));
            if (track) {
                track.effectSettings[effect] = value;
                // Apply effect (simplified - real implementation would be more complex)
                console.log(`Track ${trackId} ${effect}: ${value}%`);
            }
        }

        // Update display
        const valueDisplay = knob.nextElementSibling;
        if (valueDisplay) {
            valueDisplay.textContent = `${value}%`;
        }
    }

    updateVolume (event) {
        const fader = event.target;
        const value = parseFloat(fader.value) / 100;
        const channel = fader.closest('.mixer-channel');
        const trackId = channel.dataset.track;

        if (trackId === 'master') {
            this.masterGain.gain.setValueAtTime(value, this.audioContext.currentTime);
        } else {
            const track = this.tracks.get(parseInt(trackId));
            if (track) {
                track.gain.gain.setValueAtTime(value, this.audioContext.currentTime);
                track.volume = value;
            }
        }

        // Update display
        const valueDisplay = fader.nextElementSibling;
        if (valueDisplay) {
            valueDisplay.textContent = Math.round(value * 100);
        }

        // Update level meters
        this.updateLevelMeter(trackId, value);
    }

    updatePan (event) {
        const knob = event.target;
        const value = parseFloat(knob.value) / 100;
        const channel = knob.closest('.mixer-channel');
        const trackId = channel.dataset.track;

        if (trackId !== 'master') {
            const track = this.tracks.get(parseInt(trackId));
            if (track && track.panner) {
                track.panner.pan.setValueAtTime(value, this.audioContext.currentTime);
                track.pan = value;
            }
        }

        // Update display
        const valueDisplay = knob.nextElementSibling;
        if (valueDisplay) {
            if (value === 0) {
                valueDisplay.textContent = 'C';
            } else if (value < 0) {
                valueDisplay.textContent = `L${Math.abs(Math.round(value * 100))}`;
            } else {
                valueDisplay.textContent = `R${Math.round(value * 100)}`;
            }
        }
    }

    toggleSolo (event) {
        const btn = event.target;
        const channel = btn.closest('.mixer-channel');
        const trackId = parseInt(channel.dataset.track);
        const track = this.tracks.get(trackId);

        if (track) {
            track.isSolo = !track.isSolo;
            btn.classList.toggle('active', track.isSolo);

            // Update other tracks
            this.tracks.forEach((t, id) => {
                if (id !== trackId && track.isSolo) {
                    t.gain.gain.setValueAtTime(0, this.audioContext.currentTime);
                } else if (!track.isSolo) {
                    t.gain.gain.setValueAtTime(t.volume, this.audioContext.currentTime);
                }
            });
        }
    }

    toggleMute (event) {
        const btn = event.target;
        const channel = btn.closest('.mixer-channel');
        const trackId = parseInt(channel.dataset.track);
        const track = this.tracks.get(trackId);

        if (track) {
            track.isMuted = !track.isMuted;
            btn.classList.toggle('active', track.isMuted);

            const gainValue = track.isMuted ? 0 : track.volume;
            track.gain.gain.setValueAtTime(gainValue, this.audioContext.currentTime);
        }
    }

    updateLevelMeter (trackId, level) {
        const channel = document.querySelector(`[data-track="${trackId}"]`);
        if (channel) {
            const meters = channel.querySelectorAll('.meter-bar');
            meters.forEach(meter => {
                meter.style.height = `${level * 80}%`;
            });
        }
    }

    async play () {
        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.isPlaying = true;
            this.playBtn.style.display = 'none';
            this.pauseBtn.style.display = 'flex';

            this.startTimeUpdate();
            console.log('▶️ Playing');
        } catch (error) {
            console.error('❌ Error playing:', error);
        }
    }

    pause () {
        this.isPlaying = false;
        this.playBtn.style.display = 'flex';
        this.pauseBtn.style.display = 'none';
        console.log('⏸️ Paused');
    }

    stop () {
        this.isPlaying = false;
        this.currentTime = 0;
        this.playBtn.style.display = 'flex';
        this.pauseBtn.style.display = 'none';
        this.updateTimeDisplay();
        console.log('⏹️ Stopped');
    }

    startTimeUpdate () {
        if (!this.isPlaying) return;

        this.currentTime += 0.1;
        if (this.currentTime >= this.duration) {
            this.stop();
            return;
        }

        this.updateTimeDisplay();
        setTimeout(() => this.startTimeUpdate(), 100);
    }

    updateTimeDisplay () {
        if (this.currentTimeDisplay) {
            const minutes = Math.floor(this.currentTime / 60);
            const seconds = Math.floor(this.currentTime % 60);
            this.currentTimeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateProjectInfo () {
        document.getElementById('projectBpm').textContent = `${this.bpm} BPM`;
    }

    startAnalysis () {
        this.updateAnalysis();
    }

    updateAnalysis () {
        if (!this.analyzer) return;

        // Get frequency data
        this.analyzer.getByteFrequencyData(this.analyzerData);

        // Update active analysis panel
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;

        switch (activeTab) {
        case 'spectrum':
            this.drawSpectrum();
            break;
        case 'waveform':
            this.drawWaveform();
            break;
        case 'histogram':
            this.drawHistogram();
            break;
        }

        requestAnimationFrame(() => this.updateAnalysis());
    }

    drawSpectrum () {
        if (!this.spectrumCtx) return;

        const canvas = this.spectrumCanvas;
        const ctx = this.spectrumCtx;
        const width = canvas.width;
        const height = canvas.height;

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, width, height);

        const barWidth = width / this.analyzerData.length;

        for (let i = 0; i < this.analyzerData.length; i++) {
            const barHeight = (this.analyzerData[i] / 255) * height;

            const hue = (i / this.analyzerData.length) * 360;
            ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;

            ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
        }
    }

    drawWaveform () {
        if (!this.waveformCtx) return;

        const canvas = this.waveformCanvas;
        const ctx = this.waveformCtx;
        const width = canvas.width;
        const height = canvas.height;

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const sliceWidth = width / this.waveformData.length;
        let x = 0;

        for (let i = 0; i < this.waveformData.length; i++) {
            const v = (this.waveformData[i] + 1) / 2;
            const y = v * height;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.stroke();
    }

    drawHistogram () {
        if (!this.histogramCtx) return;

        const canvas = this.histogramCanvas;
        const ctx = this.histogramCtx;
        const width = canvas.width;
        const height = canvas.height;

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, width, height);

        // Draw level histogram
        const levels = [20, 35, 60, 45, 30, 15, 8, 3, 1];
        const barWidth = width / levels.length;

        for (let i = 0; i < levels.length; i++) {
            const barHeight = (levels[i] / 60) * height;

            ctx.fillStyle = i < 5 ? '#4caf50' : i < 7 ? '#ffc107' : '#ff5722';
            ctx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight);
        }
    }

    switchAnalysisTab (tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Update panels
        document.querySelectorAll('.analysis-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tab}-panel`);
        });
    }

    addTrack () {
        const trackId = this.tracks.size + 1;
        const newTrack = {
            id: trackId,
            name: `Track ${trackId}`,
            type: 'audio',
            color: '#666'
        };

        this.createTrack(newTrack);
        this.showNotification(`Track ${trackId} added`, 'success');
    }

    resetMixer () {
        if (confirm('Reset all mixer settings? This cannot be undone.')) {
            this.tracks.forEach(track => {
                // Reset all controls to default values
                track.gain.gain.setValueAtTime(0.75, this.audioContext.currentTime);
                track.panner.pan.setValueAtTime(0, this.audioContext.currentTime);

                // Reset EQ
                Object.values(track.eq).forEach(filter => {
                    filter.gain.setValueAtTime(0, this.audioContext.currentTime);
                });

                // Reset UI
                const channel = document.querySelector(`[data-track="${track.id}"]`);
                if (channel) {
                    channel.querySelectorAll('input[type="range"]').forEach(input => {
                        input.value = input.defaultValue || 0;
                        const event = new Event('input');
                        input.dispatchEvent(event);
                    });
                }
            });

            this.showNotification('Mixer reset to default settings', 'info');
        }
    }

    async saveProject () {
        try {
            const projectData = {
                name: document.getElementById('projectName').textContent,
                bpm: this.bpm,
                tracks: Array.from(this.tracks.entries()).map(([id, track]) => ({
                    id,
                    name: track.name,
                    volume: track.volume,
                    pan: track.pan,
                    eqSettings: track.eqSettings,
                    effectSettings: track.effectSettings
                })),
                timestamp: new Date().toISOString()
            };

            localStorage.setItem('mixmaster1_project', JSON.stringify(projectData));
            this.showNotification('Project saved successfully', 'success');
        } catch (error) {
            console.error('❌ Error saving project:', error);
            this.showNotification('Failed to save project', 'error');
        }
    }

    async exportAudio () {
        try {
            this.showNotification('Exporting audio... This may take a moment.', 'info');

            // Simulate export process
            setTimeout(() => {
                this.showNotification('Audio exported successfully', 'success');
            }, 2000);
        } catch (error) {
            console.error('❌ Error exporting audio:', error);
            this.showNotification('Failed to export audio', 'error');
        }
    }

    shareProject () {
        const shareData = {
            name: document.getElementById('projectName').textContent,
            bpm: this.bpm,
            tracks: this.tracks.size
        };

        if (navigator.share) {
            navigator.share({
                title: 'Mixmaster1 Project',
                text: `Check out my project: ${shareData.name} (${shareData.bpm} BPM, ${shareData.tracks} tracks)`,
                url: window.location.href
            });
        } else {
            // Fallback - copy to clipboard
            const shareText = `Check out my Mixmaster1 project: ${shareData.name} (${shareData.bpm} BPM, ${shareData.tracks} tracks)`;
            navigator.clipboard.writeText(shareText);
            this.showNotification('Project link copied to clipboard', 'success');
        }
    }

    toggleRecording () {
        this.isRecording = !this.isRecording;
        const recordBtn = document.getElementById('recordBtn');

        recordBtn.classList.toggle('active', this.isRecording);
        recordBtn.style.color = this.isRecording ? '#ff4757' : '#ff6b6b';

        if (this.isRecording) {
            this.showNotification('Recording started', 'info');
        } else {
            this.showNotification('Recording stopped', 'info');
        }
    }

    navigateToFinisher () {
        // Save current state before navigating
        this.saveProject();

        // Navigate back to The Finisher
        window.location.href = '/finisher-app.html';
    }

    showNotification (message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Style notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '6px',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateY(-20px)',
            transition: 'all 0.3s ease'
        });

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    showError (message) {
        this.showNotification(message, 'error');
    }
}

// Initialize Mixmaster1 when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.mixmaster1 = new Mixmaster1();
});

// Global functions for UI callbacks
window.upgradeSubscription = function (plan) {
    console.log(`Upgrading to ${plan} plan`);
    window.mixmaster1?.showNotification(`Upgrade to ${plan} plan initiated`, 'info');
};

window.goBackToCreatorSync = function () {
    window.location.href = '/';
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Mixmaster1;
}
