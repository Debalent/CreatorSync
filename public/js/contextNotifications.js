// CreatorSync Contextual Notifications (static/demo)
(function() {
    function showNotification(msg) {
        const notif = document.createElement('div');
        notif.className = 'context-notification';
        notif.style.position = 'fixed';
        notif.style.top = '86px';
        notif.style.right = '24px';
        notif.style.background = '#ff9800';
        notif.style.color = '#222';
        notif.style.fontWeight = 'bold';
        notif.style.padding = '1em 1.5em';
        notif.style.borderRadius = '12px';
        notif.style.boxShadow = '0 2px 12px rgba(0,0,0,0.18)';
        notif.style.zIndex = '9999';
        notif.style.fontSize = '1.05em';
        notif.style.letterSpacing = '0.03em';
        notif.innerText = msg;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3200);
    }
    // Listen for DemoEventBus 'notification' events
    if (window.DemoEventBus) {
        window.DemoEventBus.on('notification', showNotification);
    }
    window.showNotification = showNotification;
})();
