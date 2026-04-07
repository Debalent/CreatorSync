// CreatorSync Radio Mini Player UI
// Persistent docked bottom bar for radio streaming

class RadioMiniPlayer {
    constructor() {
        this.container = null;
        this.track = null;
        this.mode = 'global';
        this.isPlaying = true;
        this.init();
    }

    init() {
        this.container = document.createElement('div');
        this.container.id = 'radio-mini-player';
        this.container.className = 'radio-mini-player docked-bottom';
        this.container.innerHTML = `
            <div class="radio-player-content">
                <div class="track-info">
                    <span id="radio-track-title">--</span>
                    <span id="radio-artist-name">--</span>
                </div>
                <div class="radio-player-controls">
                    <button id="radio-like-btn">♥</button>
                    <button id="radio-save-btn">💾</button>
                    <button id="radio-collab-btn">🤝</button>
                    <button id="radio-license-btn">⚖️</button>
                    <button id="radio-skip-btn">⏭️</button>
                    <input id="radio-volume" type="range" min="0" max="100" value="80" />
                    <select id="radio-mode-selector">
                        <option value="global">Global Radio</option>
                        <option value="genre">Genre-Based Radio</option>
                        <option value="collaboration">Collaboration Radio</option>
                        <option value="rising">Rising Creators Radio</option>
                        <option value="premium">Premium Spotlight Radio</option>
                    </select>
                </div>
            </div>
        `;
        document.body.appendChild(this.container);
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('radio-like-btn').onclick = () => this.likeTrack();
        document.getElementById('radio-save-btn').onclick = () => this.saveTrack();
        document.getElementById('radio-collab-btn').onclick = () => this.collaborate();
        document.getElementById('radio-license-btn').onclick = () => this.licenseTrack();
        document.getElementById('radio-skip-btn').onclick = () => this.skipTrack();
        document.getElementById('radio-mode-selector').onchange = (e) => this.changeMode(e.target.value);
    }

    updateTrack(track) {
        this.track = track;
        document.getElementById('radio-track-title').textContent = track.title;
        document.getElementById('radio-artist-name').textContent = track.artist;
    }

    likeTrack() {
        // TODO: Call API to like track
    }
    saveTrack() {
        // TODO: Call API to save track
    }
    collaborate() {
        // TODO: Call API to start collaboration
    }
    licenseTrack() {
        // TODO: Call API to license track
    }
    skipTrack() {
        // TODO: Call API to skip track
    }
    changeMode(mode) {
        this.mode = mode;
        // TODO: Call API to change radio mode
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.creatorSyncRadioPlayer = new RadioMiniPlayer();
});
