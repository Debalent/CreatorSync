/**
 * Beat Maker Panel Resize System
 * Adds drag handles to resize panels horizontally and vertically
 */

class BeatMakerResize {
  constructor() {
    this.isDragging = false;
    this.currentHandle = null;
    this.startX = 0;
    this.startY = 0;
    this.startWidth = 0;
    this.startHeight = 0;
    this.minWidth = 200;
    this.minHeight = 100;
    
    this.init();
  }

  init() {
    this.createResizeHandles();
    this.attachEventListeners();
    this.restoreSavedSizes();
  }

  createResizeHandles() {
    // Horizontal resize handle for samples browser (left panel)
    const samplesBrowser = document.querySelector('.samples-browser');
    if (samplesBrowser) {
      const handle = document.createElement('div');
      handle.className = 'resize-handle resize-handle-horizontal';
      handle.dataset.target = 'samples-browser';
      handle.innerHTML = '<div class="resize-handle-line"></div>';
      samplesBrowser.appendChild(handle);
    }

    // Horizontal resize handle for mixer panel (right panel)
    const mixerPanel = document.querySelector('.mixer-panel');
    if (mixerPanel) {
      const handle = document.createElement('div');
      handle.className = 'resize-handle resize-handle-horizontal resize-handle-left';
      handle.dataset.target = 'mixer-panel';
      handle.innerHTML = '<div class="resize-handle-line"></div>';
      mixerPanel.insertBefore(handle, mixerPanel.firstChild);
    }

    // Vertical resize handle between samples list and packs section
    const samplesList = document.querySelector('.samples-list');
    const packsSection = document.querySelector('.packs-section');
    if (samplesList && packsSection) {
      const handle = document.createElement('div');
      handle.className = 'resize-handle resize-handle-vertical';
      handle.dataset.target = 'samples-list';
      handle.innerHTML = '<div class="resize-handle-line"></div>';
      samplesList.parentElement.insertBefore(handle, packsSection);
    }

    // Vertical resize handle between sequencer and timeline
    const sequencer = document.querySelector('.step-sequencer');
    const timeline = document.querySelector('.timeline');
    if (sequencer && timeline) {
      const handle = document.createElement('div');
      handle.className = 'resize-handle resize-handle-vertical';
      handle.dataset.target = 'step-sequencer';
      handle.innerHTML = '<div class="resize-handle-line"></div>';
      timeline.parentElement.insertBefore(handle, timeline);
    }
  }

  attachEventListeners() {
    const handles = document.querySelectorAll('.resize-handle');
    
    handles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => this.startDrag(e, handle));
    });

    document.addEventListener('mousemove', (e) => this.drag(e));
    document.addEventListener('mouseup', () => this.stopDrag());

    // Prevent text selection while dragging
    document.addEventListener('selectstart', (e) => {
      if (this.isDragging) e.preventDefault();
    });
  }

  startDrag(e, handle) {
    e.preventDefault();
    this.isDragging = true;
    this.currentHandle = handle;
    this.startX = e.clientX;
    this.startY = e.clientY;

    const target = document.querySelector(`.${handle.dataset.target}`);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    this.startWidth = rect.width;
    this.startHeight = rect.height;

    document.body.style.cursor = handle.classList.contains('resize-handle-horizontal') 
      ? 'col-resize' 
      : 'row-resize';
    
    handle.classList.add('active');
  }

  drag(e) {
    if (!this.isDragging || !this.currentHandle) return;

    const target = document.querySelector(`.${this.currentHandle.dataset.target}`);
    if (!target) return;

    if (this.currentHandle.classList.contains('resize-handle-horizontal')) {
      this.resizeHorizontal(e, target);
    } else {
      this.resizeVertical(e, target);
    }
  }

  resizeHorizontal(e, target) {
    const deltaX = e.clientX - this.startX;
    let newWidth;

    if (this.currentHandle.classList.contains('resize-handle-left')) {
      // Right panel - resize from left (inverse direction)
      newWidth = this.startWidth - deltaX;
    } else {
      // Left panel - resize from right
      newWidth = this.startWidth + deltaX;
    }

    newWidth = Math.max(this.minWidth, Math.min(newWidth, window.innerWidth * 0.5));
    target.style.width = `${newWidth}px`;
    target.style.flex = 'none';

    // Save to localStorage
    localStorage.setItem(`${target.className}-width`, newWidth);
  }

  resizeVertical(e, target) {
    const deltaY = e.clientY - this.startY;
    let newHeight = this.startHeight + deltaY;

    newHeight = Math.max(this.minHeight, newHeight);
    target.style.height = `${newHeight}px`;
    target.style.flex = 'none';

    // Save to localStorage
    localStorage.setItem(`${target.className}-height`, newHeight);
  }

  stopDrag() {
    if (this.isDragging) {
      this.isDragging = false;
      document.body.style.cursor = '';
      
      if (this.currentHandle) {
        this.currentHandle.classList.remove('active');
        this.currentHandle = null;
      }
    }
  }

  restoreSavedSizes() {
    // Restore saved panel sizes from localStorage
    const panels = [
      { selector: '.samples-browser', dimension: 'width' },
      { selector: '.mixer-panel', dimension: 'width' },
      { selector: '.samples-list', dimension: 'height' },
      { selector: '.step-sequencer', dimension: 'height' }
    ];

    panels.forEach(({ selector, dimension }) => {
      const element = document.querySelector(selector);
      if (!element) return;

      const saved = localStorage.getItem(`${element.className}-${dimension}`);
      if (saved) {
        element.style[dimension] = `${saved}px`;
        element.style.flex = 'none';
      }
    });
  }

  // Public method to reset all panels to default sizes
  resetToDefaults() {
    const defaults = {
      'samples-browser': { width: '280px' },
      'mixer-panel': { width: '300px' },
      'samples-list': { height: 'auto' },
      'step-sequencer': { height: '400px' }
    };

    Object.entries(defaults).forEach(([className, styles]) => {
      const element = document.querySelector(`.${className}`);
      if (element) {
        Object.entries(styles).forEach(([prop, value]) => {
          element.style[prop] = value;
          if (value === 'auto') {
            element.style.flex = '1';
          }
        });
        localStorage.removeItem(`${className}-width`);
        localStorage.removeItem(`${className}-height`);
      }
    });
  }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
  window.BeatMakerResize = BeatMakerResize;
  console.log('✅ Beat Maker Resize system loaded');
}
