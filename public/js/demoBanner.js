// Persistent demo mode banner for CreatorSync (mobile-friendly)
(function() {
    fetch('/api/demo-mode-status')
        .then(res => res.json())
        .then(data => {
            if (data.demoMode) {
                const banner = document.createElement('div');
                banner.id = 'demo-mode-banner';
                banner.style.position = 'fixed';
                banner.style.top = '0';
                banner.style.left = '0';
                banner.style.width = '100vw';
                banner.style.zIndex = '9999';
                banner.style.background = '#ff9800';
                banner.style.color = '#222';
                banner.style.fontWeight = 'bold';
                banner.style.textAlign = 'center';
                banner.style.padding = '0.75em 0.5em';
                banner.style.fontSize = '1.1em';
                banner.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                banner.style.letterSpacing = '0.04em';
                banner.innerText = 'DEMO MODE ENABLED — All data is mock/demo only.';
                document.body.appendChild(banner);
                document.body.style.paddingTop = '3em';
            }
        });
})();
