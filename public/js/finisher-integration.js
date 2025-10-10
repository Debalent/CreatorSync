/**
 * Finisher Integration Manager
 * Handles embedding and communication with The Finisher app
 */

class FinisherIntegration {
    constructor() {
        this.socket = null;
        this.subscriptionStatus = null;
        this.integrationConfig = {
            method: 'iframe', // iframe, api, desktop
            url: '',
            apiEndpoint: '',
            apiKey: '',
            desktopProtocol: 'finisher://'
        };
        
        this.init();
    }

    async init() {
        console.log('🎵 Initializing Finisher Integration...');
        
        // Connect to Socket.IO
        this.connectSocket();
        
        // Load configuration from localStorage
        this.loadConfiguration();
        
        // Check subscription status
        await this.checkSubscription();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize integration based on subscription
        this.initializeIntegration();
    }

    connectSocket() {
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('✅ Connected to CreatorSync server');
                this.authenticateSocket();
            });
            
            this.socket.on('finisher_message', (data) => {
                this.handleFinisherMessage(data);
            });
            
            this.socket.on('subscription_updated', (data) => {
                this.handleSubscriptionUpdate(data);
            });
            
        } catch (error) {
            console.error('❌ Socket connection failed:', error);
        }
    }

    authenticateSocket() {
        const userData = this.getUserData();
        if (userData) {
            this.socket.emit('authenticate', userData);
        }
    }

    getUserData() {
        try {
            return JSON.parse(localStorage.getItem('userData')) || null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    loadConfiguration() {
        try {
            const savedConfig = localStorage.getItem('finisherConfig');
            if (savedConfig) {
                this.integrationConfig = { ...this.integrationConfig, ...JSON.parse(savedConfig) };
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
        }
    }

    saveConfiguration() {
        try {
            localStorage.setItem('finisherConfig', JSON.stringify(this.integrationConfig));
            console.log('✅ Configuration saved');
        } catch (error) {
            console.error('❌ Error saving configuration:', error);
        }
    }

    async checkSubscription() {
        try {
            const userData = this.getUserData();
            if (!userData) {
                this.showNoAccess('Please log in to access The Finisher');
                return;
            }

            // Show loading state
            this.showSubscriptionCheck();

            const response = await fetch('/api/subscriptions/finisher-access', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${userData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.subscriptionStatus = data;

            // Update UI with subscription status
            this.updateSubscriptionDisplay(data);

            if (data.hasAccess) {
                console.log('✅ Finisher access granted');
                this.showFinisherApp();
            } else {
                console.log('❌ No Finisher access');
                this.showNoAccess('Subscription required for Finisher access');
            }

        } catch (error) {
            console.error('❌ Subscription check failed:', error);
            this.showNoAccess('Unable to verify subscription. Please try again.');
        }
    }

    updateSubscriptionDisplay(subscriptionData) {
        const statusBadge = document.getElementById('statusBadge');
        const planName = document.getElementById('planName');
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');

        if (subscriptionData.hasAccess) {
            statusBadge.textContent = subscriptionData.plan.toUpperCase();
            statusBadge.className = `status-badge ${subscriptionData.plan.toLowerCase()}`;
            planName.textContent = `${subscriptionData.plan} Plan`;
        }

        const userData = this.getUserData();
        if (userData) {
            userName.textContent = userData.username || userData.email || 'User';
            if (userData.avatar) {
                userAvatar.src = userData.avatar;
            }
        }
    }

    showSubscriptionCheck() {
        document.getElementById('subscriptionCheck').style.display = 'flex';
        document.getElementById('finisherAppContainer').style.display = 'none';
        document.getElementById('noAccess').style.display = 'none';
    }

    showFinisherApp() {
        document.getElementById('subscriptionCheck').style.display = 'none';
        document.getElementById('finisherAppContainer').style.display = 'block';
        document.getElementById('noAccess').style.display = 'none';
        
        // Initialize the appropriate integration method
        this.initializeFinisherApp();
    }

    showNoAccess(message) {
        document.getElementById('subscriptionCheck').style.display = 'none';
        document.getElementById('finisherAppContainer').style.display = 'none';
        document.getElementById('noAccess').style.display = 'flex';
        
        // Update message if provided
        if (message) {
            const messageElement = document.querySelector('.no-access-content p');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    }

    initializeFinisherApp() {
        switch (this.integrationConfig.method) {
            case 'iframe':
                this.initializeIframeIntegration();
                break;
            case 'api':
                this.initializeApiIntegration();
                break;
            case 'desktop':
                this.initializeDesktopIntegration();
                break;
            default:
                this.showDirectIntegration();
        }
    }

    initializeIframeIntegration() {
        const iframe = document.getElementById('finisherFrame');
        const directDiv = document.getElementById('finisherDirect');
        
        if (this.integrationConfig.url) {
            // Set iframe source with authentication parameters
            const userData = this.getUserData();
            const authParams = userData ? `?auth=${encodeURIComponent(userData.token)}` : '';
            const fullUrl = this.integrationConfig.url + authParams;
            
            iframe.src = fullUrl;
            iframe.style.display = 'block';
            directDiv.style.display = 'none';
            
            // Set up iframe communication
            this.setupIframeMessaging();
            
            console.log('✅ Iframe integration initialized');
        } else {
            this.showDirectIntegration();
        }
    }

    setupIframeMessaging() {
        window.addEventListener('message', (event) => {
            // Verify origin for security
            if (this.integrationConfig.url && !event.origin.startsWith(new URL(this.integrationConfig.url).origin)) {
                return;
            }
            
            this.handleFinisherMessage(event.data);
        });
    }

    async initializeApiIntegration() {
        const directDiv = document.getElementById('finisherDirect');
        const iframe = document.getElementById('finisherFrame');
        
        iframe.style.display = 'none';
        directDiv.style.display = 'block';
        
        try {
            // Test API connection
            if (this.integrationConfig.apiEndpoint && this.integrationConfig.apiKey) {
                const response = await fetch(`${this.integrationConfig.apiEndpoint}/health`, {
                    headers: {
                        'Authorization': `Bearer ${this.integrationConfig.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    console.log('✅ API integration connected');
                    this.loadApiInterface();
                } else {
                    throw new Error('API connection failed');
                }
            }
        } catch (error) {
            console.error('❌ API integration failed:', error);
            this.showDirectIntegration();
        }
    }

    initializeDesktopIntegration() {
        try {
            const userData = this.getUserData();
            const protocol = this.integrationConfig.desktopProtocol;
            const authData = userData ? btoa(JSON.stringify(userData)) : '';
            const launchUrl = `${protocol}launch?auth=${authData}`;
            
            // Attempt to launch desktop app
            window.location.href = launchUrl;
            
            console.log('✅ Desktop integration launched');
            
            // Show fallback message
            setTimeout(() => {
                this.showDirectIntegration();
            }, 3000);
            
        } catch (error) {
            console.error('❌ Desktop integration failed:', error);
            this.showDirectIntegration();
        }
    }

    showDirectIntegration() {
        const iframe = document.getElementById('finisherFrame');
        const directDiv = document.getElementById('finisherDirect');
        
        iframe.style.display = 'none';
        directDiv.style.display = 'block';
        
        console.log('📋 Showing direct integration options');
    }

    loadApiInterface() {
        // This would load a custom interface for API-based integration
        // For now, show the direct integration message
        this.showDirectIntegration();
    }

    handleFinisherMessage(data) {
        console.log('📨 Message from Finisher:', data);
        
        switch (data.type) {
            case 'project_saved':
                this.handleProjectSaved(data);
                break;
            case 'collaboration_request':
                this.handleCollaborationRequest(data);
                break;
            case 'error':
                this.handleFinisherError(data);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    handleProjectSaved(data) {
        // Sync project data with CreatorSync
        if (this.socket) {
            this.socket.emit('finisher_project_update', data);
        }
        
        this.showToast('Project saved successfully', 'success');
    }

    handleCollaborationRequest(data) {
        // Handle collaboration invites from Finisher
        if (this.socket) {
            this.socket.emit('collaboration_invite', data);
        }
    }

    handleFinisherError(data) {
        console.error('Finisher error:', data.message);
        this.showToast(data.message || 'An error occurred in The Finisher', 'error');
    }

    handleSubscriptionUpdate(data) {
        this.subscriptionStatus = data;
        this.updateSubscriptionDisplay(data);
        
        if (!data.hasAccess) {
            this.showNoAccess('Your subscription has been cancelled or expired');
        } else if (document.getElementById('noAccess').style.display !== 'none') {
            // User just got access, reload the app
            this.showFinisherApp();
        }
    }

    setupEventListeners() {
        // Back to CreatorSync button
        document.getElementById('backToCreatorSync')?.addEventListener('click', () => {
            this.goBackToCreatorSync();
        });

        // User menu
        document.getElementById('userMenu')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleUserMenu();
        });

        // Integration configuration
        document.getElementById('saveIntegration')?.addEventListener('click', () => {
            this.saveIntegrationConfig();
        });

        // Modal close buttons
        document.querySelectorAll('[data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.closest('[data-modal]').getAttribute('data-modal');
                this.closeModal(modalId);
            });
        });

        // Close modals on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Close user menu on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#userMenu') && !e.target.closest('#userMenuDropdown')) {
                document.getElementById('userMenuDropdown')?.classList.remove('show');
            }
        });
    }

    goBackToCreatorSync() {
        // Navigate back to main CreatorSync interface
        window.location.href = '/';
    }

    toggleUserMenu() {
        const dropdown = document.getElementById('userMenuDropdown');
        dropdown?.classList.toggle('show');
    }

    openIntegrationConfig() {
        document.getElementById('integrationModal').style.display = 'flex';
        this.populateConfigForm();
    }

    populateConfigForm() {
        // Populate form with current configuration
        document.getElementById('finisherUrl').value = this.integrationConfig.url || '';
        document.getElementById('apiEndpoint').value = this.integrationConfig.apiEndpoint || '';
        document.getElementById('apiKey').value = this.integrationConfig.apiKey || '';
        document.getElementById('desktopProtocol').value = this.integrationConfig.desktopProtocol || 'finisher://';
        
        // Select current integration method
        const methodRadio = document.getElementById(`${this.integrationConfig.method}Integration`);
        if (methodRadio) {
            methodRadio.checked = true;
        }
    }

    saveIntegrationConfig() {
        // Get selected integration method
        const selectedMethod = document.querySelector('input[name="integration"]:checked')?.value;
        
        if (selectedMethod) {
            this.integrationConfig.method = selectedMethod;
            this.integrationConfig.url = document.getElementById('finisherUrl').value;
            this.integrationConfig.apiEndpoint = document.getElementById('apiEndpoint').value;
            this.integrationConfig.apiKey = document.getElementById('apiKey').value;
            this.integrationConfig.desktopProtocol = document.getElementById('desktopProtocol').value;
            
            this.saveConfiguration();
            this.closeModal('integrationModal');
            
            // Reinitialize with new configuration
            if (this.subscriptionStatus?.hasAccess) {
                this.initializeFinisherApp();
            }
            
            this.showToast('Integration configuration saved', 'success');
        }
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    openSubscriptionSettings() {
        // Redirect to subscription management
        window.open('/subscription-settings', '_blank');
    }

    openSupport() {
        // Open support chat or redirect to support page
        window.open('/support', '_blank');
    }

    logout() {
        localStorage.removeItem('userData');
        localStorage.removeItem('authToken');
        window.location.href = '/';
    }

    showToast(message, type = 'info') {
        // Create and show toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    initializeIntegration() {
        console.log('🎵 Finisher Integration Ready');
    }
}

// Global functions for HTML onclick handlers
window.upgradeSubscription = async function(plan) {
    try {
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData) {
            window.location.href = '/#login';
            return;
        }

        const response = await fetch('/api/subscriptions/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userData.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ plan })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            }
        } else {
            throw new Error('Subscription creation failed');
        }
    } catch (error) {
        console.error('Subscription error:', error);
        alert('Failed to create subscription. Please try again.');
    }
};

window.goBackToCreatorSync = function() {
    window.location.href = '/';
};

window.openIntegrationConfig = function() {
    if (window.finisherIntegration) {
        window.finisherIntegration.openIntegrationConfig();
    }
};

window.openSubscriptionSettings = function() {
    if (window.finisherIntegration) {
        window.finisherIntegration.openSubscriptionSettings();
    }
};

window.openSupport = function() {
    if (window.finisherIntegration) {
        window.finisherIntegration.openSupport();
    }
};

window.logout = function() {
    if (window.finisherIntegration) {
        window.finisherIntegration.logout();
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.finisherIntegration = new FinisherIntegration();
});

// Add toast styles to head
const toastStyles = `
<style>
.toast {
    position: fixed;
    top: 80px;
    right: 20px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 400px;
}

.toast.show {
    transform: translateX(0);
}

.toast-success {
    border-left: 4px solid var(--success-color);
}

.toast-error {
    border-left: 4px solid var(--error-color);
}

.toast-info {
    border-left: 4px solid var(--primary-color);
}

.toast i {
    font-size: 1.2rem;
}

.toast-success i {
    color: var(--success-color);
}

.toast-error i {
    color: var(--error-color);
}

.toast-info i {
    color: var(--primary-color);
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', toastStyles);