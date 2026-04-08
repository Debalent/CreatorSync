// CreatorSync Presence Indicators (static/demo version)
(function() {
    const USERS = [
        { name: 'Ava', avatar: 'https://i.pravatar.cc/36?img=1', status: 'online' },
        { name: 'Jay', avatar: 'https://i.pravatar.cc/36?img=2', status: 'in session' },
        { name: 'Mia', avatar: 'https://i.pravatar.cc/36?img=3', status: 'listening' },
        { name: 'Liam', avatar: 'https://i.pravatar.cc/36?img=4', status: 'online' },
        { name: 'Ella', avatar: 'https://i.pravatar.cc/36?img=5', status: 'in session' }
    ];
    function renderPresence() {
        let bar = document.getElementById('presence-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'presence-bar';
            bar.style.position = 'fixed';
            bar.style.top = '78px';
            bar.style.left = '24px';
            bar.style.background = 'rgba(34,34,34,0.97)';
            bar.style.borderRadius = '12px';
            bar.style.boxShadow = '0 2px 12px rgba(0,0,0,0.18)';
            bar.style.zIndex = '9997';
            bar.style.padding = '0.7em 1.2em 0.7em 1em';
            bar.style.display = 'flex';
            bar.style.alignItems = 'center';
            bar.style.gap = '0.7em';
            bar.style.fontSize = '1em';
            bar.innerHTML = '<span style="font-weight:600;color:#ff9800;margin-right:0.7em;">Active Now:</span>';
            document.body.appendChild(bar);
        }
        // Remove old avatars
        bar.querySelectorAll('.presence-avatar').forEach(e => e.remove());
        USERS.forEach(u => {
            const avatar = document.createElement('span');
            avatar.className = 'presence-avatar';
            avatar.style.display = 'inline-flex';
            avatar.style.alignItems = 'center';
            avatar.style.marginRight = '0.3em';
            avatar.innerHTML = `<img src="${u.avatar}" alt="${u.name}" title="${u.name} (${u.status})" style="width:28px;height:28px;border-radius:50%;border:2px solid ${u.status==='online'?'#4caf50':u.status==='in session'?'#2196f3':'#ff9800'};box-shadow:0 1px 4px rgba(0,0,0,0.12);margin-right:0.18em;vertical-align:middle;" /><span style="font-size:0.92em;opacity:0.7;">${u.status.replace('in session','collab')}</span>`;
            bar.appendChild(avatar);
        });
    }
    renderPresence();
})();
