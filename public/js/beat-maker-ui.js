/**
 * Beat Maker UI Controller
 * Handles all UI interactions and updates
 */

class BeatMakerUI {
  constructor (engine) {
    this.engine = engine;
    this.currentUser = null;
    this.currentProjectId = null;
    this.hasSubscription = false;

    // DOM elements
    this.elements = {};

    this.initializeElements();
    this.attachEventListeners();
  }

  /**
   * Initialize DOM element references
   */
  initializeElements () {
    this.elements = {
      // Navigation
      projectTitle: document.getElementById('projectTitle'),
      btnPlay: document.getElementById('btnPlay'),
      btnStop: document.getElementById('btnStop'),
      btnRecord: document.getElementById('btnRecord'),
      btnLoop: document.getElementById('btnLoop'),
      bpmInput: document.getElementById('bpmInput'),
      btnTap: document.getElementById('btnTap'),
      btnSave: document.getElementById('btnSave'),
      btnExport: document.getElementById('btnExport'),
      btnSettings: document.getElementById('btnSettings'),
      subscriptionGate: document.getElementById('subscriptionGate'),

      // Samples
      samplesList: document.getElementById('samplesList'),
      samplesSearch: document.getElementById('samplesSearch'),
      categoryFilter: document.getElementById('categoryFilter'),
      btnRefreshSamples: document.getElementById('btnRefreshSamples'),
      btnTestLoad: document.getElementById('btnTestLoad'),
      packsList: document.getElementById('packsList'),

      // Sequencer
      sequencerGrid: document.getElementById('sequencerGrid'),
      btnAddPattern: document.getElementById('btnAddPattern'),
      patternSelect: document.getElementById('patternSelect'),
      patternLength: document.getElementById('patternLength'),

      // Timeline
      timelineRuler: document.getElementById('timelineRuler'),
      timelineTracks: document.getElementById('timelineTracks'),
      btnAddTrack: document.getElementById('btnAddTrack'),
      btnZoomIn: document.getElementById('btnZoomIn'),
      btnZoomOut: document.getElementById('btnZoomOut'),

      // Mixer
      mixerTracks: document.getElementById('mixerTracks'),
      masterVolume: document.getElementById('masterVolume'),
      masterMeter: document.getElementById('masterMeter'),

      // Modals
      saveModal: document.getElementById('saveModal'),
      exportModal: document.getElementById('exportModal'),
      subscriptionModal: document.getElementById('subscriptionModal')
    };
  }

  /**
   * Attach event listeners
   */
  attachEventListeners () {
    // Transport controls
    this.elements.btnPlay?.addEventListener('click', () => this.togglePlayback());
    this.elements.btnStop?.addEventListener('click', () => this.stop());
    this.elements.bpmInput?.addEventListener('change', (e) => this.setBPM(e.target.value));
    this.elements.btnTap?.addEventListener('click', () => this.tapTempo());

    // Project controls
    this.elements.btnSave?.addEventListener('click', () => this.showSaveModal());
    this.elements.btnExport?.addEventListener('click', () => this.showExportModal());

    // Samples
    this.elements.btnRefreshSamples?.addEventListener('click', () => this.loadSamples());
    this.elements.btnTestLoad?.addEventListener('click', () => {
      alert('Test button clicked! Loading drum samples...');
      this.loadSamples('drum', '');
    });
    this.elements.samplesSearch?.addEventListener('input', (e) => this.filterSamples(e.target.value));
    this.elements.categoryFilter?.addEventListener('change', (e) => this.filterByCategory(e.target.value));

    // Sequencer
    this.elements.btnAddPattern?.addEventListener('click', () => this.addPattern());
    this.elements.patternLength?.addEventListener('change', (e) => this.changePatternLength(e.target.value));

    // Timeline
    this.elements.btnAddTrack?.addEventListener('click', () => this.addTrack());
    this.elements.btnZoomIn?.addEventListener('click', () => this.zoomTimeline(1.2));
    this.elements.btnZoomOut?.addEventListener('click', () => this.zoomTimeline(0.8));

    // Master volume
    this.elements.masterVolume?.addEventListener('input', (e) => {
      const volume = e.target.value / 100;
      this.engine.setMasterVolume(volume);
    });

    // Modal close buttons
    document.querySelectorAll('.btn-close, [data-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.modal || btn.closest('.modal')?.id;
        if (modalId) this.closeModal(modalId);
      });
    });

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });
  }

  /**
   * Check user authentication and subscription
   */
  async checkAuth () {
    const token = localStorage.getItem('token');
    if (!token) {
      this.currentUser = null;
      this.hasSubscription = false;
      this.updateSubscriptionGate();
      return false;
    }

    try {
      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.currentUser = data.user;
        this.hasSubscription = ['premium', 'professional'].includes(data.user.subscription);
        this.updateSubscriptionGate();
        return true;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }

    return false;
  }

  /**
   * Update subscription gate visibility
   */
  updateSubscriptionGate () {
    if (this.elements.subscriptionGate) {
      this.elements.subscriptionGate.style.display = this.hasSubscription ? 'none' : 'flex';
    }
  }

