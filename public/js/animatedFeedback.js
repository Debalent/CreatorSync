// CreatorSync Animated Feedback for Interactions (static/demo)
(function() {
    // Utility to add a pop animation to any element
    function animatePop(el) {
        if (!el) return;
        el.style.transition = 'transform 0.18s cubic-bezier(.4,2,.6,1), box-shadow 0.18s';
        el.style.transform = 'scale(1.18)';
        el.style.boxShadow = '0 2px 12px #ff9800cc';
        setTimeout(() => {
            el.style.transform = '';
            el.style.boxShadow = '';
        }, 180);
    }
    // Attach to demo buttons (like, save, collab)
    function attachDemoAnimations() {
        const selectors = ['.btn-like', '.btn-save', '.btn-collab'];
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(btn => {
                btn.addEventListener('click', function(e) {
                    animatePop(btn);
                });
            });
        });
    }
    // Wait for DOM
    document.addEventListener('DOMContentLoaded', attachDemoAnimations);
    // Expose utility for other scripts
    window.animatePop = animatePop;
})();
