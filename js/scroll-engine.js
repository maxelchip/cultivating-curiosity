/* =====================================================================
   scroll-engine.js
   Central scroll-driven logic for the site.

   Responsibilities:
     1. Detect which <section> is currently active (IntersectionObserver)
     2. Toggle  .is-in-view  on the active section  (triggers reveals)
     3. Update  body[data-current-theme]            (triggers global aesthetics)
     4. Update  the timeline progress + year marker + snap animation
     5. Update  the radar menu's .is-current blip
     6. Handle  radar blip click → smooth-scroll to that section
     7. Handle  audio toggle + crossfade between ambient tracks per theme
     8. Gracefully no-op on missing audio files

   Dependencies (expected in the DOM):
     - .narrative-section   (each data-theme, data-year, data-title)
     - #dynamic-timeline, #timeline-progress, #timeline-marker, #timeline-year
     - #radar-menu, .radar-blip[data-target], #radar-current-section
     - #audio-toggle, #ambient-typewriter, #ambient-radar, #ambient-mainframe

   Runs as an IIFE; does not pollute global scope.
   ===================================================================== */

(function () {
    'use strict';

    /* -----------------------------------------------------------------
       1.  Configuration
       ----------------------------------------------------------------- */

    // The timeline is deliberately non-linear so the 1940–1973 period
    // (most of the narrative) occupies the first 40% of the bar.
    const TIMELINE = {
        minYear:      1940,
        maxYear:      2026,
        breakYear:    1973,
        breakPercent: 40
    };

    // Which ambient audio file accompanies each theme.
    // Keys must match values of  section.dataset.theme.
    // A value of null means no ambient track for that theme (silence).
    const THEME_AUDIO = {
        'split-screen':    'mainframe',
        'academic':        'typewriter',
        'wwii-blueprint':  'typewriter',
        'bunker':          'radar',
        'living-room':     null,
        'winter-glitch':   null,
        'modern-obsidian': null
    };

    // Master volume each ambient track ramps up to (kept low — ambient, not foreground).
    const AMBIENT_TARGET_VOLUME = 1;
    const AUDIO_FADE_MS = 800;


    /* -----------------------------------------------------------------
       2.  DOM references (gathered once)
       ----------------------------------------------------------------- */

    const dom = {
        body:              document.body,
        sections:          Array.from(document.querySelectorAll('.narrative-section')),
        timelineProgress:  document.getElementById('timeline-progress'),
        timelineMarker:    document.getElementById('timeline-marker'),
        timelineYear:      document.getElementById('timeline-year'),
        timelineRange:     document.getElementById('timeline-range'),
        radarCurrent:      document.getElementById('radar-current-section'),
        radarBlips:        Array.from(document.querySelectorAll('.radar-blip[data-target]')),
        audioToggle:       document.getElementById('audio-toggle'),
        audioElements: {
            typewriter:    document.getElementById('ambient-typewriter'),
            radar:         document.getElementById('ambient-radar'),
            mainframe:     document.getElementById('ambient-mainframe')
        }
    };

    const state = {
        currentSection: null,   // the active <section>
        audioEnabled:   false,  // whether the user has toggled sound on
        currentAudioKey: null,  // which ambient key is currently playing
        audioFadeTimers: new Map(),  // per-key interval handles
        reducedMotion:  window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };


    /* -----------------------------------------------------------------
       3.  Utility: year → percent mapping
       ----------------------------------------------------------------- */

    function yearToPercent(year) {
        if (year == null || isNaN(year)) return 0;
        const { minYear, maxYear, breakYear, breakPercent } = TIMELINE;
        if (year <= breakYear) {
            // 1940 → 0%, 1973 → 40%
            const ratio = (year - minYear) / (breakYear - minYear);
            return Math.max(0, Math.min(breakPercent, ratio * breakPercent));
        } else {
            // 1973 → 40%, 2026 → 100%
            const ratio = (year - breakYear) / (maxYear - breakYear);
            return breakPercent + Math.max(0, Math.min(1, ratio)) * (100 - breakPercent);
        }
    }

    /** Pull the focal year from a section's data-year attribute,
     *  falling back to the midpoint of data-year-range if present. */
    function sectionYear(section) {
        const y = section.dataset.year;
        if (y) {
            const n = parseInt(y, 10);
            if (!isNaN(n)) return n;
        }
        const range = section.dataset.yearRange;
        if (range) {
            const parts = range.split('-').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
            if (parts.length === 2) {
                return Math.round((parts[0] + parts[1]) / 2);
            }
            if (parts.length === 1) {
                return parts[0];
            }
        }
        return TIMELINE.minYear;
    }


    /* -----------------------------------------------------------------
       4.  Section activation
       ----------------------------------------------------------------- */

    function activateSection(section) {
        if (!section || section === state.currentSection) return;

        // Mark all other sections inactive; mark this one active.
        // We keep .is-in-view persistent once a section has been seen — this
        // stops reveal animations from replaying if you scroll back up.
        dom.sections.forEach(sec => {
            if (sec === section) {
                sec.classList.add('is-active', 'is-in-view');
            } else {
                sec.classList.remove('is-active');
            }
        });

        // Update body-level theme (drives themes.css global transitions).
        const theme = section.dataset.theme;
        if (theme) dom.body.dataset.currentTheme = theme;

        // Update timeline.
        updateTimelineFor(section);

        // Update radar.
        updateRadarFor(section);

        // Update audio.
        const audioKey = THEME_AUDIO[theme];
        crossfadeAudio(audioKey);

        state.currentSection = section;
    }


    /* -----------------------------------------------------------------
       5.  Timeline updates
       ----------------------------------------------------------------- */

    function updateTimelineFor(section) {
        const year = sectionYear(section);
        const pct = yearToPercent(year);

        if (dom.timelineProgress) {
            dom.timelineProgress.style.width = pct + '%';
        }
        if (dom.timelineMarker) {
            dom.timelineMarker.style.left = pct + '%';

            // Trigger the snap-bounce animation from interactions.css
            dom.timelineMarker.classList.remove('is-snapping');
            // Force reflow so re-adding the class restarts the animation
            // eslint-disable-next-line no-unused-expressions
            void dom.timelineMarker.offsetWidth;
            dom.timelineMarker.classList.add('is-snapping');
        }
        if (dom.timelineYear) {
            dom.timelineYear.textContent = year;
        }
        if (dom.timelineRange) {
            const range = section.dataset.yearRange || `${year}`;
            dom.timelineRange.textContent = range.replace('-', ' → ');
        }
    }


    /* -----------------------------------------------------------------
       6.  Radar updates + click navigation
       ----------------------------------------------------------------- */

    function updateRadarFor(section) {
        const id = section.id;
        dom.radarBlips.forEach(blip => {
            if (blip.dataset.target === id) {
                blip.classList.add('is-current');
            } else {
                blip.classList.remove('is-current');
            }
        });
        if (dom.radarCurrent) {
            dom.radarCurrent.textContent = section.dataset.title || '—';
        }
    }

    function bindRadarNavigation() {
        dom.radarBlips.forEach(blip => {
            blip.addEventListener('click', (event) => {
                event.preventDefault();
                const targetId = blip.dataset.target;
                const target = document.getElementById(targetId);
                if (!target) return;
                target.scrollIntoView({
                    behavior: state.reducedMotion ? 'auto' : 'smooth',
                    block: 'start'
                });
            });
        });
    }


    /* -----------------------------------------------------------------
       7.  Ambient audio crossfade
             Each ambient <audio> has preload="none", so browsers won't
             try to fetch until we call play(). If the file doesn't exist,
             play() rejects — we simply ignore that and move on.
       ----------------------------------------------------------------- */

    function crossfadeAudio(targetKey) {
        if (!state.audioEnabled) {
            // Audio is muted; just track what would be playing and return.
            state.currentAudioKey = targetKey;
            return;
        }
        if (targetKey === state.currentAudioKey) return;

        // Stop the currently playing track immediately.
        if (state.currentAudioKey) {
            const prev = dom.audioElements[state.currentAudioKey];
            if (prev) {
                try { prev.pause(); } catch (e) { /* ignore */ }
            }
        }

        // Start the new track immediately at full volume.
        if (targetKey) {
            const next = dom.audioElements[targetKey];
            if (next) {
                next.volume = AMBIENT_TARGET_VOLUME;
                const playPromise = next.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(() => { /* file missing or autoplay blocked */ });
                }
            }
        }

        state.currentAudioKey = targetKey;
    }

    function bindAudioToggle() {
        if (!dom.audioToggle) return;

        dom.audioToggle.addEventListener('click', () => {
            state.audioEnabled = !state.audioEnabled;
            dom.audioToggle.setAttribute('aria-pressed', String(state.audioEnabled));

            if (state.audioEnabled) {
                // Turn on the current theme's ambient track.
                const theme = state.currentSection?.dataset.theme;
                const key = theme ? THEME_AUDIO[theme] : null;
                state.currentAudioKey = null;   // force a track change
                crossfadeAudio(key);
            } else {
                // Pause everything immediately.
                Object.values(dom.audioElements).forEach(el => {
                    if (!el) return;
                    try { el.pause(); } catch (e) { /* ignore */ }
                });
            }
        });
    }


    /* -----------------------------------------------------------------
       8.  IntersectionObserver — which section owns the viewport?
             We use a "focus band" rootMargin so a section only becomes
             active when it's crossing the middle of the viewport.
             This produces crisp handoffs at defined scroll points.
       ----------------------------------------------------------------- */

    function setupSectionObserver() {
        if (!dom.sections.length) return;

        const observer = new IntersectionObserver((entries) => {
            // Pick the entry with the highest intersection ratio among
            // those currently intersecting — produces a single "winner"
            // when handing off between adjacent sections.
            const intersecting = entries
                .filter(e => e.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

            if (intersecting.length > 0) {
                activateSection(intersecting[0].target);
            }
        }, {
            // Focus band: roughly the middle 40% of the viewport
            rootMargin: '-30% 0px -30% 0px',
            threshold: [0, 0.25, 0.5, 0.75, 1]
        });

        dom.sections.forEach(section => observer.observe(section));
    }


    /* -----------------------------------------------------------------
       9.  Bootstrap activation
             On load, work out which section the user is actually in
             (e.g. they may have refreshed mid-page or deep-linked via #hash)
             and activate it immediately so the timeline / theme are correct.
       ----------------------------------------------------------------- */

    function bootstrapInitialSection() {
        // Deep link via URL hash?
        if (window.location.hash) {
            const target = document.getElementById(window.location.hash.slice(1));
            if (target && target.classList.contains('narrative-section')) {
                activateSection(target);
                return;
            }
        }

        // Otherwise pick the section whose midpoint is closest to the
        // current scroll center.
        const viewportCenter = window.scrollY + window.innerHeight / 2;
        let closest = dom.sections[0];
        let closestDist = Infinity;
        dom.sections.forEach(sec => {
            const rect = sec.getBoundingClientRect();
            const absTop = window.scrollY + rect.top;
            const mid = absTop + rect.height / 2;
            const dist = Math.abs(mid - viewportCenter);
            if (dist < closestDist) {
                closest = sec;
                closestDist = dist;
            }
        });
        activateSection(closest);
    }


    /* -----------------------------------------------------------------
       10. Optional: keyboard nav (arrow keys / PageUp / PageDown)
             A small affordance for keyboard users — jumps between
             sections rather than pixel-scrolling.
       ----------------------------------------------------------------- */

    function bindKeyboardNav() {
        document.addEventListener('keydown', (event) => {
            // Don't hijack while the user is typing in the typewriter input or
            // any other form element.
            const tag = (event.target && event.target.tagName) || '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable) return;

            let delta = 0;
            if (event.key === 'ArrowDown' || event.key === 'PageDown') delta = 1;
            if (event.key === 'ArrowUp'   || event.key === 'PageUp')   delta = -1;
            if (delta === 0) return;

            const idx = dom.sections.indexOf(state.currentSection);
            if (idx < 0) return;
            const next = dom.sections[Math.max(0, Math.min(dom.sections.length - 1, idx + delta))];
            if (next && next !== state.currentSection) {
                event.preventDefault();
                next.scrollIntoView({
                    behavior: state.reducedMotion ? 'auto' : 'smooth',
                    block: 'start'
                });
            }
        });
    }


    /* -----------------------------------------------------------------
       11. Init
       ----------------------------------------------------------------- */

    function init() {
        // Guard against missing critical DOM.
        if (!dom.sections.length) {
            console.warn('scroll-engine: no .narrative-section elements found.');
            return;
        }

        setupSectionObserver();
        bindRadarNavigation();
        bindAudioToggle();
        bindKeyboardNav();
        bootstrapInitialSection();

        // Watch for reduced-motion preference changes at runtime.
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (typeof mq.addEventListener === 'function') {
            mq.addEventListener('change', (e) => { state.reducedMotion = e.matches; });
        } else if (typeof mq.addListener === 'function') {
            // Older Safari
            mq.addListener((e) => { state.reducedMotion = e.matches; });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();