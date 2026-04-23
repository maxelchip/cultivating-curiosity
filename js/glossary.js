/* =====================================================================
   glossary.js
   Clickable in-line glossary terms → sliding-in right sidebar.

   Every <span class="glossary-term" data-term="..."> in the narrative
   becomes clickable. Clicking opens the sidebar with the full
   definition, as written by the author and sourced back to the
   original scholarship.

   Features:
     • Click / Tap / Enter / Space → open the term's entry.
     • Close via × button, Escape key, or click outside the sidebar.
     • Focus-management: opening parks focus on the close button;
       closing restores focus to where it was before opening.
     • Clicking a different term while the sidebar is already open
       simply swaps the content (no awkward close/open flicker).
     • If a term click can't be resolved (missing from the data
       object), it logs a warning but otherwise no-ops.

   The glossary data lives inline as a single GLOSSARY object below.
   Editing this file is the single authoritative place to change any
   term's wording.

   Runs as an IIFE — no globals leaked.
   ===================================================================== */

(function () {
    'use strict';

    /* -----------------------------------------------------------------
       GLOSSARY DATA  (single source of truth for in-line terms)
       Keys match the `data-term` attributes used throughout index.html.
       Each entry may supply:
         • title      — heading shown in the sidebar
         • definition — body text (plain prose; may contain <em>)
         • source     — attribution line shown in the footer (optional)
       ----------------------------------------------------------------- */

    const GLOSSARY = {

        'neural-networks': {
            title: 'Neural Networks',
            definition:
                'Computing systems inspired by the biological neural networks ' +
                'of animal brains, heavily relying on statistical probability ' +
                'rather than programmed symbolic rules. First popularized by ' +
                'Cybernetics and the Perceptron, marginalized through the ' +
                'Cold War, and now the dominant paradigm in contemporary AI.',
            source: null
        },

        'symbolic-ai': {
            title: 'Symbolic AI (GOFAI)',
            definition:
                'An approach that treats intelligence as software running on a ' +
                'machine, manipulating discrete symbols according to rules, ' +
                'regardless of the physical medium — whether a neuron or a ' +
                'transistor. &ldquo;GOFAI&rdquo; stands for &ldquo;Good Old-Fashioned ' +
                'AI,&rdquo; a retronym coined once neural approaches returned to ' +
                'prominence.',
            source: 'Edwards, &ldquo;Constructing Artificial Intelligence,&rdquo; pp. 239, 252'
        },

        'cybernetics': {
            title: 'Cybernetics',
            definition:
                'The science of communication and control, which focuses on ' +
                'hardware, continuous feedback loops, and &ldquo;embodied&rdquo; minds, ' +
                'drawing structural resemblances between computers and the ' +
                'human brain. Coined by Norbert Wiener, who reframed the ' +
                'failures of his WWII anti-aircraft predictors into an entire ' +
                'new scientific discipline.',
            source:
                '&ldquo;Science: The Thinking Machine,&rdquo; Time, January 23, 1950; ' +
                'Edwards, &ldquo;Constructing Artificial Intelligence,&rdquo; pp. 240–241'
        },

        'closed-world': {
            title: 'Closed World',
            definition:
                'A metaphor for the Cold War strategy of containment, where ' +
                'the globe is viewed as a chaotic system that must be managed ' +
                'and controlled via technology. Paul N. Edwards argues that ' +
                'the &ldquo;closed world&rdquo; of the AI laboratory — simulated, ' +
                'rule-bound environments — perfectly mirrored the military&rsquo;s ' +
                'desire for a closed world of global politics.',
            source: 'Edwards, &ldquo;Constructing Artificial Intelligence,&rdquo; pp. 271–272'
        },

        'arpa': {
            title: 'ARPA (Advanced Research Projects Agency)',
            definition:
                'A U.S. Department of Defense agency whose Information ' +
                'Processing Techniques Office (IPTO) became the primary ' +
                'financial patron of Artificial Intelligence during the Cold ' +
                'War. ARPA poured massive, long-term funding with minimal ' +
                'peer review into &ldquo;centers of excellence&rdquo; at MIT, Stanford, ' +
                'and Carnegie Mellon, effectively locking those labs into ' +
                'supporting Department of Defense objectives.',
            source: 'Edwards, &ldquo;Constructing Artificial Intelligence,&rdquo; pp. 260–261'
        },

        'command-and-control': {
            title: 'Command and Control',
            definition:
                'Military decision-support systems required to manage the ' +
                'complex, high-speed data of the Cold War, such as ' +
                'distinguishing incoming missiles from radar decoys. The ' +
                'entire trajectory of Symbolic AI can be read as a long ' +
                'campaign to make command and control tractable.',
            source: 'Edwards, &ldquo;Constructing Artificial Intelligence,&rdquo; p. 259'
        },

        'physical-symbol-system': {
            title: 'Physical Symbol System Hypothesis',
            definition:
                'The premise that a system manipulating discrete symbols ' +
                'according to rules possesses the necessary and sufficient ' +
                'means for general intelligent action. Formulated by Allen ' +
                'Newell and Herbert A. Simon, it is the philosophical ' +
                'keystone of Symbolic AI — and precisely what Dreyfus and ' +
                'Searle would later attack.',
            source: 'Edwards, &ldquo;Constructing Artificial Intelligence,&rdquo; p. 252'
        },

        'servo-mechanism': {
            title: 'Servo-mechanism',
            definition:
                'An automatic device that uses error-sensing negative ' +
                'feedback to correct the action of a mechanism. In May 1941, ' +
                'MIT&rsquo;s Harold Hazen controversially proposed treating a human ' +
                'operator as a servo-mechanism — a move that made the ' +
                'behaviorist framing of cybernetic thinking possible.',
            source: 'Mindell, Between Human and Machine, p. 276'
        },

        'topological-not-metric': {
            title: 'Topological, not Metric',
            definition:
                'The principle that a machine&rsquo;s function is determined by ' +
                'its logical wiring connections (topology) rather than the ' +
                'physical precision or continuous measurement of its parts ' +
                '(metric). Articulated by George Stibitz at Bell Labs, this ' +
                'insight decoupled the structure of a computer from the ' +
                'calculations it performed — paving the way for general-' +
                'purpose digital machines.',
            source: 'Mindell, Between Human and Machine, p. 304'
        },

        'sage': {
            title: 'SAGE (Semi-Automatic Ground Environment)',
            definition:
                'A system of large computers and networking equipment that ' +
                'coordinated data from radar sites to produce a single, ' +
                'unified image of the airspace over a wide area. SAGE became ' +
                'the archetypal Cold War command-and-control system and the ' +
                'proving ground for real-time interactive computing, which AI ' +
                'researchers piggybacked on to build their &ldquo;thinking machines.&rdquo;',
            source: null
        },

        'time-sharing': {
            title: 'Time-sharing',
            definition:
                'A computing technique developed by John McCarthy where ' +
                'multiple users utilize a single CPU simultaneously, ' +
                'transforming the computer from a batch-processing ' +
                'number-cruncher into an interactive communication medium. ' +
                'Time-sharing is what made the &ldquo;subjective environment&rdquo; of ' +
                'Man-Computer Symbiosis possible.',
            source: 'Edwards, &ldquo;Constructing Artificial Intelligence,&rdquo; pp. 256–258'
        },

        'heuristics': {
            title: 'Heuristics',
            definition:
                'Rules of thumb or selective explorations used in ' +
                'problem-solving, contrasting with systematic algorithms. ' +
                'They sacrifice guaranteed solutions for computational ' +
                'efficiency — a trade-off at the very heart of Symbolic AI. ' +
                'Newell and Simon&rsquo;s Logic Theorist and General Problem ' +
                'Solver were both heuristic engines.',
            source:
                'Simon, The Shape of Automation, p. 86; ' +
                'Newell &amp; Simon, &ldquo;The Logic Theory Machine,&rdquo; p. 5'
        },

        'perceptron': {
            title: 'Perceptron',
            definition:
                'An early artificial neural network designed by Cornell ' +
                'psychologist Frank Rosenblatt to simulate the learning ' +
                'processes of the human brain through bottom-up pattern ' +
                'recognition, rather than top-down symbolic logic. Publicly ' +
                'unveiled in 1958 with extravagant claims that it would one ' +
                'day walk, talk, reproduce itself, and &ldquo;be conscious of its ' +
                'own existence.&rdquo;',
            source:
                'United Press International, &ldquo;New Navy Device Learns By Doing,&rdquo; ' +
                'The New York Times, July 7, 1958'
        },

        'greshams-law': {
            title: 'Gresham&rsquo;s Law of Planning',
            definition:
                'The economic theory cited by Herbert Simon suggesting that ' +
                'routine work naturally drives out non-programmed, creative ' +
                'activity, implying automation is a net positive for human ' +
                'satisfaction. Simon used it to argue that replacing boring ' +
                'jobs with machines would free human capacity for creativity ' +
                'rather than produce mass unemployment.',
            source: 'Simon, The Shape of Automation, p. 97'
        },

        'cybernation-revolution': {
            title: 'The Cybernation Revolution',
            definition:
                'The era of production created by the combination of the ' +
                'computer and the automated, self-regulating machine, ' +
                'creating almost unlimited productive capacity. Coined in ' +
                'the 1964 Triple Revolution memorandum to President Johnson, ' +
                'which warned that conventional economic analysis failed to ' +
                'account for a transition happening faster than the ' +
                'agricultural and industrial revolutions combined.',
            source:
                'Ad Hoc Committee on the Triple Revolution, ' +
                'The Triple Revolution (1964), p. 2'
        },

        'first-step-fallacy': {
            title: 'The First Step Fallacy',
            definition:
                'Hubert Dreyfus&rsquo;s philosophical term describing the mistaken ' +
                'assumption that success in solving problems within simple, ' +
                'abstract, rule-bound domains will naturally scale to the ' +
                'complexity of real-world environments. Dreyfus argued that ' +
                'Symbolic AI suffered profoundly from this fallacy — winning ' +
                'at chess did not mean the machine was any closer to ' +
                'navigating an open world.',
            source:
                'Dreyfus, Alchemy and Artificial Intelligence ' +
                '(RAND Corporation, 1965), p. 16'
        },

        'semantics-vs-syntax': {
            title: 'Semantics vs. Syntax',
            definition:
                'Searle&rsquo;s distinction that machines can manipulate the form ' +
                '(syntax) of language perfectly, without ever possessing the ' +
                'actual meaning or intentionality (semantics) of the words. ' +
                'Central to his &ldquo;Chinese Room&rdquo; argument that purely formal ' +
                'programs cannot constitute genuine understanding, regardless ' +
                'of how sophisticated their behavior appears.',
            source:
                'Searle, &ldquo;Minds, Brains, and Programs&rdquo; ' +
                '(Behavioral and Brain Sciences, 1980), pp. 422–423'
        }
    };


    /* -----------------------------------------------------------------
       DOM refs + state
       ----------------------------------------------------------------- */

    const dom = {
        sidebar:    null,
        title:      null,
        body:       null,
        source:     null,
        closeBtn:   null
    };

    const state = {
        isOpen:    false,
        lastFocus: null,    // where focus was before we opened — returned on close
        lastTerm:  null     // key of the term currently displayed
    };


    /* -----------------------------------------------------------------
       Open / close / swap
       ----------------------------------------------------------------- */

    function openTerm(termKey) {
        if (!dom.sidebar) return;

        const entry = GLOSSARY[termKey];
        if (!entry) {
            console.warn('glossary.js: no entry for data-term="' + termKey + '"');
            return;
        }

        // Remember the focus origin only on the initial open, not on
        // subsequent term swaps within the same open session.
        if (!state.isOpen) {
            state.lastFocus = document.activeElement;
        }

        // Populate content. innerHTML is safe here because the text
        // comes from our trusted GLOSSARY constant, not user input.
        dom.title.innerHTML  = entry.title;
        dom.body.innerHTML   = '<p>' + entry.definition + '</p>';
        dom.source.innerHTML = entry.source ? entry.source : '';

        // Reset scroll (in case the previous term had a longer body).
        dom.sidebar.scrollTop = 0;

        dom.sidebar.classList.add('is-open');
        dom.sidebar.setAttribute('aria-hidden', 'false');
        state.isOpen   = true;
        state.lastTerm = termKey;

        // Park focus on the close button for immediate keyboard access.
        if (dom.closeBtn && typeof dom.closeBtn.focus === 'function') {
            dom.closeBtn.focus();
        }
    }

    function close() {
        if (!dom.sidebar || !state.isOpen) return;

        dom.sidebar.classList.remove('is-open');
        dom.sidebar.setAttribute('aria-hidden', 'true');
        state.isOpen   = false;
        state.lastTerm = null;

        // Restore focus to where it was before open, if possible.
        if (state.lastFocus && typeof state.lastFocus.focus === 'function') {
            try { state.lastFocus.focus(); } catch (e) { /* ignore */ }
        }
        state.lastFocus = null;
    }


    /* -----------------------------------------------------------------
       Event bindings (delegation)
       ----------------------------------------------------------------- */

    function bindEvents() {
        // Click handler: open term, swap terms, or close on outside click.
        document.addEventListener('click', function (event) {
            const term = event.target && event.target.closest
                ? event.target.closest('.glossary-term')
                : null;

            if (term) {
                event.preventDefault();
                const key = term.dataset.term;
                if (key) openTerm(key);
                return;
            }

            // Click inside the sidebar itself → ignore (let children handle it).
            if (event.target && event.target.closest &&
                event.target.closest('#glossary-sidebar')) {
                return;
            }

            // Click anywhere else while open → close.
            if (state.isOpen) close();
        });

        // Close button.
        if (dom.closeBtn) {
            dom.closeBtn.addEventListener('click', function (event) {
                event.preventDefault();
                close();
            });
        }

        // Escape key dismisses.
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && state.isOpen) {
                close();
            }
        });
    }


    /* -----------------------------------------------------------------
       Accessibility prep — make every term keyboard-activatable.
             Each term gets tabindex="0" and role="button" so it can be
             reached via Tab. Enter or Space activates it.
       ----------------------------------------------------------------- */

    function makeTermsFocusable() {
        const terms = document.querySelectorAll('.glossary-term');
        terms.forEach(function (term) {
            if (!term.hasAttribute('tabindex')) {
                term.setAttribute('tabindex', '0');
            }
            if (!term.hasAttribute('role')) {
                term.setAttribute('role', 'button');
            }
            if (!term.hasAttribute('aria-label') && term.dataset.term) {
                // Build a readable label: "cybernation-revolution" → "the cybernation revolution"
                const readable = term.dataset.term.replace(/-/g, ' ');
                term.setAttribute('aria-label', 'Show glossary entry for ' + readable);
            }

            // Enter / Space should activate, matching role="button" semantics.
            term.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    const key = term.dataset.term;
                    if (key) openTerm(key);
                }
            });
        });
    }


    /* -----------------------------------------------------------------
       Init
       ----------------------------------------------------------------- */

    function init() {
        dom.sidebar  = document.getElementById('glossary-sidebar');
        dom.title    = document.getElementById('glossary-term-title');
        dom.body     = document.getElementById('glossary-term-body');
        dom.source   = document.getElementById('glossary-source');
        dom.closeBtn = document.getElementById('glossary-close');

        if (!dom.sidebar || !dom.title || !dom.body) {
            console.warn('glossary.js: sidebar elements missing; glossary disabled.');
            return;
        }

        makeTermsFocusable();
        bindEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();