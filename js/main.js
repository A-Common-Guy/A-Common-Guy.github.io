/**
 * Giuseppe Festa - Robotics Engineer Portfolio
 * Main JavaScript - Animations & Interactivity
 */

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initTypingEffect();
    initScrollAnimations();
    initTimeline();
    initSkillBars();
    initProjectFilters();
    initCounters();
    updateCurrentYear();
});

// ============================================
// NAVIGATION
// ============================================

function initNavigation() {
    const nav = document.getElementById('nav');
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Scroll effect for nav
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });

    // Mobile nav toggle
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('open');
    });

    // Close mobile nav on link click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('open');
        });
    });

    // Active link on scroll
    const sections = document.querySelectorAll('section[id]');
    
    window.addEventListener('scroll', () => {
        const scrollPos = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('data-section') === sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });
}

// ============================================
// TYPING EFFECT
// ============================================

function initTypingEffect() {
    const typingElement = document.getElementById('typingText');
    if (!typingElement) return;

    const phrases = [
        'Robotics Engineer',
        'Humanoid Systems Developer',
        'Control Systems Expert',
        'AI & Motion Planner',
        'Innovation Enthusiast'
    ];
    
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    function type() {
        const currentPhrase = phrases[phraseIndex];
        
        if (isDeleting) {
            typingElement.textContent = currentPhrase.substring(0, charIndex - 1);
            charIndex--;
            typingSpeed = 50;
        } else {
            typingElement.textContent = currentPhrase.substring(0, charIndex + 1);
            charIndex++;
            typingSpeed = 100;
        }

        if (!isDeleting && charIndex === currentPhrase.length) {
            isDeleting = true;
            typingSpeed = 2000; // Pause at end
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            typingSpeed = 500; // Pause before new phrase
        }

        setTimeout(type, typingSpeed);
    }

    type();
}

// ============================================
// SCROLL ANIMATIONS
// ============================================

function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Elements to animate on scroll
    const animatedElements = document.querySelectorAll(
        '.stat-card, .project-card, .skills-category, .contact-method, .timeline-event, .reveal'
    );

    animatedElements.forEach(el => {
        observer.observe(el);
    });
}

// ============================================
// TIMELINE
// ============================================

function initTimeline() {
    const timelineContainer = document.querySelector('.timeline-container');
    const timelineLine = document.querySelector('.timeline-line');
    const timelineProgress = document.getElementById('timelineProgress');
    const timelineEvents = document.querySelectorAll('.timeline-event');

    if (!timelineContainer || !timelineProgress) return;

    function updateTimeline() {
        const containerRect = timelineContainer.getBoundingClientRect();
        const containerTop = containerRect.top;
        const containerHeight = containerRect.height;
        const windowHeight = window.innerHeight;

        // Calculate progress
        let progress = 0;
        if (containerTop < windowHeight) {
            progress = Math.min(
                (windowHeight - containerTop) / (containerHeight + windowHeight / 2),
                1
            );
        }

        timelineProgress.style.height = `${progress * 100}%`;

        // Animate events as they come into view
        timelineEvents.forEach((event, index) => {
            const eventRect = event.getBoundingClientRect();
            const eventTop = eventRect.top;

            if (eventTop < windowHeight * 0.8) {
                setTimeout(() => {
                    event.classList.add('visible');
                }, index * 100);
            }
        });
    }

    window.addEventListener('scroll', updateTimeline);
    updateTimeline();
}

// ============================================
// SKILL BARS
// ============================================

function initSkillBars() {
    const skillBars = document.querySelectorAll('.skill-progress');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const progress = entry.target.getAttribute('data-progress');
                entry.target.style.width = `${progress}%`;
            }
        });
    }, { threshold: 0.5 });

    skillBars.forEach(bar => {
        observer.observe(bar);
    });
}

// ============================================
// PROJECT FILTERS
// ============================================

function initProjectFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');

            // Filter projects
            projectCards.forEach(card => {
                const category = card.getAttribute('data-category');
                
                if (filter === 'all' || category === filter) {
                    card.style.display = 'block';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 10);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 400);
                }
            });
        });
    });
}

// ============================================
// ANIMATED COUNTERS
// ============================================

function initCounters() {
    const counters = document.querySelectorAll('.stat-number');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                entry.target.classList.add('counted');
                animateCounter(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => {
        observer.observe(counter);
    });
}

function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-count'));
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    function updateCounter() {
        current += step;
        if (current < target) {
            element.textContent = Math.floor(current);
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target;
        }
    }

    updateCounter();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function updateCurrentYear() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// ============================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// ============================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        
        if (target) {
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// ============================================
// PARALLAX EFFECT FOR HERO
// ============================================

window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroDecoration = document.querySelector('.hero-decoration');
    
    if (heroDecoration && scrolled < window.innerHeight) {
        heroDecoration.style.transform = `translate(-50%, -50%) rotate(${scrolled * 0.02}deg)`;
    }
});

// ============================================
// CONSOLE EASTER EGG
// ============================================

console.log(`
%c
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🤖 Giuseppe Festa - Robotics Engineer Portfolio 🤖    ║
║                                                          ║
║   Thanks for checking out the code!                      ║
║   Feel free to connect with me.                          ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`, 'color: #00f0ff; font-family: monospace;');

