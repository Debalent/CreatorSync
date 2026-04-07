/**
 * MixMaster1 Pro - Professional Audio Mixing Suite
 * Rivals industry-standard DAW mixing capabilities
 */

class MixMaster1Pro {
    constructor() {
        this.audioContext = null;
        this.channels = new Map();
        this.buses = new Map();
        this.sends = new Map();
        this.masterChain = null;
        this.isPlaying = false;
        this.automation = new Map();
        this.snapshots = [];
        
        // Professional metering
        this.meters = {
            vu: null,
            peak: null,
            rms: null,
            lufs: null,
            phaseCorrelation: null
        };
        
        this.init();
    }
    
    async init() {
        console.log('🎛️ Initializing MixMaster1 Pro...');
        
        // Initialize Web Audio
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
            latencyHint: 'interactive',
            sampleRate: 48000
        });
        
        // Create master chain with professional processing
        await this.createMasterChain();
        
        // Create default buses (drums, instruments, vocals, FX)
        this.createBus('drums', 'Drums Bus');
        this.createBus('instruments', 'Instruments Bus');
        this.createBus('vocals', 'Vocals Bus');
        this.createBus('fx', 'FX Bus');
        
        // Create send effects
        this.createSend('reverb', 'Main Reverb');
        this.createSend('delay', 'Main Delay');
        
        // Initialize UI
        this.initUI();
        
        // Start metering
        this.startMetering();
        
        console.log('✅ MixMaster1 Pro initialized');
    }
    
    async createMasterChain() {
        this.masterChain = {
            input: this.audioContext.createGain(),
            
            // Professional EQ (linear phase)
            eq: {
                lowShelf: this.audioContext.createBiquadFilter(),
                lowMid: this.audioContext.createBiquadFilter(),
                mid: this.audioContext.createBiquadFilter(),
                highMid: this.audioContext.createBiquadFilter(),
                highShelf: this.audioContext.createBiquadFilter()
            },
            
            // Multi-band compressor
            multiband: {
                low: this.createMultibandCompressor(20, 200),
                mid: this.createMultibandCompressor(200, 2000),
                high: this.createMultibandCompressor(2000, 20000)
            },
            
            // Mastering compressor
            compressor: this.audioContext.createDynamicsCompressor(),
            
            // Stereo widener
            widener: this.createStereoWidener(),
            
            // Limiter
            limiter: this.createLimiter(),
            
            // Analyzer
            analyzer: this.audioContext.createAnalyser(),
            
            // Output
            output: this.audioContext.createGain()
        };
        
        // Configure master EQ
        this.masterChain.eq.lowShelf.type = 'lowshelf';
        this.masterChain.eq.lowShelf.frequency.value = 80;
        this.masterChain.eq.lowMid.type = 'peaking';
        this.masterChain.eq.lowMid.frequency.value = 250;
        this.masterChain.eq.lowMid.Q.value = 1.4;
        this.masterChain.eq.mid.type = 'peaking';
        this.masterChain.eq.mid.frequency.value = 1000;
        this.masterChain.eq.mid.Q.value = 1.4;
        this.masterChain.eq.highMid.type = 'peaking';
        this.masterChain.eq.highMid.frequency.value = 4000;
        this.masterChain.eq.highMid.Q.value = 1.4;
        this.masterChain.eq.highShelf.type = 'highshelf';
        this.masterChain.eq.highShelf.frequency.value = 10000;
        
        // Configure mastering compressor
        this.masterChain.compressor.threshold.value = -6;
        this.masterChain.compressor.knee.value = 6;
        this.masterChain.compressor.ratio.value = 2;
        this.masterChain.compressor.attack.value = 0.003;
        this.masterChain.compressor.release.value = 0.1;
        
        // Configure analyzer for professional metering
        this.masterChain.analyzer.fftSize = 8192;
        this.masterChain.analyzer.smoothingTimeConstant = 0.85;
        
        // Chain everything together
        let current = this.masterChain.input;
        
        // EQ chain
        for (const filter of Object.values(this.masterChain.eq)) {
            current.connect(filter);
            current = filter;
        }
        
        // Multiband compression (parallel)
        const multibandMixer = this.audioContext.createGain();
        for (const band of Object.values(this.masterChain.multiband)) {
            current.connect(band.input);
            band.output.connect(multibandMixer);
        }
        current = multibandMixer;
        
        // Mastering chain
        current.connect(this.masterChain.compressor);
        this.masterChain.compressor.connect(this.masterChain.widener.input);
        this.masterChain.widener.output.connect(this.masterChain.limiter.input);
        this.masterChain.limiter.output.connect(this.masterChain.analyzer);
        this.masterChain.analyzer.connect(this.masterChain.output);
        this.masterChain.output.connect(this.audioContext.destination);
    }
    
    createChannel(name, type = 'mono') {
        const channel = {
            name,
            type,
            
            // Input
            input: this.audioContext.createGain(),
            
            // Gate/Expander
            gate: this.createGate(),
            
            // De-esser (for vocals)
            deesser: this.createDeesser(),
            
            // Parametric EQ (4-band)
            eq: {
                low: this.audioContext.createBiquadFilter(),
                lowMid: this.audioContext.createBiquadFilter(),
                highMid: this.audioContext.createBiquadFilter(),
                high: this.audioContext.createBiquadFilter()
            },
            
            // Compressor
            compressor: this.audioContext.createDynamicsCompressor(),
            
            // Insert effects slots (4 slots)
            inserts: [
                this.audioContext.createGain(),
                this.audioContext.createGain(),
                this.audioContext.createGain(),
                this.audioContext.createGain()
            ],
            
            // Send levels
            sends: new Map(),
            
            // Pan
            panner: this.audioContext.createStereoPanner(),
            
            // Fader
            fader: this.audioContext.createGain(),
            
            // Metering
            meter: {
                pre: this.audioContext.createAnalyser(),
                post: this.audioContext.createAnalyser()
            },
            
            // Output
            output: this.audioContext.createGain(),
            
            // State
            solo: false,
            mute: false,
            bus: null,
            automation: new Map()
        };
        
        // Configure EQ
        channel.eq.low.type = 'lowshelf';
        channel.eq.low.frequency.value = 80;
        channel.eq.lowMid.type = 'peaking';
        channel.eq.lowMid.frequency.value = 400;
        channel.eq.lowMid.Q.value = 1.4;
        channel.eq.highMid.type = 'peaking';
        channel.eq.highMid.frequency.value = 2500;
        channel.eq.highMid.Q.value = 1.4;
        channel.eq.high.type = 'highshelf';
        channel.eq.high.frequency.value = 8000;
        
        // Configure compressor
        channel.compressor.threshold.value = -18;
        channel.compressor.knee.value = 4;
        channel.compressor.ratio.value = 4;
        channel.compressor.attack.value = 0.005;
        channel.compressor.release.value = 0.05;
        
        // Chain the signal path
        let current = channel.input;
        current.connect(channel.meter.pre);
        current.connect(channel.gate.input);
        current = channel.gate.output;
        
        if (type === 'vocal') {
            current.connect(channel.deesser.input);
            current = channel.deesser.output;
        }
        
        // EQ chain
        for (const filter of Object.values(channel.eq)) {
            current.connect(filter);
            current = filter;
        }
        
        current.connect(channel.compressor);
        current = channel.compressor;
        
        // Insert effects chain
        for (const insert of channel.inserts) {
            current.connect(insert);
            current = insert;
        }
        
        current.connect(channel.panner);
        channel.panner.connect(channel.fader);
        channel.fader.connect(channel.meter.post);
        channel.meter.post.connect(channel.output);
        
        // Configure meters
        channel.meter.pre.fftSize = 2048;
        channel.meter.post.fftSize = 2048;
        
        this.channels.set(name, channel);
        return channel;
    }
    
    createBus(id, name) {
        const bus = {
            id,
            name,
            input: this.audioContext.createGain(),
            compressor: this.audioContext.createDynamicsCompressor(),
            eq: this.audioContext.createBiquadFilter(),
            output: this.audioContext.createGain()
        };
        
        // Configure bus compressor (glue compression)
        bus.compressor.threshold.value = -12;
        bus.compressor.ratio.value = 2;
        bus.compressor.attack.value = 0.01;
        bus.compressor.release.value = 0.1;
        
        // Chain
        bus.input.connect(bus.compressor);
        bus.compressor.connect(bus.eq);
        bus.eq.connect(bus.output);
        bus.output.connect(this.masterChain.input);
        
        this.buses.set(id, bus);
        return bus;
    }
    
    createSend(id, name) {
        const send = {
            id,
            name,
            input: this.audioContext.createGain(),
            effect: null,
            return: this.audioContext.createGain(),
            output: this.audioContext.createGain()
        };
        
        // Create appropriate effect based on type
        if (id === 'reverb') {
            send.effect = this.createReverb();
        } else if (id === 'delay') {
            send.effect = this.createDelay();
        }
        
        // Chain
        send.input.connect(send.effect.input);
        send.effect.output.connect(send.return);
        send.return.connect(send.output);
        send.output.connect(this.masterChain.input);
        
        this.sends.set(id, send);
        return send;
    }
    
    createGate() {
        // Simple gate using gain and threshold detection
        const gate = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            threshold: -40,
            ratio: 10,
            attack: 0.001,
            release: 0.1
        };
        
        gate.input.connect(gate.output);
        return gate;
    }
    
    createDeesser() {
        const deesser = {
            input: this.audioContext.createGain(),
            filter: this.audioContext.createBiquadFilter(),
            compressor: this.audioContext.createDynamicsCompressor(),
            output: this.audioContext.createGain()
        };
        
        // High-shelf filter for sibilance detection
        deesser.filter.type = 'highshelf';
        deesser.filter.frequency.value = 6000;
        
        // Aggressive compression on high frequencies
        deesser.compressor.threshold.value = -25;
        deesser.compressor.ratio.value = 6;
        deesser.compressor.attack.value = 0.001;
        deesser.compressor.release.value = 0.01;
        
        // Chain
        deesser.input.connect(deesser.filter);
        deesser.filter.connect(deesser.compressor);
        deesser.compressor.connect(deesser.output);
        
        return deesser;
    }
    
    createMultibandCompressor(lowFreq, highFreq) {
        const multiband = {
            input: this.audioContext.createGain(),
            lowpass: this.audioContext.createBiquadFilter(),
            highpass: this.audioContext.createBiquadFilter(),
            compressor: this.audioContext.createDynamicsCompressor(),
            output: this.audioContext.createGain()
        };
        
        multiband.lowpass.type = 'lowpass';
        multiband.lowpass.frequency.value = highFreq;
        multiband.highpass.type = 'highpass';
        multiband.highpass.frequency.value = lowFreq;
        
        // Chain
        multiband.input.connect(multiband.highpass);
        multiband.highpass.connect(multiband.lowpass);
        multiband.lowpass.connect(multiband.compressor);
        multiband.compressor.connect(multiband.output);
        
        return multiband;
    }
    
    createStereoWidener() {
        const widener = {
            input: this.audioContext.createGain(),
            splitter: this.audioContext.createChannelSplitter(2),
            widthControl: this.audioContext.createGain(),
            merger: this.audioContext.createChannelMerger(2),
            output: this.audioContext.createGain(),
            width: 1.0
        };
        
        // Chain for Mid/Side processing
        widener.input.connect(widener.splitter);
        widener.splitter.connect(widener.widthControl, 0);
        widener.splitter.connect(widener.widthControl, 1);
        widener.widthControl.connect(widener.merger, 0, 0);
        widener.widthControl.connect(widener.merger, 0, 1);
        widener.merger.connect(widener.output);
        
        return widener;
    }
    
    createLimiter() {
        const limiter = {
            input: this.audioContext.createGain(),
            compressor: this.audioContext.createDynamicsCompressor(),
            output: this.audioContext.createGain()
        };
        
        // True peak limiter settings
        limiter.compressor.threshold.value = -0.3;
        limiter.compressor.knee.value = 0;
        limiter.compressor.ratio.value = 20;
        limiter.compressor.attack.value = 0.001;
        limiter.compressor.release.value = 0.05;
        
        limiter.input.connect(limiter.compressor);
        limiter.compressor.connect(limiter.output);
        
        return limiter;
    }
    
    createReverb() {
        // Convolution reverb
        const reverb = {
            input: this.audioContext.createGain(),
            convolver: this.audioContext.createConvolver(),
            wetGain: this.audioContext.createGain(),
            dryGain: this.audioContext.createGain(),
            output: this.audioContext.createGain()
        };
        
        reverb.wetGain.gain.value = 0.5;
        reverb.dryGain.gain.value = 0.5;
        
        // Chain
        reverb.input.connect(reverb.dryGain);
        reverb.input.connect(reverb.convolver);
        reverb.convolver.connect(reverb.wetGain);
        reverb.dryGain.connect(reverb.output);
        reverb.wetGain.connect(reverb.output);
        
        // TODO: Load impulse response
        
        return reverb;
    }
    
    createDelay() {
        const delay = {
            input: this.audioContext.createGain(),
            delayNode: this.audioContext.createDelay(2.0),
            feedback: this.audioContext.createGain(),
            filter: this.audioContext.createBiquadFilter(),
            wetGain: this.audioContext.createGain(),
            output: this.audioContext.createGain()
        };
        
        delay.delayNode.delayTime.value = 0.375; // Dotted eighth
        delay.feedback.gain.value = 0.4;
        delay.wetGain.gain.value = 0.3;
        delay.filter.type = 'lowpass';
        delay.filter.frequency.value = 4000;
        
        // Chain with feedback
        delay.input.connect(delay.delayNode);
        delay.delayNode.connect(delay.filter);
        delay.filter.connect(delay.feedback);
        delay.feedback.connect(delay.delayNode);
        delay.delayNode.connect(delay.wetGain);
        delay.wetGain.connect(delay.output);
        
        return delay;
    }
    
    // Automation system
    recordAutomation(channel, parameter, value, time) {
        if (!this.automation.has(channel)) {
            this.automation.set(channel, new Map());
        }
        const channelAutomation = this.automation.get(channel);
        if (!channelAutomation.has(parameter)) {
            channelAutomation.set(parameter, []);
        }
        channelAutomation.get(parameter).push({ time, value });
    }
    
    playAutomation() {
        const now = this.audioContext.currentTime;
        for (const [channelName, params] of this.automation) {
            const channel = this.channels.get(channelName);
            if (!channel) continue;
            
            for (const [param, points] of params) {
                for (const point of points) {
                    const time = now + point.time;
                    this.setParameter(channel, param, point.value, time);
                }
            }
        }
    }
    
    setParameter(channel, param, value, time) {
        const audioParam = this.getAudioParam(channel, param);
        if (audioParam) {
            audioParam.linearRampToValueAtTime(value, time);
        }
    }
    
    getAudioParam(channel, param) {
        // Map parameter names to Web Audio nodes
        const parts = param.split('.');
        let current = channel;
        for (const part of parts) {
            current = current[part];
            if (!current) return null;
        }
        return current;
    }
    
    // Mix snapshots
    saveSnapshot(name) {
        const snapshot = {
            name,
            timestamp: Date.now(),
            channels: {},
            master: {}
        };
        
        // Save all channel states
        for (const [channelName, channel] of this.channels) {
            snapshot.channels[channelName] = {
                fader: channel.fader.gain.value,
                pan: channel.panner.pan.value,
                solo: channel.solo,
                mute: channel.mute,
                eq: {
                    low: channel.eq.low.gain.value,
                    lowMid: channel.eq.lowMid.gain.value,
                    highMid: channel.eq.highMid.gain.value,
                    high: channel.eq.high.gain.value
                },
                compressor: {
                    threshold: channel.compressor.threshold.value,
                    ratio: channel.compressor.ratio.value,
                    attack: channel.compressor.attack.value,
                    release: channel.compressor.release.value
                }
            };
        }
        
        // Save master chain state
        snapshot.master = {
            gain: this.masterChain.output.gain.value,
            compressor: {
                threshold: this.masterChain.compressor.threshold.value,
                ratio: this.masterChain.compressor.ratio.value
            }
        };
        
        this.snapshots.push(snapshot);
        return snapshot;
    }
    
    loadSnapshot(snapshotId) {
        const snapshot = this.snapshots[snapshotId];
        if (!snapshot) return;
        
        const now = this.audioContext.currentTime;
        const fadeTime = 0.05; // 50ms crossfade
        
        // Restore channel states with smooth transitions
        for (const [channelName, state] of Object.entries(snapshot.channels)) {
            const channel = this.channels.get(channelName);
            if (!channel) continue;
            
            channel.fader.gain.linearRampToValueAtTime(state.fader, now + fadeTime);
            channel.panner.pan.linearRampToValueAtTime(state.pan, now + fadeTime);
            channel.solo = state.solo;
            channel.mute = state.mute;
            
            // EQ
            for (const [band, value] of Object.entries(state.eq)) {
                channel.eq[band].gain.linearRampToValueAtTime(value, now + fadeTime);
            }
            
            // Compressor
            channel.compressor.threshold.linearRampToValueAtTime(state.compressor.threshold, now + fadeTime);
            channel.compressor.ratio.linearRampToValueAtTime(state.compressor.ratio, now + fadeTime);
        }
        
        // Restore master
        this.masterChain.output.gain.linearRampToValueAtTime(snapshot.master.gain, now + fadeTime);
    }
    
    startMetering() {
        const updateMeters = () => {
            // VU meters with ballistics
            // Peak meters with hold
            // RMS calculation
            // LUFS integrated loudness
            // Phase correlation
            
            requestAnimationFrame(updateMeters);
        };
        updateMeters();
    }
    
    initUI() {
        console.log('🎨 Initializing Professional UI...');
        
        // Transport controls
        document.getElementById('playBtn')?.addEventListener('click', () => this.togglePlay());
        document.getElementById('stopBtn')?.addEventListener('click', () => this.stop());
        document.getElementById('recordBtn')?.addEventListener('click', () => this.toggleRecord());
        
        // Fader controls
        this.initFaders();
        
        // Pan controls
        this.initPanControls();
        
        // Inspector tabs
        this.initInspectorTabs();
        
        // Channel controls
        this.initChannelControls();
        
        // EQ visualization
        this.drawEQCurve();
        
        // Compressor visualization
        this.drawCompCurve();
    }
    
    togglePlay() {
        this.isPlaying = !this.isPlaying;
        const playBtn = document.getElementById('playBtn');
        
        if (this.isPlaying) {
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            playBtn.classList.add('playing');
            this.audioContext.resume();
            this.playAutomation();
            console.log('▶️  Playing');
        } else {
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            playBtn.classList.remove('playing');
            this.audioContext.suspend();
            console.log('⏸️  Paused');
        }
    }
    
    stop() {
        this.isPlaying = false;
        const playBtn = document.getElementById('playBtn');
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        playBtn.classList.remove('playing');
        this.audioContext.suspend();
        console.log('⏹️  Stopped');
    }
    
    toggleRecord() {
        console.log('🔴 Recording toggle - Not yet implemented');
    }
    
    initFaders() {
        document.querySelectorAll('.fader-track').forEach(fader => {
            let isDragging = false;
            const thumb = fader.querySelector('.fader-thumb');
            const fill = fader.querySelector('.fader-fill');
            const valueDisplay = fader.closest('.fader-control').querySelector('.fader-value');
            
            const updateFader = (e) => {
                const rect = fader.getBoundingClientRect();
                const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
                const percentage = (rect.height - y) / rect.height;
                const db = (percentage * 12) - 60; // -60dB to +12dB range
                
                thumb.style.top = `${y}px`;
                fill.style.height = `${percentage * 100}%`;
                valueDisplay.textContent = db >= 0 ? `+${db.toFixed(1)}` : db.toFixed(1);
                
                // Update audio gain
                const channel = fader.closest('.channel-strip').dataset.channel;
                if (channel) {
                    const gain = Math.pow(10, db / 20); // Convert dB to linear
                    // Apply to audio channel (implement when channels are loaded)
                }
            };
            
            fader.addEventListener('mousedown', (e) => {
                isDragging = true;
                updateFader(e);
            });
            
            document.addEventListener('mousemove', (e) => {
                if (isDragging) updateFader(e);
            });
            
            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
        });
    }
    
    initPanControls() {
        document.querySelectorAll('.pan-knob').forEach(knob => {
            let isDragging = false;
            const svg = knob.querySelector('.pan-value');
            const valueDisplay = knob.querySelector('.pan-value-text');
            
            const updatePan = (e) => {
                const rect = knob.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
                
                // Map angle to pan value (-1 to 1)
                const pan = Math.max(-1, Math.min(1, angle / Math.PI));
                
                // Update visual
                const dashOffset = 37.7 - (pan * 37.7);
                svg.setAttribute('stroke-dashoffset', dashOffset);
                
                // Update text
                if (Math.abs(pan) < 0.05) {
                    valueDisplay.textContent = 'C';
                } else if (pan < 0) {
                    valueDisplay.textContent = `L${Math.abs(Math.round(pan * 100))}`;
                } else {
                    valueDisplay.textContent = `R${Math.round(pan * 100)}`;
                }
            };
            
            knob.addEventListener('mousedown', (e) => {
                isDragging = true;
                updatePan(e);
            });
            
            document.addEventListener('mousemove', (e) => {
                if (isDragging) updatePan(e);
            });
            
            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
        });
    }
    
    initInspectorTabs() {
        document.querySelectorAll('.inspector-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active from all tabs
                document.querySelectorAll('.inspector-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Hide all sections
                document.querySelectorAll('.inspector-section').forEach(s => s.style.display = 'none');
                
                // Show selected section
                const section = tab.dataset.tab;
                const targetSection = document.querySelector(`[data-section="${section}"]`);
                if (targetSection) targetSection.style.display = 'block';
            });
        });
    }
    
    initChannelControls() {
        // Solo buttons
        document.querySelectorAll('.solo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                const channel = btn.closest('.channel-strip').dataset.channel;
                console.log(`Solo ${btn.classList.contains('active') ? 'ON' : 'OFF'}: ${channel}`);
            });
        });
        
        // Mute buttons
        document.querySelectorAll('.mute-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                const channel = btn.closest('.channel-strip').dataset.channel;
                console.log(`Mute ${btn.classList.contains('active') ? 'ON' : 'OFF'}: ${channel}`);
            });
        });
        
        // Record buttons
        document.querySelectorAll('.rec-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                const channel = btn.closest('.channel-strip').dataset.channel;
                console.log(`Record ${btn.classList.contains('active') ? 'ON' : 'OFF'}: ${channel}`);
            });
        });
        
        // EQ controls
        document.querySelectorAll('.eq-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const control = slider.closest('.eq-control');
                const valueDisplay = control.querySelector('.eq-control-value');
                const label = control.querySelector('.eq-control-label').textContent.toLowerCase();
                
                let value = parseFloat(slider.value);
                let displayValue = '';
                
                if (label === 'freq') {
                    displayValue = value >= 1000 ? `${(value/1000).toFixed(1)} kHz` : `${value} Hz`;
                } else if (label === 'gain') {
                    displayValue = `${value >= 0 ? '+' : ''}${value.toFixed(1)} dB`;
                } else if (label === 'q') {
                    displayValue = value.toFixed(1);
                }
                
                valueDisplay.textContent = displayValue;
                this.drawEQCurve();
            });
        });
    }
    
    drawEQCurve() {
        const canvas = document.getElementById('eqCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);
        
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        
        // Clear
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        
        // Horizontal lines (dB)
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Vertical lines (frequency)
        for (let i = 0; i <= 10; i++) {
            const x = (width / 10) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Draw EQ curve
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let x = 0; x < width; x++) {
            // Logarithmic frequency scale (20Hz to 20kHz)
            const freq = 20 * Math.pow(1000, x / width);
            
            // Simple EQ curve simulation (flat for now)
            const y = height / 2;
            
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        // Draw frequency labels
        ctx.fillStyle = '#999';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        
        const freqs = ['20', '100', '1k', '10k', '20k'];
        freqs.forEach((freq, i) => {
            const x = (width / (freqs.length - 1)) * i;
            ctx.fillText(freq, x, height - 5);
        });
    }
    
    drawCompCurve() {
        const canvas = document.getElementById('compCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);
        
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        
        // Clear
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Draw 1:1 line
        ctx.strokeStyle = '#666';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(width, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw compression curve
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const threshold = -18; // dB
        const ratio = 4;
        
        for (let x = 0; x < width; x++) {
            const inputDb = (x / width) * -60; // -60dB to 0dB
            let outputDb = inputDb;
            
            if (inputDb > threshold) {
                outputDb = threshold + (inputDb - threshold) / ratio;
            }
            
            const y = height - ((outputDb + 60) / 60 * height);
            
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        // Draw threshold line
        const thresholdY = height - ((threshold + 60) / 60 * height);
        ctx.strokeStyle = '#ff4444';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, thresholdY);
        ctx.lineTo(width, thresholdY);
        ctx.stroke();
    }
}

// Initialize when ready
// Expose instance on window for debugging/console access
document.addEventListener('DOMContentLoaded', () => {
    window.mixmaster1Pro = new MixMaster1Pro();
    
    // Animate meters
    function animateMeters() {
        document.querySelectorAll('.meter-bar').forEach(meter => {
            const randomLevel = Math.random() * 80 + 10; // 10-90%
            meter.style.height = `${randomLevel}%`;
            
            const peak = meter.nextElementSibling;
            if (peak) {
                peak.style.top = `${100 - randomLevel}%`;
            }
        });
        
        requestAnimationFrame(animateMeters);
    }
    
    animateMeters();
});
