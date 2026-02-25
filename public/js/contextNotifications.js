// CreatorSync Contextual Notifications (static/demo)
(function() {
    function showNotification(msg) {
        const notif = document.createElement('div');
        notif.className = 'context-notification';
        notif.style.position = 'fixed';
        notif.style.top = '5.5em';
        notif.style.right = '2em';
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
    // Demo: show random notifications every 12s
    const DEMO_NOTIFS = [
        'Your track was just played on Radio!',
        'You have a new collab invite.',
        'Ella joined your session.',
        '808 Dreams is trending now!',
        'Ava purchased a license for Neon Nights.'
    ];
    setInterval(() => {
        const msg = DEMO_NOTIFS[Math.floor(Math.random() * DEMO_NOTIFS.length)];
        showNotification(msg);
    }, 12000);
    window.showNotification = showNotification;
})();
