// CreatorSync Radio Scoring Demo Widget (static/demo)
(function() {
    let likes = 12, plays = 40, saves = 5, shares = 3, skips = 2, reputation = 1.2, age = 2;
    // Hidden by default on mobile; visible on desktop
    let panelVisible = window.innerWidth > 640;

    function calcScore() {
        return Math.round((likes * 2) + plays + (saves * 2) + (shares * 2) - (skips * 2) + (reputation * 1.5) - (age * 0.5));
    }

    function getOrCreateToggle() {
        let btn = document.getElementById('radio-score-toggle');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'radio-score-toggle';
            btn.setAttribute('aria-label', 'Toggle Radio Score panel');
            btn.setAttribute('aria-expanded', String(panelVisible));
            btn.innerHTML = '&#x1F4FB; Score';
            btn.addEventListener('click', function() {
                panelVisible = !panelVisible;
                const panel = document.getElementById('radio-score-demo');
                if (panel) panel.style.display = panelVisible ? '' : 'none';
                btn.setAttribute('aria-expanded', String(panelVisible));
            });
            document.body.appendChild(btn);
        }
        return btn;
    }

    function renderScore() {
        getOrCreateToggle();

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
            box.style.maxWidth = '320px';
            document.body.appendChild(box);
        }
        box.style.display = panelVisible ? '' : 'none';

        const score = calcScore();
        box.innerHTML = `
            <div style="font-weight:bold;margin-bottom:0.6em;letter-spacing:0.03em;">
                Radio Score <span style="font-size:0.75em;opacity:0.55;font-weight:400;">(Demo)</span>
            </div>
            <div style="font-size:2em;font-weight:700;color:#ff9800;">${score}</div>
            <div style="margin-top:0.6em;font-size:0.93em;display:flex;flex-wrap:wrap;gap:0.3em 0.8em;">
                <span>Likes <b>${likes}</b></span>
                <span>Plays <b>${plays}</b></span>
                <span>Saves <b>${saves}</b></span>
                <span>Shares <b>${shares}</b></span>
                <span>Skips <b>${skips}</b></span>
                <span>Rep <b>${reputation}</b></span>
                <span>Age <b>${age}d</b></span>
            </div>`;
    }

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
