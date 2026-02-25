// CreatorSync Radio Analytics Demo Panel (static/demo)
(function() {
    let analytics = {
        listeners: 23,
        avgListenTime: 2.7, // minutes
        skips: 2,
        likes: 12,
        shares: 3,
        saves: 5,
        playlistAdds: 4,
        comments: 1,
        reposts: 0
    };
    function renderAnalytics() {
        let box = document.getElementById('radio-analytics-demo');
        if (!box) {
            box = document.createElement('div');
            box.id = 'radio-analytics-demo';
            box.style.position = 'fixed';
            box.style.bottom = '1.5em';
            box.style.right = '1.5em';
            box.style.background = 'rgba(34,34,34,0.97)';
            box.style.borderRadius = '14px';
            box.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)';
            box.style.zIndex = '9996';
            box.style.padding = '1.2em 1.2em 1em 1.2em';
            box.style.fontSize = '1em';
            box.style.color = '#fff';
            box.style.fontFamily = 'Inter, sans-serif';
            document.body.appendChild(box);
        }
            box.innerHTML = `<div style="font-weight:bold;margin-bottom:0.7em;letter-spacing:0.03em;">Track Analytics (Demo)</div>
                <div style="display:flex;flex-wrap:wrap;gap:0.7em 1.2em;">
                    <span>Listeners: <b>${analytics.listeners}</b></span>
                    <span>Avg Listen: <b>${analytics.avgListenTime} min</b></span>
                    <span>Skips: <b>${analytics.skips}</b></span>
                    <span>Likes: <b>${analytics.likes}</b></span>
                    <span>Shares: <b>${analytics.shares}</b></span>
                    <span>Saves: <b>${analytics.saves}</b></span>
                    <span>Playlist Adds: <b>${analytics.playlistAdds}</b></span>
                    <span>Comments: <b>${analytics.comments}</b></span>
                    <span>Reposts: <b>${analytics.reposts}</b></span>
                </div>`;
    }
    // Listen for DemoEventBus 'activity' events to update analytics
    if (window.DemoEventBus) {
        window.DemoEventBus.on('activity', function(ev) {
            if (ev.type === 'like') analytics.likes++;
            if (ev.type === 'play' || ev.type === 'radio') analytics.listeners++;
            if (ev.type === 'save') analytics.saves++;
            if (ev.type === 'share') analytics.shares++;
            if (ev.type === 'skip') analytics.skips++;
            if (ev.type === 'playlist_add') analytics.playlistAdds++;
            if (ev.type === 'comment') analytics.comments++;
            if (ev.type === 'repost') analytics.reposts++;
            renderAnalytics();
        });
    }
    renderAnalytics();
})();
