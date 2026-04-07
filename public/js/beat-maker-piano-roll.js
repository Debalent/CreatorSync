/**
 * Beat Maker - Piano Roll
 * Melodic note editor with MIDI-style piano roll interface
 */

// Scale intervals (semitone offsets from root, within one octave)
const SCALES = {
  chromatic:  [0,1,2,3,4,5,6,7,8,9,10,11],
  major:      [0,2,4,5,7,9,11],
  minor:      [0,2,3,5,7,8,10],
  pentatonic: [0,2,4,7,9],
  harmonicMinor: [0,2,3,5,7,8,11],
  dorian:     [0,2,3,5,7,9,10],
  mixolydian: [0,2,4,5,7,9,10],
  blues:      [0,3,5,6,7,10]
};

class BeatMakerPianoRoll {
  constructor (engine, ui) {
    this.engine = engine;
    this.ui = ui;

    this.notes = [];
    this.selectedNotes = new Set();
    this.currentTool = 'draw';
    this.snapValue = '1/16';
    this.scale = 'chromatic';
    this.rootNote = 0; // 0=C, 1=C#, 2=D ... 11=B
    this.currentTrack = null;

    this.octaves = 7;
    this.totalNotes = this.octaves * 12;
    this.noteHeight = 20;
    this.noteWidth = 40;
    this.gridWidth = 4000;

    this.isDragging = false;
    this.isResizing = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    this.attachEventListeners();
  }

  /**
   * Initialize piano roll for a track
   */
  open (trackId) {
    this.currentTrack = trackId;
    this.ui.showModal('pianoRollModal');
    this.render();
    this.loadNotesForTrack(trackId);
  }

  /**
   * Attach event listeners
   */
  attachEventListeners () {
    // Tool buttons
    document.getElementById('pianoRollDraw')?.addEventListener('click', () => {
      this.currentTool = 'draw';
      this.updateToolButtons();
    });

    document.getElementById('pianoRollErase')?.addEventListener('click', () => {
      this.currentTool = 'erase';
      this.updateToolButtons();
    });

    document.getElementById('pianoRollSelect')?.addEventListener('click', () => {
      this.currentTool = 'select';
      this.updateToolButtons();
    });

    // Snap and scale
    document.getElementById('pianoRollSnap')?.addEventListener('change', (e) => {
      this.snapValue = e.target.value;
    });

    document.getElementById('pianoRollScale')?.addEventListener('change', (e) => {
      this.scale = e.target.value;
      this.render();
    });

    document.getElementById('pianoRollRoot')?.addEventListener('change', (e) => {
      this.rootNote = parseInt(e.target.value, 10);
      this.render();
    });
  }

  /** Returns the set of in-scale note indices (mod 12) for current scale + root */
  getScaleNoteIndices () {
    const intervals = SCALES[this.scale] || SCALES.chromatic;
    return new Set(intervals.map(i => (i + this.rootNote) % 12));
  }

  /** Snap a MIDI note number to the nearest in-scale note */
  snapNoteToScale (noteNum) {
    if (this.scale === 'chromatic') return noteNum;
    const inScale = this.getScaleNoteIndices();
    if (inScale.has(noteNum % 12)) return noteNum;
    // Search up then down for nearest in-scale note
    for (let delta = 1; delta <= 6; delta++) {
      if (inScale.has((noteNum + delta) % 12)) return noteNum + delta;
      if (inScale.has((noteNum - delta + 120) % 12)) return noteNum - delta;
    }
    return noteNum;
  }

  /**
   * Render piano roll interface
   */
  render () {
    this.renderPianoKeys();
    this.renderGrid();
  }

  /**
   * Render piano keys on the left
   */
  renderPianoKeys () {
    const container = document.getElementById('pianoKeys');
    if (!container) return;

    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const blackKeys = [1, 3, 6, 8, 10];
    const inScale = this.getScaleNoteIndices();

    container.innerHTML = '';

    for (let i = this.totalNotes - 1; i >= 0; i--) {
      const octave = Math.floor(i / 12);
      const noteIndex = i % 12;
      const noteName = noteNames[noteIndex];
      const isBlack = blackKeys.includes(noteIndex);
      const isInScale = inScale.has(noteIndex);
      const isRoot = noteIndex === this.rootNote;

      const keyDiv = document.createElement('div');
      keyDiv.className = [
        'piano-key',
        isBlack ? 'black' : 'white',
        !isInScale && this.scale !== 'chromatic' ? 'out-of-scale' : '',
        isRoot ? 'scale-root' : ''
      ].filter(Boolean).join(' ');
      keyDiv.textContent = `${noteName}${octave}`;
      keyDiv.dataset.note = i;
      keyDiv.title = isRoot ? `${noteName}${octave} (Root)` : `${noteName}${octave}`;

      keyDiv.addEventListener('click', () => {
        this.playPreviewNote(i);
      });

      container.appendChild(keyDiv);
    }
  }

  /**
   * Render the grid canvas
   */
  renderGrid () {
    const container = document.getElementById('pianoRollGrid');
    if (!container) return;

    container.style.width = `${this.gridWidth}px`;
    container.style.height = `${this.totalNotes * this.noteHeight}px`;

    // Paint scale row highlights behind the notes
    this._renderScaleRows(container);

    // Add mouse event listeners (re-add idempotently)
    container.onmousedown = (e) => this.handleMouseDown(e);
    container.onmousemove = (e) => this.handleMouseMove(e);
    container.onmouseup = (e) => this.handleMouseUp(e);

    this.renderNotes();
  }

