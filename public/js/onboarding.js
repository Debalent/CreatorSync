// CreatorSync onboarding and guided navigation (static demo version)
(function() {
    // Show onboarding modal on first visit
    if (!localStorage.getItem('cs_onboarded')) {
        const modal = document.createElement('div');
        modal.id = 'onboarding-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.85)';
        modal.style.zIndex = '10000';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.innerHTML = `
            <div style="background:#222;padding:2em 1.5em;border-radius:16px;max-width:90vw;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.4);color:#fff;">
                <h2>Welcome to CreatorSync!</h2>
                <p>What brings you here?</p>
                <div style="margin:1em 0;display:flex;gap:1em;flex-wrap:wrap;justify-content:center;">
                    <button class="onboard-btn" data-role="producer">I'm a Producer</button>
                    <button class="onboard-btn" data-role="artist">I'm an Artist</button>
                    <button class="onboard-btn" data-role="label">I'm a Label</button>
                    <button class="onboard-btn" data-role="listener">I'm a Listener</button>
                </div>
                <p style="font-size:0.95em;opacity:0.7;">You'll get a guided tour and tailored suggestions.</p>
                <button id="onboard-close" style="margin-top:1.5em;padding:0.5em 1.5em;border-radius:8px;background:#ff9800;color:#222;font-weight:bold;border:none;">Skip</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        modal.querySelectorAll('.onboard-btn').forEach(btn => {
            btn.onclick = function() {
                localStorage.setItem('cs_onboarded', '1');
                modal.remove();
                document.body.style.overflow = '';
                // Optionally: show a role-specific tour or highlight
            };
        });
        modal.querySelector('#onboard-close').onclick = function() {
            localStorage.setItem('cs_onboarded', '1');
            modal.remove();
            document.body.style.overflow = '';
        };
    }
})();
