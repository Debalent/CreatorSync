/**
 * Beat Maker - Sample Management
 * Handle user sample uploads, editing, and management
 */

class BeatMakerSamples {
  constructor (engine, ui) {
    this.engine = engine;
    this.ui = ui;
    this.currentTab = 'library';
    this.userSamples = [];

    this.attachEventListeners();
  }

  attachEventListeners () {
    // Upload button
    document.getElementById('btnUploadSample')?.addEventListener('click', () => {
      this.showUploadModal();
    });

    // Tab switching
    document.querySelectorAll('.samples-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.closest('.samples-tab').dataset.tab);
      });
    });

    // Submit upload form
    document.getElementById('btnSubmitSample')?.addEventListener('click', () => {
      this.uploadSample();
    });

    // Edit sample actions
    document.getElementById('btnUpdateSample')?.addEventListener('click', () => {
      this.updateSample();
    });

    document.getElementById('btnDeleteSample')?.addEventListener('click', () => {
      this.deleteSample();
    });
  }

  switchTab (tab) {
    this.currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('.samples-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Load appropriate samples
    if (tab === 'my-samples') {
      this.loadUserSamples();
    } else {
      this.ui.loadSamples();
    }
  }

  showUploadModal () {
    if (!this.ui.currentUser) {
      alert('Please log in to upload samples');
      return;
    }

    this.ui.showModal('uploadSampleModal');

    // Reset form
    document.getElementById('uploadSampleForm')?.reset();
    document.getElementById('uploadProgress').style.display = 'none';
  }

  async uploadSample () {
    const form = document.getElementById('uploadSampleForm');
    const fileInput = document.getElementById('sampleFile');

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!fileInput.files || !fileInput.files[0]) {
      alert('Please select a file');
      return;
    }

    const file = fileInput.files[0];

    // Check file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be under 50MB');
      return;
    }

    try {
      // Show progress
      const progressDiv = document.getElementById('uploadProgress');
      const progressFill = document.getElementById('uploadProgressFill');
      const progressText = document.getElementById('uploadProgressText');
      progressDiv.style.display = 'block';
      progressText.textContent = 'Uploading...';

      // Prepare form data
      const formData = new FormData(form);

      const token = localStorage.getItem('token');

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          progressFill.style.width = percentComplete + '%';
          progressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;
        }
      });

      const response = await new Promise((resolve, reject) => {
        xhr.onload = () => resolve(xhr);
        xhr.onerror = () => reject(new Error('Upload failed'));

        xhr.open('POST', '/api/beat-maker/samples/upload');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      const data = JSON.parse(response.responseText);

      if (data.success) {
        this.ui.showSuccess('Sample uploaded successfully!');
        this.ui.closeModal('uploadSampleModal');

        // Reload samples if on my-samples tab
        if (this.currentTab === 'my-samples') {
          this.loadUserSamples();
        }
      } else {
        this.ui.showError(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error); // eslint-disable-line no-console
      this.ui.showError('Failed to upload sample');
    }
  }

  async loadUserSamples () {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        this.ui.showError('Please log in to view your samples');
        return;
      }

      const category = document.getElementById('categoryFilter')?.value || '';
      const search = document.getElementById('samplesSearch')?.value || '';

      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);

      const response = await fetch(`/api/beat-maker/samples/my-samples?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        this.userSamples = data.samples;
        this.renderUserSamples();
      } else {
        this.ui.showError(data.error || 'Failed to load samples');
      }
    } catch (error) {
      console.error('Load user samples error:', error); // eslint-disable-line no-console
      this.ui.showError('Failed to load samples');
    }
  }

  renderUserSamples () {
    const container = document.getElementById('samplesList');
    if (!container) return;

    if (this.userSamples.length === 0) {
      container.innerHTML = '<div class="sample-loading"><p>No samples uploaded yet</p></div>';
      return;
    }

    container.innerHTML = this.userSamples.map(sample => `
      <div class="sample-item" data-sample-id="${sample._id}">
        <div class="sample-info">
          <div class="sample-name">${this.escapeHtml(sample.name)}</div>
          <div class="sample-meta">
            ${sample.category} ${sample.bpm ? `• ${sample.bpm} BPM` : ''}
            ${sample.duration ? `• ${sample.duration}s` : ''}
          </div>
        </div>
        <div class="sample-item-actions">
          <button class="btn-icon" onclick="beatMakerSamples.editSample('${sample._id}')" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon" onclick="beatMakerSamples.playSamplePreview('${sample.fileUrl}')" title="Preview">
            <i class="fas fa-play"></i>
          </button>
        </div>
      </div>
    `).join('');

    // Add click handlers for using samples
    container.querySelectorAll('.sample-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          const sampleId = item.dataset.sampleId;
          const sample = this.userSamples.find(s => s._id === sampleId);
          if (sample) {
            this.engine.loadSample(sample._id, sample.fileUrl);
          }
        }
      });
    });
  }

  async editSample (sampleId) {
    const sample = this.userSamples.find(s => s._id === sampleId);
    if (!sample) return;

    // Populate form
    document.getElementById('editSampleId').value = sample._id;
    document.getElementById('editSampleName').value = sample.name;
    document.getElementById('editSampleCategory').value = sample.category;
    document.getElementById('editSampleBPM').value = sample.bpm || '';
    document.getElementById('editSampleKey').value = sample.key || '';
    document.getElementById('editSampleTags').value = Array.isArray(sample.tags) ? sample.tags.join(', ') : '';
    document.getElementById('editSampleIsPublic').checked = sample.isPublic;

    this.ui.showModal('editSampleModal');
  }

  async updateSample () {
    const sampleId = document.getElementById('editSampleId').value;
    const form = document.getElementById('editSampleForm');

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData(form);

      const updates = {
        name: formData.get('name'),
        category: formData.get('category'),
        bpm: formData.get('bpm'),
        key: formData.get('key'),
        tags: formData.get('tags'),
        isPublic: document.getElementById('editSampleIsPublic').checked
      };

      const response = await fetch(`/api/beat-maker/samples/${sampleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (data.success) {
        this.ui.showSuccess('Sample updated successfully');
        this.ui.closeModal('editSampleModal');
        this.loadUserSamples();
      } else {
        this.ui.showError(data.error || 'Update failed');
      }
    } catch (error) {
      console.error('Update sample error:', error); // eslint-disable-line no-console
      this.ui.showError('Failed to update sample');
    }
  }

  async deleteSample () {
    const sampleId = document.getElementById('editSampleId').value;

    if (!confirm('Are you sure you want to delete this sample? This cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/beat-maker/samples/${sampleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        this.ui.showSuccess('Sample deleted successfully');
        this.ui.closeModal('editSampleModal');
        this.loadUserSamples();
      } else {
        this.ui.showError(data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete sample error:', error); // eslint-disable-line no-console
      this.ui.showError('Failed to delete sample');
    }
  }

  playSamplePreview (fileUrl) {
    // Create temporary audio element for preview
    const audio = new Audio(fileUrl);
    audio.volume = 0.7;
    audio.play().catch(err => {
      console.error('Preview playback failed:', err); // eslint-disable-line no-console
    });
  }

  escapeHtml (text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BeatMakerSamples;
}