  _renderScaleRows (container) {
    // Remove old highlights
    container.querySelectorAll('.scale-row, .root-row').forEach(el => el.remove());
    if (this.scale === 'chromatic') return;

    const inScale = this.getScaleNoteIndices();

    for (let i = 0; i < this.totalNotes; i++) {
      const noteIndex = i % 12;
      const isRoot = noteIndex === this.rootNote;
      const isInScale = inScale.has(noteIndex);
      if (!isInScale) continue;

      const row = document.createElement('div');
      row.className = isRoot ? 'root-row' : 'scale-row';
      row.style.position = 'absolute';
      row.style.left = '0';
      row.style.width = `${this.gridWidth}px`;
      row.style.height = `${this.noteHeight}px`;
      row.style.top = `${(this.totalNotes - 1 - i) * this.noteHeight}px`;
      row.style.pointerEvents = 'none';
      container.appendChild(row);
    }
  }

  /**
   * Render all notes
   */
  renderNotes () {
    const container = document.getElementById('pianoRollGrid');
    if (!container) return;

    // Clear existing notes
    container.querySelectorAll('.piano-note').forEach(note => note.remove());

    // Render each note
    this.notes.forEach((note, index) => {
      const noteElement = document.createElement('div');
      noteElement.className = 'piano-note';
      if (this.selectedNotes.has(index)) {
        noteElement.classList.add('selected');
      }

      noteElement.style.left = `${note.start * this.noteWidth}px`;
      noteElement.style.top = `${(this.totalNotes - 1 - note.note) * this.noteHeight}px`;
      noteElement.style.width = `${note.duration * this.noteWidth}px`;
      noteElement.style.height = `${this.noteHeight - 2}px`;

      noteElement.dataset.noteIndex = index;

      container.appendChild(noteElement);
    });
  }

  /**
   * Handle mouse down on grid
   */
  handleMouseDown (e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gridX = Math.floor(x / this.noteWidth);
    const noteNum = this.totalNotes - 1 - Math.floor(y / this.noteHeight);

    if (this.currentTool === 'draw') {
      this.addNote(gridX, noteNum);
    } else if (this.currentTool === 'erase') {
      this.removeNoteAt(gridX, noteNum);
    } else if (this.currentTool === 'select') {
      this.isDragging = true;
      this.dragStartX = x;
      this.dragStartY = y;
    }
  }

  /**
   * Handle mouse move on grid
   */
  handleMouseMove (e) {
    if (this.isDragging && this.currentTool === 'select') {
      // Implement drag selection
    }
  }

  /**
   * Handle mouse up on grid
   */
  handleMouseUp (e) {
    this.isDragging = false;
    this.isResizing = false;
  }

  /**
   * Add a note
   */
  addNote (start, note, duration = 1) {
    // Snap note pitch to the current scale
    const snappedNote = this.snapNoteToScale(note);
    const newNote = {
      start: this.snapToGrid(start),
      note: snappedNote,
      duration,
      velocity: 100
    };

    this.notes.push(newNote);
    this.renderNotes();
    this.scheduleNote(newNote);
  }

  /**
   * Remove note at position
   */
  removeNoteAt (start, note) {
    const snappedStart = this.snapToGrid(start);
    const index = this.notes.findIndex(n =>
      n.start === snappedStart && n.note === note
    );

    if (index !== -1) {
      this.notes.splice(index, 1);
      this.renderNotes();
    }
  }

  /**
   * Snap position to grid
   */
  snapToGrid (position) {
    const divisions = {
      '1/4': 4,
      '1/8': 8,
      '1/16': 16,
      '1/32': 32
    };

    const division = divisions[this.snapValue] || 16;
    return Math.round(position * division) / division;
  }

  /**
   * Schedule note for playback
   */
  scheduleNote (note) {
    if (!this.engine || !this.currentTrack) return;

    const frequency = this.noteToFrequency(note.note);
    const time = `+${note.start}`;
    const duration = note.duration / 4; // Convert to seconds at 120 BPM

    // Use Tone.js to schedule the note
    const synth = new Tone.Synth().toDestination();
    synth.triggerAttackRelease(frequency, duration, time, note.velocity / 127);
  }

  /**
   * Convert MIDI note number to frequency
   */
  noteToFrequency (noteNum) {
    return 440 * Math.pow(2, (noteNum - 69) / 12);
  }

  /**
   * Play preview note
   */
  playPreviewNote (noteNum) {
    const frequency = this.noteToFrequency(noteNum);
    const synth = new Tone.Synth().toDestination();
    synth.triggerAttackRelease(frequency, '8n');
  }

  /**
   * Load notes for a track
   */
  loadNotesForTrack (trackId) {
    // Load notes from engine/database
    this.notes = this.engine.getNotesForTrack?.(trackId) || [];
    this.renderNotes();
  }

  /**
   * Save notes to track
   */
  saveNotes () {
    if (this.currentTrack) {
      this.engine.setNotesForTrack?.(this.currentTrack, this.notes);
    }
  }

  /**
   * Update tool button states
   */
  updateToolButtons () {
    document.getElementById('pianoRollDraw')?.classList.toggle('active', this.currentTool === 'draw');
    document.getElementById('pianoRollErase')?.classList.toggle('active', this.currentTool === 'erase');
    document.getElementById('pianoRollSelect')?.classList.toggle('active', this.currentTool === 'select');
  }

  /**
   * Clear all notes
   */
  clearNotes () {
    if (confirm('Clear all notes?')) {
      this.notes = [];
      this.selectedNotes.clear();
      this.renderNotes();
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BeatMakerPianoRoll;
}

