// CreatorSync Trending & Recently Active Surfaces (static/demo)
(function() {
    const TRENDING_BEATS = [
        { title: 'Midnight Drive', artist: 'Ava', cover: 'assets/default-artwork.jpg' },
        { title: '808 Dreams', artist: 'Jay', cover: 'assets/default-artwork.jpg' },
        { title: 'Neon Nights', artist: 'Mia', cover: 'assets/default-artwork.jpg' }
    ];
    const RECENT_CREATORS = [
        { name: 'Liam', avatar: 'https://i.pravatar.cc/36?img=4' },
        { name: 'Ella', avatar: 'https://i.pravatar.cc/36?img=5' },
        { name: 'Kai', avatar: 'https://i.pravatar.cc/36?img=6' }
    ];
    function renderTrendingRecent() {
        let sidebar = document.getElementById('trending-recent-sidebar');
        if (!sidebar) {
            sidebar = document.createElement('div');
            sidebar.id = 'trending-recent-sidebar';
            sidebar.style.position = 'fixed';
            sidebar.style.top = '7em';
            sidebar.style.right = '1.5em';
            sidebar.style.width = '270px';
            sidebar.style.maxWidth = '90vw';
            sidebar.style.background = 'rgba(28,28,28,0.97)';
            sidebar.style.borderRadius = '14px';
            sidebar.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)';
            sidebar.style.zIndex = '9996';
            sidebar.style.padding = '1.2em 1.2em 1em 1.2em';
            sidebar.style.fontSize = '1em';
            sidebar.style.color = '#fff';
            sidebar.style.fontFamily = 'Inter, sans-serif';
            sidebar.innerHTML = '<div style="font-weight:bold;margin-bottom:0.7em;letter-spacing:0.03em;">Trending Beats</div><ul id="trending-beats-list" style="list-style:none;padding:0;margin:0 0 1em 0;"></ul><div style="font-weight:bold;margin-bottom:0.7em;letter-spacing:0.03em;">Recently Active</div><ul id="recent-creators-list" style="list-style:none;padding:0;margin:0;"></ul>';
            document.body.appendChild(sidebar);
        }
        const trendingList = sidebar.querySelector('#trending-beats-list');
        trendingList.innerHTML = '';
        TRENDING_BEATS.forEach(b => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.marginBottom = '0.5em';
            li.innerHTML = `<img src="${b.cover}" alt="" style="width:32px;height:32px;border-radius:8px;margin-right:0.7em;" /><span style="font-weight:600;">${b.title}</span> <span style="opacity:0.7;margin-left:0.4em;">by ${b.artist}</span>`;
            trendingList.appendChild(li);
        });
        const recentList = sidebar.querySelector('#recent-creators-list');
        recentList.innerHTML = '';
        RECENT_CREATORS.forEach(c => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.marginBottom = '0.5em';
            li.innerHTML = `<img src="${c.avatar}" alt="${c.name}" style="width:28px;height:28px;border-radius:50%;margin-right:0.6em;" /><span style="font-weight:600;">${c.name}</span>`;
            recentList.appendChild(li);
        });
    }
    renderTrendingRecent();
})();
