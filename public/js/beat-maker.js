/**
 * Beat Maker - Main Application
 * Initializes and coordinates the beat maker engine and UI
 */

let beatMaker = null;
let beatMakerUI = null;
// eslint-disable-next-line no-unused-vars
let effectsManager = null;
let collaborationManager = null;
// eslint-disable-next-line no-unused-vars
let beatMakerProjects = null;
// eslint-disable-next-line no-unused-vars
let beatMakerPianoRoll = null;
// eslint-disable-next-line no-unused-vars
let beatMakerArrangement = null;
// eslint-disable-next-line no-unused-vars
let beatMakerAutomation = null;
// eslint-disable-next-line no-unused-vars
let beatMakerMIDI = null;
// eslint-disable-next-line no-unused-vars
let beatMakerRecording = null;
// eslint-disable-next-line no-unused-vars
let beatMakerRouting = null;
// eslint-disable-next-line no-unused-vars
let beatMakerSamples = null;

/**
 * Wait for Tone.js to load
 */
async function waitForTone () {
  return new Promise((resolve) => {
    if (typeof Tone !== 'undefined') {
      resolve();
    } else {
      const checkInterval = setInterval(() => {
        if (typeof Tone !== 'undefined') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    }
  });
}

/**
 * Initialize the beat maker application
 */
async function initializeBeatMaker () {
  try {
    console.log('Initializing Beat Maker...');

    // Wait for Tone.js to load
    await waitForTone();
    console.log('Tone.js loaded successfully');

    // Create engine instance
    beatMaker = new BeatMakerEngine();

    // Initialize audio engine
    console.log('🎵 Initializing audio engine...');
    try {
      await beatMaker.initialize();
      console.log('✅ Audio engine initialized');
    } catch (engineError) {
      console.error('❌ Engine initialization failed:', engineError);
      throw new Error(`Audio engine failed: ${engineError.message}`);
    }

    // Create UI instance
    beatMakerUI = new BeatMakerUI(beatMaker);

    // Check authentication
    await beatMakerUI.checkAuth();

    // Initialize all feature modules (wrap in try-catch for optional modules)
    try {
      effectsManager = new EffectsManager(beatMaker, beatMakerUI);
    } catch (e) {
      console.warn('EffectsManager not available:', e.message);
    }

    try {
      beatMakerProjects = new BeatMakerProjects(beatMaker, beatMakerUI);
    } catch (e) {
      console.warn('BeatMakerProjects not available:', e.message);
    }

    try {
      beatMakerPianoRoll = new BeatMakerPianoRoll(beatMaker, beatMakerUI);
    } catch (e) {
      console.warn('BeatMakerPianoRoll not available:', e.message);
    }

    try {
      beatMakerArrangement = new BeatMakerArrangement(beatMaker, beatMakerUI);
    } catch (e) {
      console.warn('BeatMakerArrangement not available:', e.message);
    }

    try {
      beatMakerAutomation = new BeatMakerAutomation(beatMaker, beatMakerUI);
    } catch (e) {
      console.warn('BeatMakerAutomation not available:', e.message);
    }

    try {
      beatMakerMIDI = new BeatMakerMIDI(beatMaker, beatMakerUI);
    } catch (e) {
      console.warn('BeatMakerMIDI not available:', e.message);
    }

    try {
      beatMakerRecording = new BeatMakerRecording(beatMaker, beatMakerUI);
    } catch (e) {
      console.warn('BeatMakerRecording not available:', e.message);
    }

    try {
      beatMakerRouting = new BeatMakerRouting(beatMaker, beatMakerUI);
    } catch (e) {
      console.warn('BeatMakerRouting not available:', e.message);
    }

    try {
      beatMakerSamples = new BeatMakerSamples(beatMaker, beatMakerUI);
    } catch (e) {
      console.warn('BeatMakerSamples not available:', e.message);
    }

    // Initialize collaboration manager (optional)
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');

    if (projectId && beatMakerUI.currentUser) {
      try {
        collaborationManager = new CollaborationManager(
          beatMaker,
          beatMakerUI,
          projectId,
          beatMakerUI.currentUser
        );

        // Setup collaboration callbacks
        collaborationManager.onUserJoined = (user) => {
          console.log('User joined collaboration:', user.username);
        };

        collaborationManager.onUserLeft = (user) => {
          console.log('User left collaboration:', user.username);
        };

        collaborationManager.onProjectUpdated = (update) => {
          console.log('Project updated by:', update.userId);
        };

        // Join the collaboration session
        await collaborationManager.joinSession();
      } catch (e) {
        console.warn('Collaboration not available:', e.message);
      }
    }

    // Setup engine callbacks
    beatMaker.setCallbacks({
      onStep: (step) => {
        updateStepVisualization(step);
      },
      onPlay: async () => {
        // Start audio context on first play (requires user gesture)
        await Tone.start();
        console.log('Playback started');
        updatePlayButtonState(true);
        if (collaborationManager) {
          collaborationManager.broadcastPlaybackState(true, beatMaker.currentStep);
        }
      },
      onStop: () => {
        console.log('Playback stopped');
        clearStepVisualization();
        updatePlayButtonState(false);
        if (collaborationManager) {
          collaborationManager.broadcastPlaybackState(false, 0);
        }
      }
    });

    // Setup transport controls
    setupTransportControls();

    // Initialize sequencer
    beatMakerUI.initializeSequencer();

    // Initialize resize system
    if (typeof BeatMakerResize !== 'undefined') {
      window.beatMakerResize = new BeatMakerResize();
      console.log('✅ Panel resize system initialized');
    }

    // Load initial samples - start with drums
    console.log('🎯 About to call loadSamples...', { beatMakerUI, hasLoadSamples: typeof beatMakerUI.loadSamples });
    await beatMakerUI.loadSamples('drum', '');
    console.log('🎯 loadSamples call completed');

    // Load default drum samples into engine
    try {
      await loadDefaultSamples();
    } catch (e) {
      console.warn('Could not load default samples:', e.message);
    }

    console.log('Beat Maker initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Beat Maker:', error);
    // Show more detailed error message
    const errorDetails = error.stack || error.message || 'Unknown error';
    alert(`Failed to initialize Beat Maker.\n\nError: ${errorDetails}\n\nPlease check the browser console for details and refresh the page.`);
  }
}

/**
 * Load default drum samples
 */
async function loadDefaultSamples () {
  // For now, use placeholder URLs - these would be replaced with actual sample URLs
  const defaultSamples = [
    { id: 'kick', url: '/uploads/samples/kick.wav' },
    { id: 'snare', url: '/uploads/samples/snare.wav' },
    { id: 'hihat', url: '/uploads/samples/hihat.wav' },
    { id: 'clap', url: '/uploads/samples/clap.wav' }
  ];

  for (const sample of defaultSamples) {
    try {
      await beatMaker.loadSample(sample.id, sample.url);
    } catch (error) {
      console.warn(`Failed to load sample ${sample.id}:`, error);
    }
  }
}

/**
 * Update step visualization during playback
 */
function updateStepVisualization (currentStep) {
  // Remove previous playing indicators
  document.querySelectorAll('.sequencer-step.playing').forEach(step => {
    step.classList.remove('playing');
  });

  // Add playing indicator to current step
  document.querySelectorAll(`.sequencer-step[data-step="${currentStep}"]`).forEach(step => {
    step.classList.add('playing');
  });
}

/**
 * Clear step visualization
 */
function clearStepVisualization () {
  document.querySelectorAll('.sequencer-step.playing').forEach(step => {
    step.classList.remove('playing');
  });
}

/**
 * Setup transport control buttons
 */
function setupTransportControls () {
  const playBtn = document.getElementById('btnPlay');
  const stopBtn = document.getElementById('btnStop');
  const recordBtn = document.getElementById('btnRecord');
  const loopBtn = document.getElementById('btnLoop');
  const bpmInput = document.getElementById('bpmInput');
  const tapBtn = document.getElementById('btnTap');

  // Play/Pause button
  if (playBtn) {
    playBtn.addEventListener('click', async () => {
      if (beatMaker.isPlaying) {
        beatMaker.pause();
      } else {
        await Tone.start(); // Ensure audio context is started
        beatMaker.play();
      }
    });
  }

  // Stop button
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      beatMaker.stop();
    });
  }

  // Loop button (toggle)
  if (loopBtn) {
    loopBtn.addEventListener('click', () => {
      Tone.Transport.loop = !Tone.Transport.loop;
      loopBtn.classList.toggle('active', Tone.Transport.loop);
      
      if (Tone.Transport.loop) {
        // Set loop points based on current pattern
        const pattern = beatMaker.currentPattern;
        if (pattern) {
          const loopLength = `${pattern.length * 4}n`; // 4 = 16th notes per quarter note
          Tone.Transport.loopEnd = loopLength;
          Tone.Transport.loopStart = 0;
        }
      }
    });
    // Enable loop by default
    Tone.Transport.loop = true;
    loopBtn.classList.add('active');
    if (beatMaker.currentPattern) {
      const loopLength = `${beatMaker.currentPattern.length * 4}n`;
      Tone.Transport.loopEnd = loopLength;
      Tone.Transport.loopStart = 0;
    }
  }

  // Record button (placeholder for future)
  if (recordBtn) {
    recordBtn.addEventListener('click', () => {
      console.log('Recording not yet implemented');
    });
  }

  // BPM input
  if (bpmInput) {
    bpmInput.addEventListener('change', () => {
      const bpm = parseInt(bpmInput.value);
      if (bpm >= 40 && bpm <= 240) {
        beatMaker.setBPM(bpm);
      }
    });
  }

  // Tap tempo (placeholder)
  if (tapBtn) {
    let tapTimes = [];
    tapBtn.addEventListener('click', () => {
      const now = Date.now();
      tapTimes.push(now);
      
      // Keep only last 4 taps
      if (tapTimes.length > 4) {
        tapTimes.shift();
      }
      
      // Calculate average BPM from taps
      if (tapTimes.length >= 2) {
        const intervals = [];
        for (let i = 1; i < tapTimes.length; i++) {
          intervals.push(tapTimes[i] - tapTimes[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
        const bpm = Math.round(60000 / avgInterval);
        
        if (bpm >= 40 && bpm <= 240) {
          beatMaker.setBPM(bpm);
          if (bpmInput) bpmInput.value = bpm;
        }
      }
      
      // Reset after 2 seconds of inactivity
      setTimeout(() => {
        if (Date.now() - now > 2000) {
          tapTimes = [];
        }
      }, 2000);
    });
  }
}

/**
 * Update play button visual state
 */
function updatePlayButtonState (isPlaying) {
  const playBtn = document.getElementById('btnPlay');
  if (playBtn) {
    const icon = playBtn.querySelector('i');
    if (icon) {
      if (isPlaying) {
        icon.className = 'fas fa-pause';
        playBtn.classList.add('playing');
      } else {
        icon.className = 'fas fa-play';
        playBtn.classList.remove('playing');
      }
    }
  }
}

/**
 * Broadcast pattern update to collaborators
 */
function broadcastPatternUpdate (trackId, pattern) {
  if (collaborationManager) {
    collaborationManager.broadcastPatternUpdate(trackId, pattern);
  }
}

/**
 * Broadcast track update to collaborators
 */
function broadcastTrackUpdate (trackId, updates) {
  if (collaborationManager) {
    collaborationManager.broadcastTrackUpdate(trackId, updates);
  }
}

/**
 * Broadcast effect update to collaborators
 */
function broadcastEffectUpdate (trackId, effectId, params) {
  if (collaborationManager) {
    collaborationManager.broadcastEffectUpdate(trackId, effectId, params);
  }
}

/**
 * Save project
 */
async function saveProject () {
  if (!beatMakerUI.hasSubscription) {
    beatMakerUI.showModal('subscriptionModal');
    return;
  }

  const projectName = document.getElementById('saveProjectName')?.value;
  const projectGenre = document.getElementById('saveProjectGenre')?.value;
  const projectTags = document.getElementById('saveProjectTags')?.value;
  const isPublic = document.getElementById('saveProjectPublic')?.checked;

  if (!projectName) {
    beatMakerUI.showError('Please enter a project name');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const projectState = beatMaker.exportState();

    const response = await fetch('/api/beat-maker/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: projectName,
        bpm: projectState.bpm,
        timeSignature: projectState.timeSignature,
        tracks: projectState.tracks,
        patterns: projectState.patterns,
        genre: projectGenre,
        tags: projectTags ? projectTags.split(',').map(t => t.trim()) : [],
        isPublic: isPublic
      })
    });

    const data = await response.json();

    if (data.success) {
      beatMakerUI.currentProjectId = data.project._id;
      beatMakerUI.elements.projectTitle.textContent = projectName;
      beatMakerUI.closeModal('saveModal');
      beatMakerUI.showSuccess('Project saved successfully');
    } else if (data.requiresSubscription) {
      beatMakerUI.closeModal('saveModal');
      beatMakerUI.showModal('subscriptionModal');
    } else {
      beatMakerUI.showError(data.error || 'Failed to save project');
    }
  } catch (error) {
    console.error('Save failed:', error);
    beatMakerUI.showError('Failed to save project');
  }
}

