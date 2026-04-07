/**
 * CreatorSync Navigation Carousel
 * Handles smooth scrolling and touch interactions for the navigation carousel
 */

class NavigationCarousel {
    constructor() {
        this.carousel = document.querySelector('.nav-menu-carousel');
        this.leftBtn = document.querySelector('.nav-scroll-left');
        this.rightBtn = document.querySelector('.nav-scroll-right');
        this.scrollAmount = 180; // Width of card + gap

        if (this.carousel && this.leftBtn && this.rightBtn) {
            this.init();
        }
    }

    init() {
        // Button click handlers
        this.leftBtn.addEventListener('click', () => this.scrollLeft());
        this.rightBtn.addEventListener('click', () => this.scrollRight());

        // Touch/drag support
        this.setupTouchSupport();

        // Update button visibility based on scroll position
        this.carousel.addEventListener('scroll', () => this.updateButtonVisibility());
        this.updateButtonVisibility();

        // Handle window resize
        window.addEventListener('resize', () => this.updateButtonVisibility());
    }

    scrollLeft() {
        this.carousel.scrollBy({
            left: -this.scrollAmount,
            behavior: 'smooth'
        });
    }

    scrollRight() {
        this.carousel.scrollBy({
            left: this.scrollAmount,
            behavior: 'smooth'
        });
    }

    setupTouchSupport() {
        let startX = 0;
        let scrollLeft = 0;
        let isDown = false;

        this.carousel.addEventListener('mousedown', (e) => {
            isDown = true;
            this.carousel.style.cursor = 'grabbing';
            startX = e.pageX - this.carousel.offsetLeft;
            scrollLeft = this.carousel.scrollLeft;
        });

        this.carousel.addEventListener('mouseleave', () => {
            isDown = false;
            this.carousel.style.cursor = 'grab';
        });

        this.carousel.addEventListener('mouseup', () => {
            isDown = false;
            this.carousel.style.cursor = 'grab';
        });

        this.carousel.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - this.carousel.offsetLeft;
            const walk = (x - startX) * 2;
            this.carousel.scrollLeft = scrollLeft - walk;
        });

        // Touch support for mobile
        let touchStartX = 0;
        let touchScrollLeft = 0;

        this.carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].pageX;
            touchScrollLeft = this.carousel.scrollLeft;
        });

        this.carousel.addEventListener('touchmove', (e) => {
            const touchX = e.touches[0].pageX;
            const walk = (touchStartX - touchX) * 1.5;
            this.carousel.scrollLeft = touchScrollLeft + walk;
        });
    }

    updateButtonVisibility() {
        const isAtStart = this.carousel.scrollLeft <= 0;
        const isAtEnd = this.carousel.scrollLeft >=
            (this.carousel.scrollWidth - this.carousel.clientWidth - 5);

        // Hide/show buttons based on scroll position
        this.leftBtn.style.opacity = isAtStart ? '0.3' : '1';
        this.leftBtn.style.pointerEvents = isAtStart ? 'none' : 'auto';

        this.rightBtn.style.opacity = isAtEnd ? '0.3' : '1';
        this.rightBtn.style.pointerEvents = isAtEnd ? 'none' : 'auto';

        // Hide buttons if carousel doesn't overflow
        const hasOverflow = this.carousel.scrollWidth > this.carousel.clientWidth;
        this.leftBtn.style.display = hasOverflow ? 'flex' : 'none';
        this.rightBtn.style.display = hasOverflow ? 'flex' : 'none';
    }
}

// Initialize carousel when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new NavigationCarousel();
    });
} else {
    new NavigationCarousel();
}

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
    const carousel = document.querySelector('.nav-menu-carousel');
    if (!carousel) return;

    if (e.key === 'ArrowLeft') {
        carousel.scrollBy({ left: -180, behavior: 'smooth' });
    } else if (e.key === 'ArrowRight') {
        carousel.scrollBy({ left: 180, behavior: 'smooth' });
    }
});
