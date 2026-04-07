/**
 * Beat Maker Collaboration Manager
 * Handles real-time multi-user collaboration
 */

class CollaborationManager {
  constructor (engine, ui) {
    this.engine = engine;
    this.ui = ui;
    this.socket = null;
    this.sessionId = null;
    this.participants = [];
    this.isHost = false;

    this.initializeSocket();
  }

  /**
   * Initialize Socket.IO connection
   */
  initializeSocket () {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.socket = io({
      auth: { token }
    });

    this.attachSocketListeners();
  }

  /**
   * Attach Socket.IO event listeners
   */
  attachSocketListeners () {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to collaboration server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from collaboration server');
    });

    // Collaboration events
    this.socket.on('beatmaker_user_joined', (data) => {
      this.handleUserJoined(data);
    });

    this.socket.on('beatmaker_user_left', (data) => {
      this.handleUserLeft(data);
    });

    this.socket.on('beatmaker_session_state', (data) => {
      this.handleSessionState(data);
    });

    this.socket.on('beatmaker_project_updated', (data) => {
      this.handleProjectUpdate(data);
    });

    this.socket.on('beatmaker_track_updated', (data) => {
      this.handleTrackUpdate(data);
    });

    this.socket.on('beatmaker_pattern_updated', (data) => {
      this.handlePatternUpdate(data);
    });

    this.socket.on('beatmaker_effect_updated', (data) => {
      this.handleEffectUpdate(data);
    });

    this.socket.on('beatmaker_playback_synced', (data) => {
      this.handlePlaybackSync(data);
    });
  }

  /**
   * Join a collaboration session
   */
  joinSession (projectId) {
    if (!this.socket) {
      console.error('Socket not initialized');
      return false;
    }

    this.sessionId = projectId;

    this.socket.emit('beatmaker_join_session', {
      projectId,
      timestamp: new Date()
    });

    return true;
  }

  /**
   * Leave current collaboration session
   */
  leaveSession () {
    if (!this.socket || !this.sessionId) return;

    this.socket.emit('beatmaker_leave_session', this.sessionId);
    this.sessionId = null;
    this.participants = [];
  }

  /**
   * Broadcast project update to all participants
   */
  broadcastProjectUpdate (updates) {
    if (!this.socket || !this.sessionId) return;

    this.socket.emit('beatmaker_project_update', {
      projectId: this.sessionId,
      updates,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast track update
   */
  broadcastTrackUpdate (trackId, updates) {
    if (!this.socket || !this.sessionId) return;

    this.socket.emit('beatmaker_track_update', {
      projectId: this.sessionId,
      trackId,
      updates,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast pattern update
   */
  broadcastPatternUpdate (patternId, steps) {
    if (!this.socket || !this.sessionId) return;

    this.socket.emit('beatmaker_pattern_update', {
      projectId: this.sessionId,
      patternId,
      steps,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast effect update
   */
  broadcastEffectUpdate (trackId, effectId, params) {
    if (!this.socket || !this.sessionId) return;

    this.socket.emit('beatmaker_effect_update', {
      projectId: this.sessionId,
      trackId,
      effectId,
      params,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast playback state
   */
  broadcastPlaybackState (isPlaying, currentTime) {
    if (!this.socket || !this.sessionId) return;

    this.socket.emit('beatmaker_playback_state', {
      projectId: this.sessionId,
      isPlaying,
      currentTime,
      timestamp: new Date()
    });
  }

  /**
   * Handle user joined event
   */
  handleUserJoined (data) {
    console.log('User joined:', data.username);

    this.participants.push({
      userId: data.userId,
      username: data.username
    });

    this.updateParticipantsList();
    this.showNotification(`${data.username} joined the session`);
  }

  /**
   * Handle user left event
   */
  handleUserLeft (data) {
    console.log('User left:', data.userId);

    this.participants = this.participants.filter(p => p.userId !== data.userId);
    this.updateParticipantsList();
    this.showNotification('A user left the session');
  }

  /**
   * Handle session state
   */
  handleSessionState (data) {
    this.participants = data.participants;
    this.updateParticipantsList();
  }

  /**
   * Handle project update from other user
   */
  handleProjectUpdate (data) {
    if (data.userId === this.getCurrentUserId()) return; // Ignore own updates

    // Apply updates to local project
    Object.keys(data.updates).forEach(key => {
      if (key === 'bpm') {
        this.engine.setBPM(data.updates.bpm);
        this.ui.elements.bpmInput.value = data.updates.bpm;
      } else if (key === 'name') {
        this.ui.elements.projectTitle.textContent = data.updates.name;
      }
    });

    this.showNotification('Project updated by collaborator');
  }

  /**
   * Handle track update from other user
   */
  handleTrackUpdate (data) {
    if (data.userId === this.getCurrentUserId()) return;

    this.engine.updateTrack(data.trackId, data.updates);
    this.showNotification('Track updated by collaborator');
  }

  /**
   * Handle pattern update from other user
   */
  handlePatternUpdate (data) {
    if (data.userId === this.getCurrentUserId()) return;

    const pattern = this.engine.patterns.find(p => p.id === data.patternId);
    if (pattern) {
      pattern.steps = data.steps;
      this.ui.renderSequencerGrid();
    }

    this.showNotification('Pattern updated by collaborator');
  }

  /**
   * Handle effect update from other user
   */
  handleEffectUpdate (data) {
    if (data.userId === this.getCurrentUserId()) return;

    this.engine.updateEffect(data.trackId, data.effectId, data.params);
    this.showNotification('Effect updated by collaborator');
  }

  /**
   * Handle playback sync from other user
   */
  handlePlaybackSync (data) {
    if (data.userId === this.getCurrentUserId()) return;

    if (data.isPlaying && !this.engine.isPlaying) {
      // Sync playback position
      this.engine.transport.position = data.currentTime;
      this.engine.play();
    } else if (!data.isPlaying && this.engine.isPlaying) {
      this.engine.pause();
    }
  }

  /**
   * Update participants list in UI
   */
  updateParticipantsList () {
    // Use the UI manager to render participants
    if (this.ui && typeof this.ui.renderParticipants === 'function') {
      const participantData = this.participants.map(p => ({
        userId: p.userId,
        username: p.username,
        isActive: true
      }));
      this.ui.renderParticipants(participantData);
    }
  }

  /**
   * Show notification toast
   */
  showNotification (message) {
    if (this.ui && typeof this.ui.showCollaborationToast === 'function') {
      this.ui.showCollaborationToast(message);
    } else {
      console.log('Collaboration:', message);
    }
  }

  /**
   * Get current user ID
   */
  getCurrentUserId () {
    return this.ui.currentUser?.userId;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CollaborationManager;
}
