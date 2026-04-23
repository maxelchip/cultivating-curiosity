/* =====================================================================
   footnotes.js
   Hover / focus / tap citation tooltips for every <sup class="cite">.

   Data architecture:
     Each cite carries both:
       • data-ref       (e.g. "s1-1")  — stable identifier
       • data-citation  (verbatim text of the citation)

     The citation text embedded in the HTML is the primary source of
     truth, so footnotes work the moment the page loads — no async
     dependency, no build step, no flicker. Optionally, if an
     `assets/citations.json` file exists, its entries override the
     inline data-citation values (keyed by data-ref). This is the hook
     that preserves "absolute academic integrity" described in the
     project plan: a single authoritative data file can be edited
     without touching the HTML.

   Input events supported:
     • Mouse hover  — show on mouseover, hide on mouseout
     • Keyboard     — show on focus (Tab onto a cite), hide on blur
     • Touch        — tap the cite to toggle; tap elsewhere to dismiss
     • Escape key   — dismisses any active tooltip

   Positioning:
     • Defaults below the cite, flipping above when there isn't room.
     • Clamps horizontally to the viewport with 16px padding.
     • Re-hides on scroll (prevents stale positions during fast scrolls).

   Accessibility:
     • Every cite is made keyboard-focusable via tabindex="0".
     • While the tooltip is visible, the active cite carries
       aria-describedby="footnote-tooltip" so screen readers announce
       the citation content in context.

   Runs as an IIFE — no globals.
   ===================================================================== */

