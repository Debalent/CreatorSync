// UI toggle for CreatorSync Radio demo mode

class RadioDemoToggle {
    constructor() {
        this.init();
    }

    init() {
        const toggle = document.createElement('button');
        toggle.id = 'radio-demo-toggle';
        toggle.textContent = 'Toggle Demo Mode';
        toggle.onclick = () => this.toggleDemoMode();
        document.body.appendChild(toggle);
    }

    toggleDemoMode() {
        // For frontend demo only: show alert, real backend demo mode is via env var
        alert('To enable backend demo mode, set CREATOR_SYNC_DEMO_MODE=true in your environment and restart the server.');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.creatorSyncRadioDemoToggle = new RadioDemoToggle();
});
