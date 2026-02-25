// CreatorSync Radio Scoring Demo Widget (static/demo)
(function() {
    let score = 100;
    let likes = 12, plays = 40, saves = 5, shares = 3, skips = 2, reputation = 1.2, age = 2;
    function calcScore() {
        // MVP scoring formula
        return Math.round((likes * 2) + (plays * 1) + (saves * 2) + (shares * 2) - (skips * 2) + (reputation * 1.5) - (age * 0.5));
    }
    function renderScore() {
        let box = document.getElementById('radio-score-demo');
        if (!box) {
            box = document.createElement('div');
            box.id = 'radio-score-demo';
            box.style.position = 'fixed';
            box.style.bottom = '1.5em';
            box.style.left = '1.5em';
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
        score = calcScore();
        box.innerHTML = `<div style="font-weight:bold;margin-bottom:0.7em;letter-spacing:0.03em;">Radio Score (Demo)</div>
            <div style="font-size:2em;font-weight:700;color:#ff9800;">${score}</div>
            <div style="margin-top:0.7em;font-size:0.98em;">
                <span style="margin-right:1em;">Likes: <b>${likes}</b></span>
                <span style="margin-right:1em;">Plays: <b>${plays}</b></span>
                <span style="margin-right:1em;">Saves: <b>${saves}</b></span>
                <span style="margin-right:1em;">Shares: <b>${shares}</b></span>
                <span style="margin-right:1em;">Skips: <b>${skips}</b></span>
                <span style="margin-right:1em;">Rep: <b>${reputation}</b></span>
                <span>Age: <b>${age}d</b></span>
            </div>
            <div style="margin-top:0.7em;font-size:0.93em;opacity:0.7;">Formula: (Likes×2)+(Plays)+(Saves×2)+(Shares×2)-(Skips×2)+(Rep×1.5)-(Age×0.5)</div>`;
    }
    // Listen for DemoEventBus 'activity' events to update stats
    if (window.DemoEventBus) {
        window.DemoEventBus.on('activity', function(ev) {
            if (ev.type === 'like') likes++;
            if (ev.type === 'play' || ev.type === 'radio') plays++;
            if (ev.type === 'save') saves++;
            if (ev.type === 'share') shares++;
            if (ev.type === 'skip') skips++;
            renderScore();
        });
    }
    renderScore();
})();
