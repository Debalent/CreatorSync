/**
 * Beat Maker - Main Application
 * Initializes and coordinates the beat maker engine and UI
 */

let beatMaker = null;
let beatMakerUI = null;
let effectsManager = null;
let collaborationManager = null;
let beatMakerProjects = null;
let beatMakerPianoRoll = null;
let beatMakerArrangement = null;
let beatMakerAutomation = null;
let beatMakerMIDI = null;
let beatMakerRecording = null;
let beatMakerRouting = null;
let beatMakerSamples = null;

/**
 * Initialize the beat maker application
 */
async function initializeBeatMaker () {
  try {
    console.log('Initializing Beat Maker...');

    // Create engine instance
    beatMaker = new BeatMakerEngine(); // eslint-disable-line no-undef

    // Initialize audio engine
    await beatMaker.initialize();

    // Create UI instance
    beatMakerUI = new BeatMakerUI(beatMaker); // eslint-disable-line no-undef

    // Create effects manager
    effectsManager = new EffectsManager(beatMaker, beatMakerUI); // eslint-disable-line no-undef

    // Initialize all feature modules
    beatMakerProjects = new BeatMakerProjects(beatMaker, beatMakerUI); // eslint-disable-line no-undef
    beatMakerPianoRoll = new BeatMakerPianoRoll(beatMaker, beatMakerUI); // eslint-disable-line no-undef
    beatMakerArrangement = new BeatMakerArrangement(beatMaker, beatMakerUI); // eslint-disable-line no-undef
    beatMakerAutomation = new BeatMakerAutomation(beatMaker, beatMakerUI); // eslint-disable-line no-undef
    beatMakerMIDI = new BeatMakerMIDI(beatMaker, beatMakerUI); // eslint-disable-line no-undef
    beatMakerRecording = new BeatMakerRecording(beatMaker, beatMakerUI); // eslint-disable-line no-undef
    beatMakerRouting = new BeatMakerRouting(beatMaker, beatMakerUI); // eslint-disable-line no-undef
    beatMakerSamples = new BeatMakerSamples(beatMaker, beatMakerUI); // eslint-disable-line no-undef

    // Check authentication
    await beatMakerUI.checkAuth();

    // Initialize collaboration manager
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');

    if (projectId && beatMakerUI.currentUser) {
      collaborationManager = new CollaborationManager( // eslint-disable-line no-undef
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
    }

    // Setup engine callbacks
    beatMaker.setCallbacks({
      onStep: (step) => {
        updateStepVisualization(step);
      },
      onPlay: () => {
        console.log('Playback started');
        if (collaborationManager) {
          collaborationManager.broadcastPlaybackState(true, beatMaker.currentStep);
        }
      },
      onStop: () => {
        console.log('Playback stopped');
        clearStepVisualization();
        if (collaborationManager) {
          collaborationManager.broadcastPlaybackState(false, 0);
        }
      }
    });

    // Initialize sequencer
    beatMakerUI.initializeSequencer();

    // Load initial samples
    await beatMakerUI.loadSamples();

    // Load default drum samples
    await loadDefaultSamples();

    console.log('Beat Maker initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Beat Maker:', error);
    alert('Failed to initialize Beat Maker. Please refresh the page.');
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
