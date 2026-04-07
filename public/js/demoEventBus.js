// CreatorSync Demo Event Bus for Static Real-Time Simulation
(function() {
    const listeners = {};
    window.DemoEventBus = {
        on(event, cb) {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(cb);
        },
        emit(event, payload) {
            (listeners[event] || []).forEach(cb => cb(payload));
        }
    };
    // Simulate real-time events every 10s
    const DEMO_EVENTS = [
        { type: 'upload', user: 'Ava', detail: 'uploaded a new beat: "Midnight Drive"' },
        { type: 'collab', user: 'Jay', detail: 'joined a collab session with Mia' },
        { type: 'radio', user: 'Liam', detail: 'track "Sunset Groove" is now playing on Radio' },
        { type: 'purchase', user: 'Mia', detail: 'purchased a license for "Neon Nights"' },
        { type: 'listen', user: 'Noah', detail: 'is listening to "Dreamscape"' }
    ];
    let idx = 0;
    setInterval(() => {
        const ev = DEMO_EVENTS[idx % DEMO_EVENTS.length];
        window.DemoEventBus.emit('activity', ev);
        window.DemoEventBus.emit('notification', `${ev.user} ${ev.detail}`);
        idx++;
    }, 10000);
})();
