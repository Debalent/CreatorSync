/**
 * Beat Maker - Arrangement View
 * Timeline-based arrangement for full song composition
 */

class BeatMakerArrangement {
  constructor (engine, ui) {
    this.engine = engine;
    this.ui = ui;
    this.tracks = [];
    this.clips = [];
    this.selectedClips = new Set();
    this.gridResolution = 'bar';
    this.playheadPosition = 0;

    // Available track colors (FL Studio palette-style)
    this.trackColors = [
      '#ff006e', '#6c5ce7', '#00b894', '#fdcb6e',
      '#e17055', '#74b9ff', '#a29bfe', '#55efc4',
      '#d63031', '#0984e3', '#00cec9', '#e84393'
    ];

    this.attachEventListeners();
  }

  open () {
    this.ui.showModal('arrangementModal');
    this.render();
  }

  attachEventListeners () {
    document.getElementById('arrangementAddTrack')?.addEventListener('click', () => {
      this.addTrack();
    });

    document.getElementById('arrangementGrid')?.addEventListener('change', (e) => {
      this.gridResolution = e.target.value;
      this.render();
    });
  }

  render () {
    this.renderTracks();
    this.renderTimeline();
  }

  renderTracks () {
    const container = document.getElementById('arrangementTracks');
    if (!container) return;

    container.innerHTML = this.tracks.map((track, index) => `
      <div class="arrangement-track-header" data-track="${index}" style="border-left: 4px solid ${track.color || '#6c5ce7'}">
        <span class="track-color-dot" style="background:${track.color || '#6c5ce7'}" title="Change color" onclick="beatMakerArrangement.openColorPicker(${index})"></span>
        <span class="track-name" title="Click to rename" onclick="beatMakerArrangement.renameTrack(${index})">${track.name}</span>
        <div class="track-header-actions">
          <button class="btn-icon btn-tiny" title="Mute" onclick="beatMakerArrangement.toggleMute(${index})">
            <i class="fas fa-volume-mute"></i>
          </button>
          <button class="btn-icon btn-tiny" title="Solo" onclick="beatMakerArrangement.toggleSolo(${index})">
            <i class="fas fa-headphones"></i>
          </button>
          <button class="btn-icon btn-tiny btn-danger-hover" title="Remove track" onclick="beatMakerArrangement.removeTrack(${index})">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  renameTrack (index) {
    const track = this.tracks[index];
    if (!track) return;
    const newName = prompt('Track name:', track.name);
    if (newName && newName.trim()) {
      track.name = newName.trim();
      this.render();
    }
  }

  toggleMute (index) {
    const track = this.tracks[index];
    if (!track) return;
    track.muted = !track.muted;
    this.render();
  }

  toggleSolo (index) {
    const track = this.tracks[index];
    if (!track) return;
    track.soloed = !track.soloed;
    this.render();
  }

  renderTimeline () {
    const container = document.getElementById('arrangementTimeline');
    if (!container) return;

    container.innerHTML = '';
    this.clips.forEach((clip, index) => {
      const clipElement = document.createElement('div');
      clipElement.className = 'arrangement-clip';
      clipElement.style.left = `${clip.start * 100}px`;
      clipElement.style.top = `${clip.track * 60}px`;
      clipElement.style.width = `${clip.duration * 100}px`;
      clipElement.style.height = '50px';
      clipElement.textContent = clip.name;
      clipElement.dataset.clipIndex = index;
      container.appendChild(clipElement);
    });
  }

  addTrack () {
    const color = this.trackColors[this.tracks.length % this.trackColors.length];
    this.tracks.push({ name: `Track ${this.tracks.length + 1}`, clips: [], color });
    this.render();
  }

  /** Change the color of a track */
  setTrackColor (index, color) {
    if (this.tracks[index]) {
      this.tracks[index].color = color;
      this.render();
    }
  }

  /** Show a color picker popup for the track at index */
  openColorPicker (index) {
    const existing = document.getElementById('trackColorPicker');
    if (existing) existing.remove();

    const picker = document.createElement('div');
    picker.id = 'trackColorPicker';
    picker.className = 'track-color-picker';
    picker.innerHTML = this.trackColors.map(c =>
      `<div class="color-swatch" style="background:${c}" data-color="${c}" title="${c}"></div>`
    ).join('');

    picker.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        this.setTrackColor(index, swatch.dataset.color);
        picker.remove();
      });
    });

    // Append near the track header
    const header = document.querySelector(`[data-track="${index}"]`);
    if (header) header.appendChild(picker);
    else document.body.appendChild(picker);

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function close (e) {
        if (!picker.contains(e.target)) { picker.remove(); document.removeEventListener('click', close); }
      });
    }, 0);
  }

  removeTrack (index) {
    this.tracks.splice(index, 1);
    this.render();
  }

  addClip (trackIndex, pattern, start, duration) {
    this.clips.push({
      track: trackIndex,
      pattern,
      start,
      duration,
      name: `Clip ${this.clips.length + 1}`
    });
    this.render();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BeatMakerArrangement;
}
