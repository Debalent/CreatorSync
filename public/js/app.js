/**
 * CreatorSync — Elite UI App.js v3.0
 * All interactivity, animations, and micro-interactions
 */

'use strict';

/* ═══════════════════════════════════════════
   1. UTILITIES
═══════════════════════════════════════════ */

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

function on(el, event, handler, opts) {
  if (!el) return;
  el.addEventListener(event, handler, opts);
}

function off(el, event, handler) {
  if (!el) return;
  el.removeEventListener(event, handler);
}

/** Animate a number from 0 to target */
function animateCounter(el, target, duration = 2000, prefix = '', suffix = '') {
  const start = performance.now();
  const isLarge = target >= 10000;

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out quart
    const eased = 1 - Math.pow(1 - progress, 4);
    const value = Math.floor(eased * target);

    if (isLarge) {
      el.textContent = prefix + value.toLocaleString() + suffix;
    } else {
      el.textContent = prefix + value + suffix;
    }

    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = prefix + target.toLocaleString() + suffix;
  }

  requestAnimationFrame(update);
}

/** Debounce */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** Throttle */
function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}

/** Check if element is in viewport */
function inViewport(el, threshold = 0.15) {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight * (1 - threshold) && rect.bottom > 0;
}


/* ═══════════════════════════════════════════
   2. CURSOR GLOW
═══════════════════════════════════════════ */

(function initCursorGlow() {
  const glow = $('#cursorGlow');
  if (!glow || window.matchMedia('(pointer: coarse)').matches) return;

  let mouseX = 0, mouseY = 0;
  let glowX = 0, glowY = 0;
  let raf;

  on(document, 'mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!raf) raf = requestAnimationFrame(tick);
  });

  function tick() {
    glowX += (mouseX - glowX) * 0.08;
    glowY += (mouseY - glowY) * 0.08;
    glow.style.left = glowX + 'px';
    glow.style.top  = glowY + 'px';
    raf = requestAnimationFrame(tick);
  }
})();


/* ═══════════════════════════════════════════
   3. NAVBAR — SCROLL + SEARCH + MOBILE
═══════════════════════════════════════════ */

(function initNavbar() {
  const navbar      = $('#navbar');
  const hamburger   = $('#hamburger');
  const mobileMenu  = $('#mobileMenu');
  const overlay     = $('#overlay');
  const searchToggle = $('#searchToggle');
  const searchBar   = $('#searchBar');
  const globalSearch = $('#globalSearch');
  const mobileClose = $('#mobileClose');

  // ── Scroll effect ──────────────────────
  const onScroll = throttle(() => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, 50);

  on(window, 'scroll', onScroll, { passive: true });
  onScroll(); // run once on load

  // ── Active nav link on scroll ──────────
  const sections = $$('section[id]');
  const navLinks = $$('.nav-link[href^="#"]');

  const onScrollActivate = throttle(() => {
    let current = '';
    sections.forEach(sec => {
      const top = sec.getBoundingClientRect().top;
      if (top <= 120) current = sec.id;
    });
    navLinks.forEach(link => {
      const href = link.getAttribute('href').slice(1);
      link.classList.toggle('active', href === current);
    });
  }, 100);

  on(window, 'scroll', onScrollActivate, { passive: true });

  // ── Mobile menu ────────────────────────
  function openMobileMenu() {
    mobileMenu.classList.add('open');
    overlay.classList.add('active');
    mobileMenu.setAttribute('aria-hidden', 'false');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    mobileMenu.classList.remove('open');
    overlay.classList.remove('active');
    mobileMenu.setAttribute('aria-hidden', 'true');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  on(hamburger, 'click', () => {
    const isOpen = mobileMenu.classList.contains('open');
    isOpen ? closeMobileMenu() : openMobileMenu();
  });

  on(mobileClose, 'click', closeMobileMenu);
  on(overlay, 'click', closeMobileMenu);

  // Close mobile menu on link click
  $$('.mobile-link').forEach(link => on(link, 'click', closeMobileMenu));

  // ── Search bar ─────────────────────────
  function openSearch() {
    searchBar.classList.add('open');
    searchBar.setAttribute('aria-hidden', 'false');
    setTimeout(() => globalSearch && globalSearch.focus(), 50);
  }

  function closeSearch() {
    searchBar.classList.remove('open');
    searchBar.setAttribute('aria-hidden', 'true');
  }

  on(searchToggle, 'click', () => {
    searchBar.classList.contains('open') ? closeSearch() : openSearch();
  });

  on(document, 'keydown', (e) => {
    if (e.key === 'Escape') {
      closeSearch();
      closeMobileMenu();
    }
    // Cmd/Ctrl + K to open search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  });

  // Smooth scroll for nav links
  $$('a[href^="#"]').forEach(link => {
    on(link, 'click', (e) => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'));
        const top  = target.getBoundingClientRect().top + window.scrollY - navH;
        window.scrollTo({ top, behavior: 'smooth' });
        closeMobileMenu();
      }
    });
  });
})();


/* ═══════════════════════════════════════════
   4. HERO WAVEFORM CANVAS (animated)
═══════════════════════════════════════════ */

(function initHeroWaveform() {
  const canvas = $('#heroWaveform');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height, phase = 0;

  function resize() {
    width  = canvas.width  = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight || 120;
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Draw several sine waves with different frequencies/amplitudes
    const waves = [
      { freq: 0.015, amp: 18, speed: 0.012, color: 'rgba(124,58,237,0.35)' },
      { freq: 0.020, amp: 12, speed: 0.018, color: 'rgba(6,182,212,0.25)' },
      { freq: 0.010, amp: 26, speed: 0.008, color: 'rgba(168,85,247,0.18)' },
    ];

    waves.forEach(({ freq, amp, speed, color }, i) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;

      for (let x = 0; x <= width; x += 2) {
        const y = height / 2 +
          Math.sin(x * freq + phase * speed * 80 + i * 1.2) * amp +
          Math.sin(x * freq * 1.7 + phase * speed * 120) * (amp * 0.4);

        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }

      ctx.stroke();
    });

    phase++;
    requestAnimationFrame(draw);
  }

  new ResizeObserver(resize).observe(canvas.parentElement || document.body);
  resize();
  draw();
})();


