// CreatorSync Live Activity Feed (static/demo version)
(function() {
    let FEED_EVENTS = [
        { type: 'upload', user: 'Ava', detail: 'uploaded a new beat: "Midnight Drive"', time: 'just now' },
        { type: 'collab', user: 'Jay', detail: 'joined a collab session with Mia', time: '1 min ago' },
        { type: 'radio', user: 'Liam', detail: 'track "Sunset Groove" is now playing on Radio', time: '2 min ago' },
        { type: 'purchase', user: 'Mia', detail: 'purchased a license for "Neon Nights"', time: '3 min ago' },
        { type: 'listen', user: 'Noah', detail: 'is listening to "Dreamscape"', time: '5 min ago' },
        { type: 'team', user: 'Ella', detail: 'created a new team: "Synthwave Collective"', time: '7 min ago' },
        { type: 'like', user: 'Zoe', detail: 'liked "808 Dreams"', time: '8 min ago' },
        { type: 'save', user: 'Kai', detail: 'saved "Golden Hour" to favorites', time: '10 min ago' }
    ];

    // Hidden by default on mobile; visible on desktop
    let panelVisible = window.innerWidth > 640;

    function getOrCreateToggle() {
        let btn = document.getElementById('activity-feed-toggle');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'activity-feed-toggle';
            btn.setAttribute('aria-label', 'Toggle Live Activity panel');
            btn.setAttribute('aria-expanded', String(panelVisible));
            btn.innerHTML = '&#x26A1; Activity';
            btn.addEventListener('click', function() {
                panelVisible = !panelVisible;
                const panel = document.getElementById('activity-feed');
                if (panel) panel.style.display = panelVisible ? '' : 'none';
                btn.setAttribute('aria-expanded', String(panelVisible));
            });
            document.body.appendChild(btn);
        }
        return btn;
    }

    function renderFeed() {
        getOrCreateToggle();

        let feed = document.getElementById('activity-feed');
        if (!feed) {
            feed = document.createElement('div');
            feed.id = 'activity-feed';
            feed.style.position = 'fixed';
            feed.style.bottom = '1.5em';
            feed.style.right = '1.5em';
            feed.style.width = '320px';
            feed.style.maxWidth = '90vw';
            feed.style.background = 'rgba(24,24,24,0.97)';
            feed.style.borderRadius = '14px';
            feed.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)';
            feed.style.zIndex = '9998';
            feed.style.padding = '1em 1.2em 1em 1em';
            feed.style.fontSize = '1em';
            feed.style.color = '#fff';
            feed.style.fontFamily = 'Inter, sans-serif';
            feed.innerHTML = '<div style="font-weight:bold;margin-bottom:0.5em;letter-spacing:0.03em;">Live Activity</div><ul id="activity-feed-list" style="list-style:none;padding:0;margin:0;"></ul>';
            document.body.appendChild(feed);
        }
        feed.style.display = panelVisible ? '' : 'none';

        const list = feed.querySelector('#activity-feed-list');
        list.innerHTML = '';
        const maxItems = window.innerWidth <= 640 ? 3 : 5;
        FEED_EVENTS.slice(0, maxItems).forEach(ev => {
            const li = document.createElement('li');
            li.style.marginBottom = '0.5em';
            li.innerHTML = `<span style="font-weight:600;color:#ff9800;">${ev.user}</span> ${ev.detail} <span style="opacity:0.6;font-size:0.92em;">${ev.time}</span>`;
            list.appendChild(li);
        });
    }

    if (window.DemoEventBus) {
        window.DemoEventBus.on('activity', function(ev) {
            FEED_EVENTS.unshift({ ...ev, time: 'just now' });
            if (FEED_EVENTS.length > 8) FEED_EVENTS.pop();
            renderFeed();
        });
    }

    let offset = 0;
    setInterval(() => {
        offset = (offset + 1) % FEED_EVENTS.length;
        const rotated = FEED_EVENTS.slice(offset).concat(FEED_EVENTS.slice(0, offset));
        window.FEED_EVENTS = rotated;
        renderFeed();
    }, 5000);

    window.FEED_EVENTS = FEED_EVENTS;
    renderFeed();
})();
