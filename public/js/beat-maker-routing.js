/**
 * Beat Maker - Advanced Routing
 * Buses, sends, and sidechain configuration
 */

class BeatMakerRouting {
  constructor (engine, ui) {
    this.engine = engine;
    this.ui = ui;
    this.buses = [];
    this.sends = [];
    this.sidechains = [];

    this.attachEventListeners();
  }

  open () {
    this.ui.showModal('routingModal');
    this.render();
  }

  attachEventListeners () {
    document.getElementById('addBus')?.addEventListener('click', () => {
      this.addBus();
    });
  }

  addBus () {
    const busName = prompt('Enter bus name:', `Bus ${this.buses.length + 1}`);
    if (!busName) return;

    const bus = {
      id: `bus_${Date.now()}`,
      name: busName,
      volume: 1.0,
      pan: 0,
      effects: [],
      channel: null
    };

    // Create Tone.js channel
    bus.channel = new Tone.Channel().toDestination();  

    this.buses.push(bus);
    this.render();
  }

  removeBus (busId) {
    const index = this.buses.findIndex(b => b.id === busId);
    if (index !== -1) {
      // Disconnect and dispose of Tone.js channel
      const bus = this.buses[index];
      if (bus.channel) {
        bus.channel.disconnect();
        bus.channel.dispose();
      }
      this.buses.splice(index, 1);
      this.render();
    }
  }

  addSend (trackId, busId, amount = 0) {
    this.sends.push({
      id: `send_${Date.now()}`,
      track: trackId,
      bus: busId,
      amount
    });
    this.applySend(trackId, busId, amount);
  }

  applySend (trackId, busId, amount) {
    const track = this.engine.tracks?.find(t => t.id === trackId);
    const bus = this.buses.find(b => b.id === busId);

    if (track && bus && track.channel && bus.channel) {
      // Create a send gain node
      const sendGain = new Tone.Gain(amount).connect(bus.channel);  
      track.channel.connect(sendGain);
    }
  }

  configureSidechain (sourceTrackId, targetEffectId) {
    this.sidechains.push({
      id: `sidechain_${Date.now()}`,
      source: sourceTrackId,
      target: targetEffectId
    });
    this.applySidechain(sourceTrackId, targetEffectId);
    this.renderSidechains();
  }

  applySidechain (sourceTrackId, targetEffectId) {
    const sourceTrack = this.engine.tracks?.find(t => t.id === sourceTrackId);
    const targetEffect = this.engine.findEffect(targetEffectId);

    if (sourceTrack && targetEffect && sourceTrack.channel) {
      // Connect source to effect's sidechain input (if supported)
      // This is simplified - real implementation would depend on effect type
      if (targetEffect.effect && typeof targetEffect.effect.set === 'function') {
        sourceTrack.channel.connect(targetEffect.effect);
      }
    }
  }

  render () {
    this.renderBuses();
    this.renderRoutingMatrix();
    this.renderSidechains();
  }

  renderBuses () {
    const container = document.getElementById('busesList');
    if (!container) return;

    if (this.buses.length === 0) {
      container.innerHTML = '<p class="text-muted">No buses created</p>';
      return;
    }

    container.innerHTML = this.buses.map(bus => `
      <div class="bus-item">
        <span>${bus.name}</span>
        <div>
          <button class="btn-icon" onclick="beatMakerRouting.configureBusEffects('${bus.id}')">
            <i class="fas fa-sliders-h"></i>
          </button>
          <button class="btn-icon" onclick="beatMakerRouting.removeBus('${bus.id}')">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  renderRoutingMatrix () {
    const container = document.getElementById('routingGrid');
    if (!container) return;

    if (this.buses.length === 0 || !this.engine.tracks || this.engine.tracks.length === 0) {
      container.innerHTML = '<p class="text-muted">Add buses and tracks to configure routing</p>';
      return;
    }

    // Create a matrix of tracks vs buses
    let html = '<table style="border-collapse: collapse;">';
    html += '<tr><th></th>';
    this.buses.forEach(bus => {
      html += `<th style="padding: 0.5rem;">${bus.name}</th>`;
    });
    html += '</tr>';

    this.engine.tracks.forEach(track => {
      html += `<tr><td style="padding: 0.5rem;">${track.name || 'Track'}</td>`;
      this.buses.forEach(bus => {
        const send = this.sends.find(s => s.track === track.id && s.bus === bus.id);
        const isActive = !!send;
        html += `<td><div class="routing-cell ${isActive ? 'active' : ''}"
          onclick="beatMakerRouting.toggleRouting('${track.id}', '${bus.id}')"></div></td>`;
      });
      html += '</tr>';
    });
    html += '</table>';

    container.innerHTML = html;
  }

  renderSidechains () {
    const container = document.getElementById('sidechainConfig');
    if (!container) return;

    if (this.sidechains.length === 0) {
      container.innerHTML = '<p class="text-muted">No sidechain connections configured</p>';
      return;
    }

    container.innerHTML = this.sidechains.map((sc, index) => `
      <div class="sidechain-connection">
        <div class="sidechain-source">Source: Track ${sc.source}</div>
        <div class="sidechain-target">Target: Effect ${sc.target}</div>
        <button class="btn-small" onclick="beatMakerRouting.removeSidechain(${index})">
          <i class="fas fa-unlink"></i> Disconnect
        </button>
      </div>
    `).join('');
  }

  toggleRouting (trackId, busId) {
    const existingIndex = this.sends.findIndex(s => s.track === trackId && s.bus === busId);

    if (existingIndex !== -1) {
      // Remove send
      this.sends.splice(existingIndex, 1);
    } else {
      // Add send at 50% level
      this.addSend(trackId, busId, 0.5);
    }

    this.renderRoutingMatrix();
  }

  configureBusEffects (busId) {
    const bus = this.buses.find(b => b.id === busId);
    if (bus) {
      // Open effects panel for this bus
      alert(`Bus effects configuration for ${bus.name} would open here`);
    }
  }

  removeSidechain (index) {
    this.sidechains.splice(index, 1);
    this.renderSidechains();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BeatMakerRouting;
}