/**
   * Load samples from API
   */
  async loadSamples (category = '', search = '') {
    console.log('🔍 loadSamples called:', { category, search, samplesList: this.elements.samplesList });
    
    if (!this.elements.samplesList) {
      console.error('❌ samplesList element not found!');
      alert('Error: Sample list container not found');
      return;
    }
    
    try {
      // Show loading state
      if (this.elements.samplesList) {
        this.elements.samplesList.innerHTML = '<div class="sample-loading"><i class="fas fa-spinner fa-spin"></i><p>Loading samples...</p></div>';
        console.log('✅ Loading indicator set');
      }

      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);

      const url = `/api/beat-maker/samples?${params}`;
      console.log('🌐 Fetching:', url);
      
      const response = await fetch(url);
      console.log('📥 Response:', response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Data:', data);

      if (data.success && data.samples) {
        this.renderSamples(data.samples);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('💥 Error:', error);
      if (this.elements.samplesList) {
        this.elements.samplesList.innerHTML = `<div class="sample-loading"><i class="fas fa-exclamation-triangle"></i><p>Failed to load samples: ${error.message}</p></div>`;
      }
      this.showError(`Failed to load samples: ${error.message}`);
    }
  }

  /**
   * Render samples list
   */
  renderSamples (samples) {
    if (!this.elements.samplesList) return;

    if (samples.length === 0) {
      this.elements.samplesList.innerHTML = '<div class="sample-loading"><p>No samples found</p></div>';
      return;
    }

    this.elements.samplesList.innerHTML = samples.map(sample => `
      <div class="sample-item" draggable="true" data-sample-id="${sample._id}" data-sample-url="${sample.fileUrl}">
        <div class="sample-name">${sample.name}</div>
        <div class="sample-meta">
          <span>${sample.category}</span>
          <span>${sample.duration.toFixed(2)}s</span>
        </div>
      </div>
    `).join('');

    // Add drag event listeners
    this.elements.samplesList.querySelectorAll('.sample-item').forEach(item => {
      item.addEventListener('dragstart', (e) => this.onSampleDragStart(e));
      item.addEventListener('click', (e) => this.onSampleClick(e));
    });
  }

  /**
   * Handle sample drag start
   */
  onSampleDragStart (e) {
    const sampleId = e.target.dataset.sampleId;
    const sampleUrl = e.target.dataset.sampleUrl;
    e.dataTransfer.setData('sampleId', sampleId);
    e.dataTransfer.setData('sampleUrl', sampleUrl);
    e.target.classList.add('dragging');
  }

  /**
   * Handle sample click (preview)
   */
  async onSampleClick (e) {
    const item = e.target.closest('.sample-item');
    if (!item) return;

    const sampleId = item.dataset.sampleId;
    const sampleUrl = item.dataset.sampleUrl;

    // Load and play sample
    await this.engine.loadSample(sampleId, sampleUrl);
    this.engine.playSample(sampleId);
  }

  /**
   * Filter samples by search
   */
  filterSamples (search) {
    const category = this.elements.categoryFilter?.value || '';
    this.loadSamples(category, search);
  }

  /**
   * Filter samples by category
   */
  filterByCategory (category) {
    const search = this.elements.samplesSearch?.value || '';
    this.loadSamples(category, search);
  }

  /**
   * Initialize sequencer grid
   */
  initializeSequencer () {
    const pattern = this.engine.currentPattern;
    if (!pattern) {
      // Create default pattern
      this.engine.createPattern('pattern1', 'Pattern 1', 16);
      this.engine.setActivePattern('pattern1');
      this.renderSequencerGrid();
    } else {
      this.renderSequencerGrid();
    }
  }

  /**
   * Render sequencer grid
   */
  renderSequencerGrid () {
    if (!this.elements.sequencerGrid) return;

    const pattern = this.engine.currentPattern;
    if (!pattern) return;

    // For now, create a simple 4-row drum pattern
    const drumTracks = [
      { name: 'Kick', sampleId: 'kick' },
      { name: 'Snare', sampleId: 'snare' },
      { name: 'Hi-Hat', sampleId: 'hihat' },
      { name: 'Clap', sampleId: 'clap' }
    ];

    this.elements.sequencerGrid.innerHTML = drumTracks.map((track, trackIndex) => {
      const steps = Array.from({ length: pattern.length }, (_, stepIndex) => {
        const isActive = pattern.steps[trackIndex]?.[stepIndex] || false;
        return `<div class="sequencer-step ${isActive ? 'active' : ''}"
                     data-track="${trackIndex}"
                     data-step="${stepIndex}"></div>`;
      }).join('');

      return `
        <div class="sequencer-row">
          <div class="sequencer-label">${track.name}</div>
          <div class="sequencer-steps">${steps}</div>
        </div>
      `;
    }).join('');

    // Make sure pattern has track assignments
    if (pattern.tracks.length === 0) {
      pattern.tracks = drumTracks.map(t => t.sampleId);
    }

    // Add click listeners
    this.elements.sequencerGrid.querySelectorAll('.sequencer-step').forEach(step => {
      step.addEventListener('click', (e) => this.toggleSequencerStep(e));
    });
  }

  /**
   * Toggle sequencer step
   */
  toggleSequencerStep (e) {
    const step = e.target;
    const trackIndex = parseInt(step.dataset.track);
    const stepIndex = parseInt(step.dataset.step);

    const isActive = this.engine.toggleStep(this.engine.currentPattern.id, trackIndex, stepIndex);
    step.classList.toggle('active', isActive);
  }

  /**
   * Add new pattern
   */
  addPattern () {
    const patternId = `pattern${this.engine.patterns.length + 1}`;
    const pattern = this.engine.createPattern(patternId, `Pattern ${this.engine.patterns.length + 1}`, 16);

    // Add to pattern select
    const option = document.createElement('option');
    option.value = patternId;
    option.textContent = pattern.name;
    this.elements.patternSelect?.appendChild(option);
  }

  /**
   * Add new track
   */
  addTrack () {
    const trackId = `track${this.engine.tracks.length + 1}`;
    const track = this.engine.createTrack(trackId, `Track ${this.engine.tracks.length + 1}`, 'audio');

    this.renderMixerChannel(track);
  }

  /**
   * Render mixer channel
   */
  renderMixerChannel (track) {
    if (!this.elements.mixerTracks) return;

    const channelHtml = `
      <div class="mixer-channel" data-track-id="${track.id}">
        <div class="channel-header">
          <div class="channel-name">${track.name}</div>
          <div class="channel-buttons">
            <button class="btn-mute ${track.mute ? 'active' : ''}" title="Mute">M</button>
            <button class="btn-solo ${track.solo ? 'active' : ''}" title="Solo">S</button>
          </div>
        </div>
        <div class="channel-controls">
          <div class="fader-container">
            <input type="range" class="vertical-fader" min="0" max="100" value="${track.volume * 100}" orient="vertical">
            <span class="fader-label">${Math.round(track.volume * 100)}%</span>
          </div>
          <div class="level-meter">
            <div class="meter-bar"></div>
          </div>
        </div>
      </div>
    `;

    this.elements.mixerTracks.insertAdjacentHTML('beforeend', channelHtml);
  }

  /**
   * Toggle playback
   */
  togglePlayback () {
    if (this.engine.isPlaying) {
      this.engine.pause();
      this.elements.btnPlay?.classList.remove('playing');
    } else {
      this.engine.play();
      this.elements.btnPlay?.classList.add('playing');
    }
  }

  /**
   * Stop playback
   */
  stop () {
    this.engine.stop();
    this.elements.btnPlay?.classList.remove('playing');
  }

  /**
   * Set BPM
   */
  setBPM (bpm) {
    const value = parseInt(bpm);
    if (value >= 40 && value <= 240) {
      this.engine.setBPM(value);
    }
  }

  /**
   * Tap tempo implementation
   */
  tapTempo () {
    // TODO: Implement tap tempo logic
    console.log('Tap tempo clicked');
  }

  /**
   * Show save modal
   */
  showSaveModal () {
    if (!this.hasSubscription) {
      this.showModal('subscriptionModal');
      return;
    }

    this.showModal('saveModal');
  }

  /**
   * Show export modal
   */
  showExportModal () {
    if (!this.hasSubscription) {
      this.showModal('subscriptionModal');
      return;
    }

    this.showModal('exportModal');
  }

  /**
   * Show modal
   */
  showModal (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
    }
  }

  /**
   * Close modal
   */
  closeModal (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
    }
  }

  /**
   * Switch tab
   */
  switchTab (tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      const contentId = content.id;
      content.classList.toggle('active', contentId === `${tabName}Tab`);
    });
  }

  /**
   * Zoom timeline
   */
  zoomTimeline (factor) {
    // TODO: Implement timeline zoom
    console.log('Zoom timeline:', factor);
  }

  /**
   * Show error message
   */
  showError (message) {
    // TODO: Implement proper error toast/notification
    alert(message);
  }

  /**
   * Show success message
   */
  showSuccess (message) {
    // TODO: Implement proper success toast/notification
    console.log('Success:', message);
  }

  /**
   * Render participants list for collaboration
   */
  renderParticipants (participants) {
    const panel = document.getElementById('participantsPanel');
    const list = document.getElementById('participantsList');
    const count = document.getElementById('participantCount');

    if (!panel || !list || !count) return;

    // Show panel if there are participants
    if (participants.length > 0) {
      panel.style.display = 'block';
      count.textContent = participants.length;

      // Clear and rebuild list
      list.innerHTML = '';
      participants.forEach(participant => {
        const item = document.createElement('div');
        item.className = 'participant-item';
        item.innerHTML = `
          <div class="participant-avatar">
            <i class="fas fa-user"></i>
          </div>
          <div class="participant-name">${participant.username}</div>
          <div class="participant-status ${participant.isActive ? 'online' : 'offline'}">
            ${participant.isActive ? 'Active' : 'Away'}
          </div>
        `;
        list.appendChild(item);
      });
    } else {
      panel.style.display = 'none';
    }
  }

  /**
   * Show collaboration toast notification
   */
  showCollaborationToast (message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'collaboration-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Hide and remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BeatMakerUI;
}