(function () {
    'use strict';

    /* -----------------------------------------------------------------
       Configuration
       ----------------------------------------------------------------- */

    const CITE_SELECTOR    = '.cite';
    const TOOLTIP_ID       = 'footnote-tooltip';
    const CITATIONS_URL    = 'assets/citations.json';
    const TOOLTIP_OFFSET   = 10;   // px gap between cite and tooltip
    const VIEWPORT_PADDING = 16;   // px buffer to keep from viewport edge


    /* -----------------------------------------------------------------
       State
       ----------------------------------------------------------------- */

    const state = {
        tooltip:      null,   // the shared tooltip element
        activeTarget: null,   // the cite currently being described
        overrides:    null    // object from citations.json, if present
    };


    /* -----------------------------------------------------------------
       Citation text lookup
         Prefers the JSON override if present, otherwise falls back to
         the verbatim text stored in the HTML's data-citation attribute.
       ----------------------------------------------------------------- */

    function getCitation(citeEl) {
        if (!citeEl) return '';
        const ref = citeEl.dataset.ref;
        if (state.overrides && ref && state.overrides[ref]) {
            return state.overrides[ref];
        }
        return citeEl.dataset.citation || '';
    }


    /* -----------------------------------------------------------------
       Optional citations.json loader
         Silently no-ops on any failure (404, CORS, parse error, etc.).
         Under the file:// protocol the fetch will typically fail — that's
         fine, the inline data-citation attributes already contain the
         correct text. This loader is purely opt-in for centralization.
       ----------------------------------------------------------------- */

    function loadOverrides() {
        if (typeof fetch !== 'function') return;
        fetch(CITATIONS_URL, { cache: 'default' })
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (json) {
                if (json && typeof json === 'object') {
                    state.overrides = json;
                }
            })
            .catch(function () { /* ignore */ });
    }


    /* -----------------------------------------------------------------
       Tooltip display + positioning
       ----------------------------------------------------------------- */

    function showTooltip(target) {
        if (!target || !state.tooltip) return;

        const text = getCitation(target);
        if (!text) return;

        // If another cite was already active, clear its aria attribute.
        if (state.activeTarget && state.activeTarget !== target) {
            state.activeTarget.removeAttribute('aria-describedby');
        }

        state.activeTarget = target;
        state.tooltip.textContent = text;
        target.setAttribute('aria-describedby', TOOLTIP_ID);

        // Position after the textContent change so width/height are accurate.
        positionTooltip(target);

        state.tooltip.setAttribute('aria-hidden', 'false');
        // On the next frame, add the visibility class so the CSS
        // transition runs cleanly from the correct starting position.
        requestAnimationFrame(function () {
            state.tooltip.classList.add('is-visible');
        });
    }

    function hideTooltip() {
        if (!state.tooltip) return;
        state.tooltip.classList.remove('is-visible');
        state.tooltip.setAttribute('aria-hidden', 'true');
        if (state.activeTarget) {
            state.activeTarget.removeAttribute('aria-describedby');
        }
        state.activeTarget = null;
    }

    function isVisible() {
        return state.tooltip && state.tooltip.classList.contains('is-visible');
    }

    function positionTooltip(target) {
        if (!target || !state.tooltip) return;

        const citeRect    = target.getBoundingClientRect();
        const tooltipRect = state.tooltip.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Default: place BELOW the cite, left-aligned to it.
        let top  = citeRect.bottom + TOOLTIP_OFFSET;
        let left = citeRect.left;
        let position = 'below';

        // Flip ABOVE if it would overflow the bottom of the viewport.
        const wouldOverflowBottom =
            top + tooltipRect.height > vh - VIEWPORT_PADDING;

        if (wouldOverflowBottom) {
            top = citeRect.top - tooltipRect.height - TOOLTIP_OFFSET;
            position = 'above';
        }

        // Clamp horizontally.
        if (left + tooltipRect.width > vw - VIEWPORT_PADDING) {
            left = vw - tooltipRect.width - VIEWPORT_PADDING;
        }
        if (left < VIEWPORT_PADDING) {
            left = VIEWPORT_PADDING;
        }

        // If we flipped above and would now overflow the top, give up
        // and re-place below — the tooltip will be cut off, but the
        // content will at least be reachable by scroll.
        if (position === 'above' && top < VIEWPORT_PADDING) {
            top = citeRect.bottom + TOOLTIP_OFFSET;
            position = 'below';
        }

        state.tooltip.style.top  = top  + 'px';
        state.tooltip.style.left = left + 'px';
        state.tooltip.dataset.position = position;
    }


    /* -----------------------------------------------------------------
       Event bindings (event delegation; no per-cite listeners)
       ----------------------------------------------------------------- */

    function bindEvents() {
        // Mouse hover — only when the environment actually supports hover.
        const canHover = window.matchMedia('(hover: hover)').matches;

        if (canHover) {
            document.addEventListener('mouseover', function (event) {
                const cite = event.target && event.target.closest
                    ? event.target.closest(CITE_SELECTOR)
                    : null;
                if (cite && cite !== state.activeTarget) {
                    showTooltip(cite);
                }
            });

            document.addEventListener('mouseout', function (event) {
                if (!state.activeTarget) return;
                const cite = event.target && event.target.closest
                    ? event.target.closest(CITE_SELECTOR)
                    : null;
                // Hide when the mouse leaves the active cite.
                // The tooltip itself has pointer-events:none, so the mouse
                // can't hover ON it — anywhere outside the cite counts.
                if (cite === state.activeTarget) {
                    const relatedCite = event.relatedTarget && event.relatedTarget.closest
                        ? event.relatedTarget.closest(CITE_SELECTOR)
                        : null;
                    if (relatedCite !== state.activeTarget) {
                        hideTooltip();
                    }
                }
            });
        }

        // Keyboard focus — essential for accessibility.
        document.addEventListener('focusin', function (event) {
            const cite = event.target && event.target.closest
                ? event.target.closest(CITE_SELECTOR)
                : null;
            if (cite) showTooltip(cite);
        });

        document.addEventListener('focusout', function (event) {
            const cite = event.target && event.target.closest
                ? event.target.closest(CITE_SELECTOR)
                : null;
            if (cite && cite === state.activeTarget) hideTooltip();
        });

        // Click / tap — works on all input types.
        // On cite:     toggle.
        // Outside:     dismiss if currently visible.
        document.addEventListener('click', function (event) {
            const cite = event.target && event.target.closest
                ? event.target.closest(CITE_SELECTOR)
                : null;
            if (cite) {
                event.preventDefault();
                if (cite === state.activeTarget && isVisible()) {
                    hideTooltip();
                } else {
                    showTooltip(cite);
                }
            } else if (isVisible()) {
                hideTooltip();
            }
        });

        // Escape dismisses.
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && isVisible()) {
                hideTooltip();
                if (state.activeTarget && typeof state.activeTarget.focus === 'function') {
                    // Return focus to the cite for keyboard continuity.
                    state.activeTarget.focus();
                }
            }
        });

        // Hide on scroll — positions would otherwise go stale and the
        // tooltip would appear to "float" in the wrong place.
        window.addEventListener('scroll', function () {
            if (isVisible()) hideTooltip();
        }, { passive: true });

        // Reposition on resize, as long as the active cite is still laid out.
        window.addEventListener('resize', function () {
            if (isVisible() && state.activeTarget) {
                positionTooltip(state.activeTarget);
            }
        });
    }


    /* -----------------------------------------------------------------
       Accessibility prep — make every cite keyboard-focusable.
       ----------------------------------------------------------------- */

    function makeCitesFocusable() {
        const cites = document.querySelectorAll(CITE_SELECTOR);
        cites.forEach(function (cite) {
            if (!cite.hasAttribute('tabindex')) {
                cite.setAttribute('tabindex', '0');
            }
            if (!cite.hasAttribute('role')) {
                cite.setAttribute('role', 'button');
            }
            // Hint to assistive tech that a citation will be revealed.
            if (!cite.hasAttribute('aria-label')) {
                const ref = cite.dataset.ref || 'citation';
                cite.setAttribute('aria-label',
                    'Show source for ' + ref.replace(/^s(\d+)-(\d+)$/, 'section $1 note $2'));
            }
        });
    }


    /* -----------------------------------------------------------------
       Init
       ----------------------------------------------------------------- */

    function init() {
        state.tooltip = document.getElementById(TOOLTIP_ID);
        if (!state.tooltip) {
            // No tooltip container — nothing to do, but not fatal.
            console.warn('footnotes.js: #' + TOOLTIP_ID + ' not found in DOM.');
            return;
        }

        makeCitesFocusable();
        bindEvents();
        loadOverrides();    // fire-and-forget
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();