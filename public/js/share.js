// CreatorSync - Social Media Sharing System
// Enables creators to share their beats across all major platforms

class ShareManager {
    constructor() {
        this.currentBeat = null;
        this.platformURL = window.location.origin;
        this.init();
    }

    init() {
        this.bindShareEvents();
        this.createShareModal();
    }

    /**
     * Create share modal dynamically
     */
    createShareModal() {
        const modalHTML = `
            <div class="modal" id="shareModal">
                <div class="modal-content share-modal-content">
                    <div class="modal-header">
                        <h2>Share This Beat</h2>
                        <button class="modal-close" id="shareModalClose">&times;</button>
                    </div>
                    <div class="share-modal-body">
                        <div class="share-beat-info">
                            <img src="" alt="" class="share-beat-artwork" id="shareBeatArtwork">
                            <div class="share-beat-details">
                                <h3 id="shareBeatTitle"></h3>
                                <p id="shareBeatArtist"></p>
                            </div>
                        </div>
                        
                        <div class="share-section">
                            <h4 class="share-category-title">
                                <i class="fas fa-music"></i> Music Streaming Platforms
                            </h4>
                            <div class="share-buttons-grid">
                                <button class="share-btn soundcloud-btn" data-platform="soundcloud" title="Share to SoundCloud">
                                    <i class="fab fa-soundcloud"></i>
                                    <span>SoundCloud</span>
                                </button>
                                <button class="share-btn apple-music-btn" data-platform="apple-music" title="Share to Apple Music">
                                    <i class="fab fa-apple"></i>
                                    <span>Apple Music</span>
                                </button>
                                <button class="share-btn youtube-btn" data-platform="youtube" title="Share to YouTube">
                                    <i class="fab fa-youtube"></i>
                                    <span>YouTube</span>
                                </button>
                                <button class="share-btn amazon-btn" data-platform="amazon-music" title="Share to Amazon Music">
                                    <i class="fab fa-amazon"></i>
                                    <span>Amazon Music</span>
                                </button>
                                <button class="share-btn spotify-btn" data-platform="spotify" title="Share to Spotify">
                                    <i class="fab fa-spotify"></i>
                                    <span>Spotify</span>
                                </button>
                            </div>
                        </div>

                        <div class="share-section">
                            <h4 class="share-category-title">
                                <i class="fas fa-share-alt"></i> Social Networks
                            </h4>
                            <div class="share-buttons-grid">
                                <button class="share-btn tiktok-btn" data-platform="tiktok" title="Share to TikTok">
                                    <i class="fab fa-tiktok"></i>
                                    <span>TikTok</span>
                                </button>
                                <button class="share-btn instagram-btn" data-platform="instagram" title="Share to Instagram">
                                    <i class="fab fa-instagram"></i>
                                    <span>Instagram</span>
                                </button>
                                <button class="share-btn facebook-btn" data-platform="facebook" title="Share to Facebook">
                                    <i class="fab fa-facebook"></i>
                                    <span>Facebook</span>
                                </button>
                                <button class="share-btn twitter-btn" data-platform="twitter" title="Share to Twitter/X">
                                    <i class="fab fa-twitter"></i>
                                    <span>Twitter/X</span>
                                </button>
                                <button class="share-btn linkedin-btn" data-platform="linkedin" title="Share to LinkedIn">
                                    <i class="fab fa-linkedin"></i>
                                    <span>LinkedIn</span>
                                </button>
                            </div>
                        </div>

                        <div class="share-section">
                            <h4 class="share-category-title">
                                <i class="fas fa-comment"></i> Messaging Apps
                            </h4>
                            <div class="share-buttons-grid">
                                <button class="share-btn whatsapp-btn" data-platform="whatsapp" title="Share via WhatsApp">
                                    <i class="fab fa-whatsapp"></i>
                                    <span>WhatsApp</span>
                                </button>
                                <button class="share-btn telegram-btn" data-platform="telegram" title="Share via Telegram">
                                    <i class="fab fa-telegram"></i>
                                    <span>Telegram</span>
                                </button>
                                <button class="share-btn messenger-btn" data-platform="messenger" title="Share via Messenger">
                                    <i class="fab fa-facebook-messenger"></i>
                                    <span>Messenger</span>
                                </button>
                                <button class="share-btn email-btn" data-platform="email" title="Share via Email">
                                    <i class="fas fa-envelope"></i>
                                    <span>Email</span>
                                </button>
                            </div>
                        </div>

                        <div class="share-section">
                            <h4 class="share-category-title">
                                <i class="fas fa-link"></i> Copy Link
                            </h4>
                            <div class="share-link-container">
                                <input type="text" class="share-link-input" id="shareLinkInput" readonly>
                                <button class="btn btn-primary copy-link-btn" id="copyLinkBtn">
                                    <i class="fas fa-copy"></i> Copy Link
                                </button>
                            </div>
                        </div>

                        <div class="share-stats">
                            <p><i class="fas fa-eye"></i> <span id="shareViews">0</span> views</p>
                            <p><i class="fas fa-share"></i> <span id="shareCount">0</span> shares</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Bind modal close event
        document.getElementById('shareModalClose').addEventListener('click', () => {
            this.closeShareModal();
        });

        // Bind copy link button
        document.getElementById('copyLinkBtn').addEventListener('click', () => {
            this.copyLink();
        });
    }

    /**
     * Bind share button events
     */
    bindShareEvents() {
        // Listen for share button clicks throughout the app
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-share-beat]') || e.target.id === 'shareBtn') {
                e.preventDefault();
                const beatId = e.target.closest('[data-share-beat]')?.dataset.shareBeat;
                this.openShareModal(beatId || this.getCurrentBeatId());
            }

            // Platform share buttons
            if (e.target.closest('[data-platform]')) {
                const platform = e.target.closest('[data-platform]').dataset.platform;
                this.shareToplatform(platform);
            }
        });
    }

    /**
     * Open share modal with beat info
     */
    openShareModal(beatId) {
        // Get beat data (would fetch from API in production)
        const beat = this.getBeatData(beatId);
        if (!beat) return;

        this.currentBeat = beat;

        // Update modal content
        document.getElementById('shareBeatArtwork').src = beat.artwork || '/assets/default-artwork.jpg';
        document.getElementById('shareBeatTitle').textContent = beat.title;
        document.getElementById('shareBeatArtist').textContent = `by ${beat.artist}`;
        
        // Generate shareable link
        const shareURL = `${this.platformURL}/beat/${beat.id}`;
        document.getElementById('shareLinkInput').value = shareURL;

        // Update stats
        document.getElementById('shareViews').textContent = beat.plays || 0;
        document.getElementById('shareCount').textContent = beat.shares || 0;

        // Show modal
        document.getElementById('shareModal').classList.add('active');
    }

    /**
     * Close share modal
     */
    closeShareModal() {
        document.getElementById('shareModal').classList.remove('active');
    }

    /**
     * Share to specific platform
     */
    shareToplatform(platform) {
        if (!this.currentBeat) return;

        const beat = this.currentBeat;
        const shareURL = `${this.platformURL}/beat/${beat.id}`;
        const title = `${beat.title} by ${beat.artist}`;
        const description = `Check out this amazing beat on CreatorSync! ${beat.bpm} BPM | ${beat.key || ''} | ${beat.category}`;
        const hashtags = ['CreatorSync', 'Beats', beat.category, 'MusicProduction'].join(',');

        let targetURL = '';

        switch (platform) {
            case 'facebook':
                targetURL = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareURL)}&quote=${encodeURIComponent(title + ' - ' + description)}`;
                break;

            case 'twitter':
                targetURL = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareURL)}&text=${encodeURIComponent(title)}&hashtags=${hashtags}`;
                break;

            case 'linkedin':
                targetURL = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareURL)}`;
                break;

            case 'whatsapp':
                targetURL = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' - ' + shareURL)}`;
                break;

            case 'telegram':
                targetURL = `https://t.me/share/url?url=${encodeURIComponent(shareURL)}&text=${encodeURIComponent(title)}`;
                break;

            case 'messenger':
                targetURL = `fb-messenger://share/?link=${encodeURIComponent(shareURL)}`;
                break;

            case 'email':
                targetURL = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description + '\n\n' + shareURL)}`;
                break;

            case 'tiktok':
                // TikTok doesn't have direct sharing API, open profile/upload page
                targetURL = 'https://www.tiktok.com/upload';
                this.showTikTokInstructions(shareURL);
                break;

            case 'instagram':
                // Instagram doesn't allow direct sharing, copy link and show instructions
                this.copyLink();
                this.showInstagramInstructions();
                return;

            case 'soundcloud':
                // Open SoundCloud upload page
                targetURL = 'https://soundcloud.com/upload';
                this.showStreamingInstructions('SoundCloud', shareURL);
                break;

            case 'apple-music':
                // Apple Music for Artists
                targetURL = 'https://artists.apple.com/';
                this.showStreamingInstructions('Apple Music', shareURL);
                break;

            case 'youtube':
                // YouTube Studio upload
                targetURL = 'https://studio.youtube.com/';
                this.showStreamingInstructions('YouTube Music', shareURL);
                break;

            case 'amazon-music':
                // Amazon Music for Artists
                targetURL = 'https://artists.amazonmusic.com/';
                this.showStreamingInstructions('Amazon Music', shareURL);
                break;

            case 'spotify':
                // Spotify for Artists
                targetURL = 'https://artists.spotify.com/';
                this.showStreamingInstructions('Spotify', shareURL);
                break;

            default:
                console.warn('Unknown platform:', platform);
                return;
        }

        if (targetURL) {
            // Track share event
            this.trackShare(platform);
            
            // Open in new window
            window.open(targetURL, '_blank', 'width=600,height=600');
        }
    }

    /**
     * Copy link to clipboard
     */
    copyLink() {
        const input = document.getElementById('shareLinkInput');
        input.select();
        input.setSelectionRange(0, 99999); // For mobile devices

        try {
            document.execCommand('copy');
            this.showToast('Link copied to clipboard!', 'success');
            
            // Update button temporarily
            const btn = document.getElementById('copyLinkBtn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            this.showToast('Failed to copy link', 'error');
        }
    }

    /**
     * Show Instagram sharing instructions
     */
    showInstagramInstructions() {
        this.showToast('Link copied! Open Instagram and paste in your bio or story', 'info', 5000);
    }

    /**
     * Show TikTok sharing instructions
     */
    showTikTokInstructions(url) {
        this.copyLink();
        this.showToast('Link copied! Add it to your TikTok video caption or bio', 'info', 5000);
    }

    /**
     * Show streaming platform instructions
     */
    showStreamingInstructions(platform, url) {
        this.copyLink();
        this.showToast(`Link copied! Use it in your ${platform} profile or description`, 'info', 5000);
    }

    /**
     * Track share event
     */
    trackShare(platform) {
        // Send analytics event
        if (this.currentBeat) {
            fetch('/api/analytics/share', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    beatId: this.currentBeat.id,
                    platform: platform,
                    timestamp: new Date().toISOString()
                })
            }).catch(err => console.error('Failed to track share:', err));

            // Increment share count
            const shareCountEl = document.getElementById('shareCount');
            if (shareCountEl) {
                const currentCount = parseInt(shareCountEl.textContent) || 0;
                shareCountEl.textContent = currentCount + 1;
            }
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Get beat data (mock - would fetch from API)
     */
    getBeatData(beatId) {
        // In production, this would fetch from API
        // For now, return mock data or get from app instance
        if (window.creatorSyncApp && window.creatorSyncApp.currentTrack) {
            return window.creatorSyncApp.currentTrack;
        }

        // Mock data fallback
        return {
            id: beatId || '1',
            title: 'Amazing Beat',
            artist: 'ProducerX',
            artwork: '/assets/default-artwork.jpg',
            bpm: 140,
            key: 'C Minor',
            category: 'Hip Hop',
            plays: 1847,
            shares: 23
        };
    }

    /**
     * Get current beat ID from player
     */
    getCurrentBeatId() {
        if (window.creatorSyncApp && window.creatorSyncApp.currentTrack) {
            return window.creatorSyncApp.currentTrack.id;
        }
        return '1';
    }
}

// Initialize share manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.shareManager = new ShareManager();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShareManager;
}