/* ═══════════════════════════════════════════
   5. PREVIEW WAVEFORM CANVAS
═══════════════════════════════════════════ */

(function initPreviewWaveform() {
  const canvas = $('#waveCanvas');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  const bars   = 60;
  let playhead = 0;
  let playing  = false;
  let animId;

  // Generate random-ish bar heights seeded for consistency
  const heights = Array.from({ length: bars }, (_, i) =>
    0.2 + 0.8 * Math.abs(Math.sin(i * 0.45 + 1.3) * Math.cos(i * 0.19))
  );

  function resize() {
    canvas.width  = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    canvas.style.width  = canvas.offsetWidth + 'px';
    canvas.style.height = canvas.offsetHeight + 'px';
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  function draw() {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    ctx.clearRect(0, 0, w, h);

    const barW   = w / bars - 1.5;
    const gapW   = 1.5;
    const totalW = barW + gapW;

    heights.forEach((ht, i) => {
      const x    = i * totalW;
      const barH = ht * h * 0.85;
      const y    = (h - barH) / 2;
      const prog = i / bars;

      // Pulse effect for bars before playhead
      let alpha = 0.25;
      if (prog <= playhead) {
        const pulse = playing ? (0.85 + 0.15 * Math.sin(Date.now() * 0.005 + i * 0.4)) : 1;
        alpha = pulse;
      }

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      if (prog <= playhead) {
        grad.addColorStop(0, `rgba(168,85,247,${alpha})`);
        grad.addColorStop(1, `rgba(6,182,212,${alpha})`);
      } else {
        grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
        grad.addColorStop(1, `rgba(255,255,255,${alpha * 0.5})`);
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 2);
      ctx.fill();
    });

    if (playing) {
      playhead = Math.min(playhead + 0.003, 1);
      if (playhead >= 1) { playing = false; playhead = 0; }
      animId = requestAnimationFrame(draw);
    }
  }

  resize();
  draw();

  // Control from hero play button
  const heroPlayBtn = $('#heroPlayBtn');
  if (heroPlayBtn) {
    on(heroPlayBtn, 'click', () => {
      playing = !playing;
      const icon = heroPlayBtn.querySelector('i');
      if (icon) {
        icon.className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
      }
      if (playing) {
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(draw);
        // Also open the persistent player
        openPlayer({
          title: 'Midnight Frequency',
          producer: 'NeoBeats',
          art: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=56&h=56&fit=crop',
        });
      }
    });
  }

  new ResizeObserver(() => { resize(); draw(); }).observe(canvas.parentElement || document.body);
})();


/* ═══════════════════════════════════════════
   6. HERO STAT COUNTERS (Intersection Observer)
═══════════════════════════════════════════ */

(function initCounters() {
  const els = $$('[data-target]');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el     = entry.target;
        const target = parseInt(el.dataset.target, 10);
        const prefix = el.dataset.prefix || '';
        animateCounter(el, target, 2200, prefix);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  els.forEach(el => observer.observe(el));
})();


/* ═══════════════════════════════════════════
   7. SECTION FADE-IN ON SCROLL
═══════════════════════════════════════════ */

(function initScrollAnimations() {
  const targets = $$('.beat-card, .producer-card, .ai-card, .pricing-card, .section-header, .hero-stats');

  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => {
    // Pause animations until they enter viewport
    el.style.animationPlayState = 'paused';
    observer.observe(el);
  });
})();


/* ═══════════════════════════════════════════
   8. BEAT CARD INTERACTIONS
═══════════════════════════════════════════ */