/**
 * Export project
 */
async function exportProject () {
  if (!beatMakerUI.hasSubscription) {
    beatMakerUI.showModal('subscriptionModal');
    return;
  }

  const format = document.getElementById('exportFormat')?.value;
  const sampleRate = document.getElementById('exportSampleRate')?.value;
  const bitDepth = document.getElementById('exportBitDepth')?.value;

  try {
    // This would trigger server-side rendering
    beatMakerUI.showSuccess('Export functionality coming in Phase 2');
    beatMakerUI.closeModal('exportModal');
  } catch (error) {
    console.error('Export failed:', error);
    beatMakerUI.showError('Failed to export project');
  }
}

/**
 * Keyboard shortcuts
 */
document.addEventListener('keydown', (e) => {
  // Space bar - Play/Pause
  if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
    beatMakerUI.togglePlayback();
  }

  // Escape - Stop
  if (e.code === 'Escape') {
    beatMakerUI.stop();
  }

  // Ctrl/Cmd + S - Save
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
    e.preventDefault();
    beatMakerUI.showSaveModal();
  }

  // Ctrl/Cmd + E - Export
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyE') {
    e.preventDefault();
    beatMakerUI.showExportModal();
  }
});

/**
 * Save button handler
 */
document.getElementById('btnConfirmSave')?.addEventListener('click', saveProject);

/**
 * Export button handler
 */
document.getElementById('btnConfirmExport')?.addEventListener('click', exportProject);

/**
 * Initialize on page load
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeBeatMaker);
} else {
  initializeBeatMaker();
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
  if (beatMaker) {
    beatMaker.dispose();
  }
});

