/**
 * Beat Maker - Project Management
 * Handles loading, saving, and managing projects
 */

class BeatMakerProjects {
  constructor (engine, ui) {
    this.engine = engine;
    this.ui = ui;
    this.projects = [];
    this.currentFilter = '';
    this.currentSort = 'modified';

    this.attachEventListeners();
  }

  /**
   * Attach event listeners for project management
   */
  attachEventListeners () {
    // Load button
    const btnLoad = document.getElementById('btnLoad');
    if (btnLoad) {
      btnLoad.addEventListener('click', () => this.showLoadModal());
    }

    // Search filter
    const searchInput = document.getElementById('projectsSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.currentFilter = e.target.value.toLowerCase();
        this.renderProjects();
      });
    }

    // Sort selector
    const sortSelect = document.getElementById('projectsSortBy');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.renderProjects();
      });
    }
  }

  /**
   * Show load project modal
   */
  async showLoadModal () {
    this.ui.showModal('loadModal');
    await this.loadProjects();
  }

  /**
   * Load projects from server
   */
  async loadProjects () {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        this.ui.showError('Please log in to load projects');
        return;
      }

      const response = await fetch('/api/beat-maker/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        this.projects = data.projects || [];
        this.renderProjects();
      } else {
        this.ui.showError(data.error || 'Failed to load projects');
      }
    } catch (error) {
      console.error('Load projects error:', error);
      this.ui.showError('Failed to load projects');
    }
  }

  /**
   * Render projects list
   */
  renderProjects () {
    const container = document.getElementById('projectsList');
    if (!container) return;

    // Filter projects
    let filtered = this.projects.filter(project => {
      if (!this.currentFilter) return true;
      return project.name.toLowerCase().includes(this.currentFilter) ||
             (project.genre && project.genre.toLowerCase().includes(this.currentFilter));
    });

    // Sort projects
    filtered.sort((a, b) => {
      switch (this.currentSort) {
      case 'modified':
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      case 'created':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
      }
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div class="project-loading"><p>No projects found</p></div>';
      return;
    }

    // Render project items
    container.innerHTML = filtered.map(project => `
      <div class="project-item" data-project-id="${project._id}">
        <div class="project-icon">
          <i class="fas fa-music"></i>
        </div>
        <div class="project-info">
          <div class="project-name">${this.escapeHtml(project.name)}</div>
          <div class="project-meta">
            ${project.genre || 'No Genre'} • ${project.bpm} BPM •
            ${this.formatDate(project.updatedAt)}
          </div>
        </div>
        <button class="btn-icon" onclick="beatMakerProjects.deleteProject('${project._id}', event)">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `).join('');

    // Attach click handlers
    container.querySelectorAll('.project-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          const projectId = item.dataset.projectId;
          this.loadProject(projectId);
        }
      });
    });
  }

  /**
   * Load a specific project
   */
  async loadProject (projectId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/beat-maker/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        const project = data.project;

        // Load project into engine
        this.engine.loadState({
          bpm: project.bpm,
          timeSignature: project.timeSignature,
          tracks: project.tracks,
          patterns: project.patterns
        });

        // Update UI
        this.ui.currentProjectId = project._id;
        this.ui.elements.projectTitle.textContent = project.name;
        this.ui.elements.bpmInput.value = project.bpm;

        // Close modal
        this.ui.closeModal('loadModal');

        this.ui.showSuccess('Project loaded successfully');

        // If collaboration mode, redirect with project ID
        if (collaborationManager) {
          const url = new URL(window.location.href);
          url.searchParams.set('project', project._id);
          window.history.pushState({}, '', url);
        }
      } else {
        this.ui.showError(data.error || 'Failed to load project');
      }
    } catch (error) {
      console.error('Load project error:', error);
      this.ui.showError('Failed to load project');
    }
  }

  /**
   * Delete a project
   */
  async deleteProject (projectId, event) {
    if (event) event.stopPropagation();

    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/beat-maker/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        this.ui.showSuccess('Project deleted successfully');
        await this.loadProjects();
      } else {
        this.ui.showError(data.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Delete project error:', error);
      this.ui.showError('Failed to delete project');
    }
  }

  /**
   * Format date for display
   */
  formatDate (dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return date.toLocaleDateString();
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml (text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BeatMakerProjects;
}

