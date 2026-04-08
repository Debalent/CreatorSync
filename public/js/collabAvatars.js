// CreatorSync Collaboration Avatars (static/demo)
(function() {
    let panelVisible = window.innerWidth > 1600; // only visible on wide screens
    const COLLAB_USERS = [
        { name: 'Jay', avatar: 'https://i.pravatar.cc/36?img=2' },
        { name: 'Mia', avatar: 'https://i.pravatar.cc/36?img=3' },
        { name: 'Ella', avatar: 'https://i.pravatar.cc/36?img=5' }
    ];

    function getOrCreateToggle() {
        let btn = document.getElementById('collab-toggle');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'collab-toggle';
            btn.innerHTML = '👥 Collab';
            btn.setAttribute('aria-expanded', String(panelVisible));
            btn.addEventListener('click', function() {
                panelVisible = !panelVisible;
                const panel = document.getElementById('collab-avatars');
                if (panel) panel.style.display = panelVisible ? 'flex' : 'none';
                btn.setAttribute('aria-expanded', String(panelVisible));
            });
            document.body.appendChild(btn);
        }
        return btn;
    }

    function renderCollabAvatars() {
        let group = document.getElementById('collab-avatars');
        if (!group) {
            group = document.createElement('div');
            group.id = 'collab-avatars';
            group.style.position = 'fixed';
            group.style.bottom = '180px';
            group.style.left = '24px';
            group.style.background = 'rgba(34,34,34,0.97)';
            group.style.borderRadius = '12px';
            group.style.boxShadow = '0 2px 12px rgba(0,0,0,0.18)';
            group.style.zIndex = '9998';
            group.style.padding = '0.7em 1.2em';
            group.style.alignItems = 'center';
            group.style.gap = '0.7em';
            group.style.fontSize = '1em';
            group.innerHTML = '<span style="font-weight:600;color:#2196f3;margin-right:0.7em;">Collab Session:</span>';
            document.body.appendChild(group);
        }
        group.style.display = panelVisible ? 'flex' : 'none';
        getOrCreateToggle().setAttribute('aria-expanded', String(panelVisible));
        // Remove old avatars
        group.querySelectorAll('.collab-avatar').forEach(e => e.remove());
        COLLAB_USERS.forEach(u => {
            const avatar = document.createElement('span');
            avatar.className = 'collab-avatar';
            avatar.style.display = 'inline-flex';
            avatar.style.alignItems = 'center';
            avatar.style.marginRight = '0.3em';
            avatar.innerHTML = `<img src="${u.avatar}" alt="${u.name}" title="${u.name}" style="width:28px;height:28px;border-radius:50%;border:2px solid #2196f3;box-shadow:0 1px 4px rgba(0,0,0,0.12);margin-right:0.18em;vertical-align:middle;" />`;
            group.appendChild(avatar);
        });
    }
    renderCollabAvatars();
})();