(function initBeatCards() {
  // ── Play buttons ───────────────────────
  on(document, 'click', (e) => {
    const playBtn = e.target.closest('.beat-play-btn');
    if (!playBtn) return;

    const card = playBtn.closest('.beat-card');
    if (!card) return;

    const title    = card.querySelector('.beat-card-title')?.textContent || 'Unknown';
    const producer = card.querySelector('.beat-card-producer')?.textContent?.trim() || 'Unknown';
    const artEl    = card.querySelector('.beat-card-art img');
    const art      = artEl ? artEl.src : '';

    openPlayer({ title, producer, art });
    rippleEffect(playBtn, e);
  });

  // ── Like buttons ───────────────────────
  on(document, 'click', (e) => {
    const likeBtn = e.target.closest('.beat-like-btn');
    if (!likeBtn) return;

    const isLiked = likeBtn.getAttribute('aria-pressed') === 'true';
    likeBtn.setAttribute('aria-pressed', String(!isLiked));

    const icon = likeBtn.querySelector('i');
    if (icon) {
      icon.className = isLiked ? 'fa-regular fa-heart' : 'fa-solid fa-heart';
    }

    // Heart burst animation
    if (!isLiked) heartBurst(likeBtn);

    showToast(isLiked ? 'Removed from likes' : 'Added to your likes ❤️', 'success');
  });

  // ── Cart buttons ───────────────────────
  on(document, 'click', (e) => {
    const cartBtn = e.target.closest('.beat-cart-btn');
    if (!cartBtn) return;

    const card  = cartBtn.closest('.beat-card');
    const title = card?.querySelector('.beat-card-title')?.textContent || 'Beat';

    rippleEffect(cartBtn, e);
    showToast(`"${title}" added to cart 🛒`, 'success');

    // Bounce animation on the button icon
    const icon = cartBtn.querySelector('i');
    if (icon) {
      icon.classList.add('fa-bounce');
      setTimeout(() => icon.classList.remove('fa-bounce'), 1000);
    }
  });

  // ── Filter chips (genre) ───────────────
  $$('[data-filter="genre"]').forEach(chip => {
    on(chip, 'click', () => {
      $$('[data-filter="genre"]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filterBeats(chip.dataset.value);
    });
  });

  function filterBeats(genre) {
    const cards = $$('.beat-card:not(.is-skeleton)');
    cards.forEach(card => {
      const match = genre === 'all' || card.dataset.genre === genre;
      card.style.transition = 'opacity 0.25s, transform 0.25s';
      if (match) {
        card.style.opacity = '1';
        card.style.transform = '';
        card.style.display = '';
      } else {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        setTimeout(() => { if (card.style.opacity === '0') card.style.display = 'none'; }, 280);
      }
    });
  }

  // ── View toggle (grid / list) ──────────
  $$('.view-btn').forEach(btn => {
    on(btn, 'click', () => {
      $$('.view-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      const grid = $('#beatsGrid');
      if (!grid) return;

      if (btn.dataset.view === 'list') {
        grid.style.gridTemplateColumns = '1fr';
      } else {
        grid.style.gridTemplateColumns = '';
      }
    });
  });

  // ── Sort select ────────────────────────
  const sortSelect = $('.sort-select');
  on(sortSelect, 'change', () => {
    showToast(`Sorted by: ${sortSelect.options[sortSelect.selectedIndex].text}`, 'info');
  });

  // ── Filter panel toggle ────────────────
  const filterBtn   = $('#filterBtn');
  const filterPanel = $('#filterPanel');

  on(filterBtn, 'click', () => {
    const isOpen = filterPanel.classList.contains('open');
    filterPanel.classList.toggle('open');
    filterPanel.setAttribute('aria-hidden', String(isOpen));
    filterBtn.setAttribute('aria-expanded', String(!isOpen));
    filterBtn.classList.toggle('active');
  });

  // ── BPM range sliders ──────────────────
  const bpmMin    = $('#bpmMin');
  const bpmMax    = $('#bpmMax');
  const bpmMinVal = $('#bpmMinVal');
  const bpmMaxVal = $('#bpmMaxVal');

  function updateBpmDisplay() {
    if (!bpmMin || !bpmMax) return;
    let lo = parseInt(bpmMin.value), hi = parseInt(bpmMax.value);
    if (lo > hi) [lo, hi] = [hi, lo];
    if (bpmMinVal) bpmMinVal.textContent = lo;
    if (bpmMaxVal) bpmMaxVal.textContent = hi;
  }

  on(bpmMin, 'input', updateBpmDisplay);
  on(bpmMax, 'input', updateBpmDisplay);

  // ── Load more ──────────────────────────
  const loadMoreBtn = $('#loadMoreBtn');
  on(loadMoreBtn, 'click', () => {
    const icon = loadMoreBtn.querySelector('i');
    if (icon) icon.style.transform = 'rotate(360deg)';
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = ' Loading…';
    loadMoreBtn.prepend(icon || '');

    setTimeout(() => {
      loadMoreBtn.disabled = false;
      if (icon) icon.style.transform = '';
      loadMoreBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Load More Beats';
      showToast('12 more beats loaded', 'info');
      // Remove skeleton cards
      $$('.is-skeleton').forEach(sk => sk.remove());
    }, 1200);
  });
})();


/* ═══════════════════════════════════════════
   9. PRODUCER FOLLOW BUTTONS
═══════════════════════════════════════════ */

(function initProducers() {
  on(document, 'click', (e) => {
    const followBtn = e.target.closest('.producer-follow-btn');
    if (!followBtn) return;

    const isFollowing = followBtn.getAttribute('aria-pressed') === 'true';
    followBtn.setAttribute('aria-pressed', String(!isFollowing));
    followBtn.textContent = isFollowing ? 'Follow' : 'Following';

    if (!isFollowing) {
      followBtn.style.background = 'var(--gradient-primary)';
      followBtn.style.color      = '#fff';
      followBtn.style.borderColor = 'transparent';
      const card = followBtn.closest('.producer-card');
      const name = card?.querySelector('.producer-name')?.textContent || 'Producer';
      showToast(`Now following ${name} 🎵`, 'success');
    } else {
      followBtn.style.background = '';
      followBtn.style.color      = '';
      followBtn.style.borderColor = '';
    }

    rippleEffect(followBtn, null, true);
  });
})();


/* ═══════════════════════════════════════════
   10. PRICING — BILLING TOGGLE
═══════════════════════════════════════════ */

(function initPricing() {
  const toggleBtns = $$('.pricing-toggle-btn');
  const amounts    = $$('.pricing-price .amount[data-monthly]');

  function setBilling(period) {
    toggleBtns.forEach(btn => {
      const isActive = btn.dataset.billing === period;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    amounts.forEach(el => {
      const from = parseInt(el.textContent, 10);
      const to   = parseInt(el.dataset[period], 10);
      if (isNaN(to)) return;

      // Animate price change
      const startTime = performance.now();
      function animatePrice(now) {
        const elapsed  = now - startTime;
        const progress = Math.min(elapsed / 300, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        const current  = Math.round(from + (to - from) * eased);
        el.textContent = current;
        if (progress < 1) requestAnimationFrame(animatePrice);
        else el.textContent = to;
      }
      requestAnimationFrame(animatePrice);
    });
  }

  toggleBtns.forEach(btn => {
    on(btn, 'click', () => setBilling(btn.dataset.billing));
  });
})();


/* ═══════════════════════════════════════════
   11. PERSISTENT AUDIO PLAYER
═══════════════════════════════════════════ */

let playerState = {
  playing: false,
  progress: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: false,
  duration: 225, // 3:45 in seconds
  currentTime: 0,
  intervalId: null,
};

function openPlayer(track) {
  const player = $('#audioPlayer');
  if (!player) return;

  // Populate track info
  if (track.title)    $('#playerTitle').textContent    = track.title;
  if (track.producer) $('#playerProducer').textContent = track.producer;
  if (track.art) {
    const img = $('#playerArt');
    if (img) img.src = track.art;
  }

  player.removeAttribute('aria-hidden');
  player.classList.add('visible');
  // Pad body so content isn't hidden behind player
  document.body.style.paddingBottom = 'var(--player-height)';

  // Auto-play
  if (!playerState.playing) togglePlay();
}

function closePlayer() {
  const player = $('#audioPlayer');
  if (!player) return;
  player.classList.remove('visible');
  player.setAttribute('aria-hidden', 'true');
  document.body.style.paddingBottom = '';
  stopProgress();
  playerState.playing = false;
  updatePlayPauseIcon();
}

function togglePlay() {
  playerState.playing = !playerState.playing;
  updatePlayPauseIcon();

  if (playerState.playing) {
    startProgress();
  } else {
    stopProgress();
  }
}

function updatePlayPauseIcon() {
  const btn  = $('#playPauseBtn');
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (!icon) return;
  icon.className = playerState.playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
  btn.setAttribute('aria-label', playerState.playing ? 'Pause' : 'Play');
}

function startProgress() {
  stopProgress();
  playerState.intervalId = setInterval(() => {
    playerState.currentTime += 0.25;
    if (playerState.currentTime >= playerState.duration) {
      if (playerState.repeat) {
        playerState.currentTime = 0;
      } else {
        playerState.currentTime = 0;
        playerState.playing = false;
        stopProgress();
        updatePlayPauseIcon();
        return;
      }
    }
    updateProgressUI();
  }, 250);
}

function stopProgress() {
  if (playerState.intervalId) clearInterval(playerState.intervalId);
  playerState.intervalId = null;
}

function updateProgressUI() {
  const { currentTime, duration } = playerState;
  const pct = (currentTime / duration) * 100;

  const bar   = $('#progressBar');
  const thumb = $('#progressThumb');
  const cur   = $('#currentTime');

  if (bar)   bar.style.width  = pct + '%';
  if (thumb) thumb.style.left = pct + '%';
  if (cur)   cur.textContent  = formatTime(currentTime);
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

(function initPlayer() {
  const playPauseBtn = $('#playPauseBtn');
  const playerProgress = $('#playerProgress');
  const nextBtn    = $('#nextBtn');
  const prevBtn    = $('#prevBtn');
  const muteBtn    = $('#muteBtn');
  const volumeSlider = $('#volumeSlider');
  const shuffleBtn = $('#shuffleBtn');
  const repeatBtn  = $('#repeatBtn');
  const playerClose = $('#playerClose');
  const playerLike = $('.player-like');
  const totalTimeEl = $('#totalTime');

  if (totalTimeEl) totalTimeEl.textContent = formatTime(playerState.duration);

  on(playPauseBtn, 'click', togglePlay);

  // Progress bar seek
  on(playerProgress, 'click', (e) => {
    const rect = playerProgress.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    playerState.currentTime = pct * playerState.duration;
    updateProgressUI();
  });

  // Progress bar keyboard
  on(playerProgress, 'keydown', (e) => {
    if (e.key === 'ArrowRight') playerState.currentTime = Math.min(playerState.currentTime + 5,  playerState.duration);
    if (e.key === 'ArrowLeft')  playerState.currentTime = Math.max(playerState.currentTime - 5,  0);
    updateProgressUI();
    const pct = (playerState.currentTime / playerState.duration) * 100;
    playerProgress.setAttribute('aria-valuenow', Math.round(pct));
  });

  on(nextBtn, 'click', () => {
    playerState.currentTime = 0;
    updateProgressUI();
    showToast('Next track', 'info');
  });

  on(prevBtn, 'click', () => {
    playerState.currentTime = 0;
    updateProgressUI();
    showToast('Previous track', 'info');
  });

  // Volume
  on(volumeSlider, 'input', () => {
    playerState.volume = volumeSlider.value / 100;
    playerState.muted  = playerState.volume === 0;
    updateVolumeIcon();
  });

  on(muteBtn, 'click', () => {
    playerState.muted = !playerState.muted;
    if (playerState.muted) {
      volumeSlider.value = 0;
    } else {
      volumeSlider.value = playerState.volume * 100 || 80;
    }
    updateVolumeIcon();
  });

  function updateVolumeIcon() {
    const icon = muteBtn?.querySelector('i');
    if (!icon) return;
    const v = parseFloat(volumeSlider?.value || 80);
    if (playerState.muted || v === 0) icon.className = 'fa-solid fa-volume-xmark';
    else if (v < 40)                  icon.className = 'fa-solid fa-volume-low';
    else                              icon.className = 'fa-solid fa-volume-high';
  }

  // Shuffle
  on(shuffleBtn, 'click', () => {
    playerState.shuffle = !playerState.shuffle;
    shuffleBtn.setAttribute('aria-pressed', String(playerState.shuffle));
    shuffleBtn.style.color = playerState.shuffle ? 'var(--accent-purple)' : '';
  });

  // Repeat
  on(repeatBtn, 'click', () => {
    playerState.repeat = !playerState.repeat;
    repeatBtn.setAttribute('aria-pressed', String(playerState.repeat));
    repeatBtn.style.color = playerState.repeat ? 'var(--accent-cyan)' : '';
  });

  // Like current track
  on(playerLike, 'click', () => {
    const isLiked = playerLike.getAttribute('aria-pressed') === 'true';
    playerLike.setAttribute('aria-pressed', String(!isLiked));
    const icon = playerLike.querySelector('i');
    if (icon) icon.className = isLiked ? 'fa-regular fa-heart' : 'fa-solid fa-heart';
    if (!isLiked) { playerLike.style.color = 'var(--accent-pink)'; heartBurst(playerLike); }
    else playerLike.style.color = '';
  });

  // Close player
  on(playerClose, 'click', closePlayer);

  // Player license btn
  on($('.player-license-btn'), 'click', () => openModal('uploadModalBackdrop'));

  // Space bar to play/pause (when not in an input)
  on(document, 'keydown', (e) => {
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)) {
      e.preventDefault();
      if ($('#audioPlayer')?.classList.contains('visible')) togglePlay();
    }
  });
})();

// Expose openPlayer globally so beat cards can trigger it
window.openPlayer = openPlayer;


/* ═══════════════════════════════════════════
   12. MODAL SYSTEM
═══════════════════════════════════════════ */

function openModal(backdropId) {
  const backdrop = $(`#${backdropId}`);
  if (!backdrop) return;
  backdrop.classList.add('open');
  backdrop.removeAttribute('aria-hidden');
  document.body.style.overflow = 'hidden';

  // Focus first focusable element
  setTimeout(() => {
    const first = backdrop.querySelector('input, button, select, textarea, [tabindex="0"]');
    if (first) first.focus();
  }, 100);
}

function closeModal(backdropId) {
  const backdrop = $(`#${backdropId}`);
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

(function initModals() {
  // Upload modal
  on($('#heroBrowseBtn'), 'click', () => openModal('uploadModalBackdrop'));
  on($('#mobileSignupBtn'), 'click', () => openModal('authModalBackdrop'));

  // Auth modal
  on($('#loginBtn'),    'click', () => { openModal('authModalBackdrop'); switchAuthTab('login'); });
  on($('#signupBtn'),   'click', () => { openModal('authModalBackdrop'); switchAuthTab('signup'); });
  on($('#heroUploadBtn'),'click', () => openModal('uploadModalBackdrop'));

  // Close buttons
  on($('#uploadModalClose'), 'click', () => closeModal('uploadModalBackdrop'));
  on($('#uploadCancelBtn'),  'click', () => closeModal('uploadModalBackdrop'));
  on($('#authModalClose'),   'click', () => closeModal('authModalBackdrop'));

  // Backdrop click to close
  $$('.modal-backdrop').forEach(backdrop => {
    on(backdrop, 'click', (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });

  // Escape key to close top modal
  on(document, 'keydown', (e) => {
    if (e.key !== 'Escape') return;
    $$('.modal-backdrop.open').forEach(b => closeModal(b.id));
  });

  // Focus trap in modal
  $$('.modal-backdrop').forEach(backdrop => {
    on(backdrop, 'keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusable = [...backdrop.querySelectorAll(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
      )];
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });
})();


/* ═══════════════════════════════════════════
   13. AUTH TABS
═══════════════════════════════════════════ */

function switchAuthTab(panel) {
  $$('.auth-tab').forEach(tab => {
    const isActive = tab.dataset.panel === panel;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  $$('.auth-panel').forEach(p => p.classList.add('hidden'));
  const target = $(`#${panel}Panel`);
  if (target) target.classList.remove('hidden');
}

(function initAuthTabs() {
  $$('.auth-tab').forEach(tab => {
    on(tab, 'click', () => switchAuthTab(tab.dataset.panel));
  });
})();


/* ═══════════════════════════════════════════
   14. AUTH FORMS
═══════════════════════════════════════════ */

(function initAuthForms() {
  // ── Password visibility toggle ─────────
  $$('.input-eye').forEach(btn => {
    on(btn, 'click', () => {
      const input = btn.parentElement.querySelector('input');
      if (!input) return;
      const isText = input.type === 'text';
      input.type   = isText ? 'password' : 'text';
      const icon   = btn.querySelector('i');
      if (icon) icon.className = isText ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
      btn.setAttribute('aria-label', isText ? 'Show password' : 'Hide password');
    });
  });

  // ── Password strength ──────────────────
  const pwInput = $('#signupPassword');
  const pwFill  = $('#pwFill');
  const pwLabel = $('#pwLabel');

  on(pwInput, 'input', () => {
    if (!pwFill || !pwLabel) return;
    const val = pwInput.value;
    let score = 0;

    if (val.length >= 8)              score++;
    if (/[A-Z]/.test(val))           score++;
    if (/[0-9]/.test(val))           score++;
    if (/[^A-Za-z0-9]/.test(val))    score++;

    const levels = [
      { pct: '0%',   color: '',                             label: '' },
      { pct: '25%',  color: 'var(--accent-red)',            label: 'Weak' },
      { pct: '50%',  color: 'var(--accent-yellow)',         label: 'Fair' },
      { pct: '75%',  color: 'var(--accent-cyan)',           label: 'Good' },
      { pct: '100%', color: 'var(--accent-green)',          label: 'Strong' },
    ];

    const level = levels[score] || levels[0];
    pwFill.style.width      = level.pct;
    pwFill.style.background = level.color;
    pwLabel.textContent     = level.label;
  });

  // ── Login form ─────────────────────────
  const loginForm  = $('#loginForm');
  const loginError = $('#loginError');

  on(loginForm, 'submit', async (e) => {
    e.preventDefault();
    const email    = $('#loginEmail')?.value?.trim();
    const password = $('#loginPassword')?.value;

    if (!email || !password) {
      showFormError(loginError, 'Please fill in all fields.');
      return;
    }

    const submitBtn = loginForm.querySelector('[type="submit"]');
    setButtonLoading(submitBtn, 'Logging in…');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Login failed');

      // Store token
      localStorage.setItem('cs_token', data.token);
      localStorage.setItem('cs_user', JSON.stringify(data.user));

      closeModal('authModalBackdrop');
      showToast(`Welcome back, ${data.user.username || 'Creator'}! 🎵`, 'success');
      updateNavForLoggedIn(data.user);

    } catch (err) {
      showFormError(loginError, err.message);
    } finally {
      resetButton(submitBtn, 'Log In');
    }
  });

  // ── Sign up form ───────────────────────
  const signupForm  = $('#signupForm');
  const signupError = $('#signupError');

  on(signupForm, 'submit', async (e) => {
    e.preventDefault();
    const username = $('#signupUsername')?.value?.trim();
    const email    = $('#signupEmail')?.value?.trim();
    const password = $('#signupPassword')?.value;
    const role     = signupForm.querySelector('input[name="role"]:checked')?.value || 'producer';

    if (!username || !email || !password) {
      showFormError(signupError, 'Please fill in all fields.');
      return;
    }

    if (password.length < 8) {
      showFormError(signupError, 'Password must be at least 8 characters.');
      return;
    }

    const submitBtn = signupForm.querySelector('[type="submit"]');
    setButtonLoading(submitBtn, 'Creating account…');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Registration failed');

      localStorage.setItem('cs_token', data.token);
      localStorage.setItem('cs_user', JSON.stringify(data.user));

      closeModal('authModalBackdrop');
      showToast(`Welcome to CreatorSync, ${username}! 🚀`, 'success');
      updateNavForLoggedIn(data.user);

    } catch (err) {
      showFormError(signupError, err.message);
    } finally {
      resetButton(submitBtn, 'Create Free Account');
    }
  });
})();

function showFormError(el, msg) {
  if (!el) return;
  el.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${msg}`;
  el.style.display = 'flex';
}

function setButtonLoading(btn, text) {
  if (!btn) return;
  btn.disabled = true;
  btn.dataset.original = btn.textContent;
  btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${text}`;
}

function resetButton(btn, text) {
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = text || btn.dataset.original || 'Submit';
}

function updateNavForLoggedIn(user) {
  const loginBtn  = $('#loginBtn');
  const signupBtn = $('#signupBtn');
  const avatarBtn = $('#userMenuBtn');

  if (loginBtn)  loginBtn.style.display  = 'none';
  if (signupBtn) signupBtn.style.display = 'none';
  if (avatarBtn) {
    avatarBtn.style.display = 'flex';
    const initials = $('#userInitials');
    if (initials) {
      initials.textContent = (user.username || 'U').substring(0, 2).toUpperCase();
    }
  }
}


/* ═══════════════════════════════════════════
   15. UPLOAD / DRAG-DROP ZONE
═══════════════════════════════════════════ */

(function initUpload() {
  const dropzone       = $('#uploadDropzone');
  const fileInput      = $('#fileInput');
  const browseBtn      = $('#dropzoneBrowse');
  const progressWrapper = $('#uploadProgressWrapper');
  const progressBar    = $('#uploadProgressBar');
  const progressLabel  = $('#uploadProgressLabel');

  if (!dropzone) return;

  // ── Browse click ────────────────────
  on(browseBtn, 'click', (e) => {
    e.stopPropagation();
    fileInput?.click();
  });

  on(dropzone, 'click', () => fileInput?.click());

  on(dropzone, 'keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput?.click(); }
  });

  // ── Drag events ─────────────────────
  ['dragenter', 'dragover'].forEach(evt => {
    on(dropzone, evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'dragend'].forEach(evt => {
    on(dropzone, evt, () => dropzone.classList.remove('drag-over'));
  });

  on(dropzone, 'drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const files = e.dataTransfer?.files;
    if (files?.length) handleFile(files[0]);
  });

  // ── File input change ───────────────
  on(fileInput, 'change', () => {
    if (fileInput?.files?.length) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    const ALLOWED = ['audio/wav', 'audio/mpeg', 'audio/aiff', 'audio/flac', 'audio/x-aiff'];
    const MAX_MB  = 100;

    if (!ALLOWED.includes(file.type) && !file.name.match(/\.(wav|mp3|aiff|flac)$/i)) {
      showToast('Unsupported file type. Use WAV, MP3, AIFF or FLAC.', 'error');
      return;
    }

    if (file.size > MAX_MB * 1024 * 1024) {
      showToast(`File too large. Max ${MAX_MB}MB allowed.`, 'error');
      return;
    }

    // Show mock progress
    if (progressWrapper) {
      progressWrapper.classList.add('visible');
      progressWrapper.removeAttribute('aria-hidden');
    }

    let pct = 0;
    const interval = setInterval(() => {
      pct = Math.min(pct + Math.random() * 12, 100);
      if (progressBar)  { progressBar.style.width = pct + '%'; progressBar.setAttribute('aria-valuenow', Math.round(pct)); }
      if (progressLabel) progressLabel.textContent = `Uploading… ${Math.round(pct)}%`;

      if (pct >= 100) {
        clearInterval(interval);
        if (progressLabel) progressLabel.textContent = 'Upload complete ✓';
        // Auto-populate beat title from filename
        const titleInput = $('#beatTitle');
        if (titleInput && !titleInput.value) {
          titleInput.value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
        }
        showToast(`"${file.name}" uploaded successfully!`, 'success');
      }
    }, 120);

    // Update dropzone UI
    const inner = dropzone.querySelector('.dropzone-icon i');
    if (inner) inner.className = 'fa-solid fa-circle-check';
    const title = dropzone.querySelector('.dropzone-title');
    if (title) title.textContent = file.name;
    const sub = dropzone.querySelector('.dropzone-sub');
    if (sub) sub.textContent = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Upload form submit ──────────────
  const uploadForm = $('#uploadForm');
  on(uploadForm, 'submit', async (e) => {
    e.preventDefault();

    const title = $('#beatTitle')?.value?.trim();
    const genre = $('#beatGenre')?.value;

    if (!title) {
      showToast('Please enter a beat title.', 'error');
      return;
    }
    if (!genre) {
      showToast('Please select a genre.', 'error');
      return;
    }

    const submitBtn = $('#uploadSubmitBtn');
    setButtonLoading(submitBtn, 'Publishing…');

    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));

    resetButton(submitBtn, '🚀 Publish Beat');
    closeModal('uploadModalBackdrop');
    showToast(`"${title}" is now live on the marketplace! 🎵`, 'success');

    uploadForm.reset();
    if (progressWrapper) progressWrapper.classList.remove('visible');
  });
})();


/* ═══════════════════════════════════════════
   16. TOAST NOTIFICATION SYSTEM
═══════════════════════════════════════════ */

const TOAST_ICONS = {
  success: 'fa-solid fa-circle-check',
  error:   'fa-solid fa-circle-xmark',
  info:    'fa-solid fa-circle-info',
  warning: 'fa-solid fa-triangle-exclamation',
};

function showToast(message, type = 'info', duration = 3500) {
  const container = $('#toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <i class="toast-icon ${TOAST_ICONS[type] || TOAST_ICONS.info}" aria-hidden="true"></i>
    <span>${message}</span>
    <button class="toast-close-btn" aria-label="Dismiss notification">
      <i class="fa-solid fa-xmark" aria-hidden="true"></i>
    </button>
  `;

  container.appendChild(toast);

  function dismiss() {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }

  on(toast.querySelector('.toast-close-btn'), 'click', dismiss);

  setTimeout(dismiss, duration);

  // Keep max 4 toasts
  const toasts = $$('.toast', container);
  if (toasts.length > 4) toasts[0].remove();
}

window.showToast = showToast; // expose globally


/* ═══════════════════════════════════════════
   17. BUTTON RIPPLE EFFECT
═══════════════════════════════════════════ */

function rippleEffect(el, event, center = false) {
  if (!el) return;

  const circle = document.createElement('span');
  const diameter = Math.max(el.offsetWidth, el.offsetHeight);
  const radius = diameter / 2;

  let x, y;
  if (center || !event) {
    x = el.offsetWidth  / 2 - radius;
    y = el.offsetHeight / 2 - radius;
  } else {
    const rect = el.getBoundingClientRect();
    x = event.clientX - rect.left - radius;
    y = event.clientY - rect.top  - radius;
  }

  circle.style.cssText = `
    position: absolute;
    border-radius: 50%;
    width: ${diameter}px;
    height: ${diameter}px;
    left: ${x}px;
    top: ${y}px;
    background: rgba(255,255,255,0.25);
    pointer-events: none;
    transform: scale(0);
    animation: rippleAnim 0.5s linear;
  `;

  // Inject keyframes once
  if (!document.getElementById('rippleKeyframes')) {
    const style = document.createElement('style');
    style.id = 'rippleKeyframes';
    style.textContent = `@keyframes rippleAnim { to { transform: scale(3); opacity: 0; } }`;
    document.head.appendChild(style);
  }

  el.style.position = el.style.position || 'relative';
  el.style.overflow = 'hidden';
  el.appendChild(circle);
  setTimeout(() => circle.remove(), 500);
}

// Apply ripple to all buttons
on(document, 'click', (e) => {
  const btn = e.target.closest('.btn');
  if (btn) rippleEffect(btn, e);
});


/* ═══════════════════════════════════════════
   18. HEART BURST ANIMATION
═══════════════════════════════════════════ */

function heartBurst(el) {
  if (!el) return;
  const count = 6;
  const rect  = el.getBoundingClientRect();
  const cx    = rect.left + rect.width  / 2;
  const cy    = rect.top  + rect.height / 2;

  for (let i = 0; i < count; i++) {
    const heart = document.createElement('span');
    const angle = (i / count) * Math.PI * 2;
    const dist  = 30 + Math.random() * 20;
    const tx    = Math.cos(angle) * dist;
    const ty    = Math.sin(angle) * dist;
    const scale = 0.6 + Math.random() * 0.8;

    heart.textContent = '♥';
    heart.style.cssText = `
      position: fixed;
      left: ${cx}px;
      top: ${cy}px;
      font-size: ${10 + Math.random() * 8}px;
      color: var(--accent-pink);
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%) scale(${scale});
      animation: heartFloat 0.7s ease-out forwards;
    `;

    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 700);
  }

  if (!document.getElementById('heartKeyframes')) {
    const style = document.createElement('style');
    style.id = 'heartKeyframes';
    style.textContent = `
      @keyframes heartFloat {
        0%   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(calc(-50% + var(--tx, 0px)), calc(-50% + var(--ty, 0px))) scale(0.3); }
      }
    `;
    document.head.appendChild(style);
  }
}


/* ═══════════════════════════════════════════
   19. AI CARDS — HOVER TILT
═══════════════════════════════════════════ */

(function initTiltEffect() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  $$('.ai-card, .pricing-card-featured, .preview-card').forEach(card => {
    on(card, 'mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;  // -0.5 to 0.5
      const y = (e.clientY - rect.top)  / rect.height - 0.5;

      card.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
    });

    on(card, 'mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.4s cubic-bezier(0.16,1,0.3,1)';
      setTimeout(() => { card.style.transition = ''; }, 400);
    });
  });
})();


/* ═══════════════════════════════════════════
   20. STICKY NAV ACTIVE LINK HIGHLIGHT
═══════════════════════════════════════════ */

(function initActiveNavHighlight() {
  // MobileMenu links mirror the desktop nav
  $$('.mobile-link[href^="#"]').forEach(link => {
    on(link, 'click', (e) => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const navH = 70;
      window.scrollTo({ top: target.offsetTop - navH, behavior: 'smooth' });
    });
  });
})();


/* ═══════════════════════════════════════════
   21. RESTORE SESSION (auto-login check)
═══════════════════════════════════════════ */

(function restoreSession() {
  try {
    const token = localStorage.getItem('cs_token');
    const user  = JSON.parse(localStorage.getItem('cs_user') || 'null');
    if (token && user) updateNavForLoggedIn(user);
  } catch (e) {
    // ignore
  }
})();


/* ═══════════════════════════════════════════
   22. GENRE STRIP — PAUSE ON HOVER (CSS handles
       it, but keyboard users also can pause)
═══════════════════════════════════════════ */

(function initGenreStrip() {
  const track = $('#genresTrack');
  if (!track) return;

  $$('.genre-tag').forEach(tag => {
    on(tag, 'click', () => {
      // Filter beats by genre when genre tag clicked
      const genre = tag.textContent.toLowerCase()
        .replace(/&amp;/g, '')
        .replace(/\s+/g, '')
        .replace('&', '')
        .trim();

      const map = { 'trap': 'trap', 'drill': 'drill', 'r&b': 'rnb', 'rb': 'rnb', 'rnb': 'rnb',
                    'lo-fi': 'lofi', 'lofi': 'lofi', 'afrobeats': 'afrobeats', 'hiphop': 'hiphop',
                    'hip-hop': 'hiphop', 'pop': 'pop', 'house': 'house' };

      const mapped = map[genre] || 'all';

      // Scroll to marketplace
      const marketSection = $('#marketplace');
      if (marketSection) {
        window.scrollTo({ top: marketSection.offsetTop - 70, behavior: 'smooth' });
      }

      // Activate corresponding filter chip
      const chip = $(`[data-filter="genre"][data-value="${mapped}"]`);
      if (chip) {
        chip.click();
      }

      showToast(`Browsing: ${tag.textContent}`, 'info');
    });
  });
})();


/* ═══════════════════════════════════════════
   23. GLOBAL SEARCH — LIVE FILTER
═══════════════════════════════════════════ */

(function initGlobalSearch() {
  const input = $('#globalSearch');
  if (!input) return;

  const doSearch = debounce((query) => {
    if (!query) {
      $$('.beat-card:not(.is-skeleton)').forEach(c => { c.style.display = ''; c.style.opacity = '1'; });
      return;
    }

    const q = query.toLowerCase();
    $$('.beat-card:not(.is-skeleton)').forEach(card => {
      const title    = card.querySelector('.beat-card-title')?.textContent?.toLowerCase()  || '';
      const producer = card.querySelector('.beat-card-producer')?.textContent?.toLowerCase() || '';
      const genre    = card.dataset.genre || '';
      const match    = title.includes(q) || producer.includes(q) || genre.includes(q);
      card.style.display  = match ? '' : 'none';
      card.style.opacity  = match ? '1' : '0';
    });
  }, 280);

  on(input, 'input', () => doSearch(input.value.trim()));
})();


/* ═══════════════════════════════════════════
   24. PAGE LOAD — REMOVE SKELETONS
═══════════════════════════════════════════ */

window.addEventListener('load', () => {
  // Simulate API data load — remove skeleton placeholders after 800ms
  setTimeout(() => {
    $$('.is-skeleton').forEach(sk => {
      sk.style.transition = 'opacity 0.4s';
      sk.style.opacity = '0';
      setTimeout(() => sk.remove(), 400);
    });
  }, 800);

  // Log app ready
  console.log('%cCreatorSync v3.0 ready 🎵', 'color:#7C3AED;font-weight:700;font-size:14px;');
});


/* ═══════════════════════════════════════════
   25. MINIMAL PERFORMANCE MONITORING
═══════════════════════════════════════════ */

if ('PerformanceObserver' in window) {
  try {
    const obs = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.value > 100) {
          console.warn('[CLS]', entry.value);
        }
      });
    });
    obs.observe({ type: 'layout-shift', buffered: true });
  } catch (_) {}
}
