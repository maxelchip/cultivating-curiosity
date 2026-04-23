/* =====================================================================
   widgets.js
   All nine interactive widgets for the site, each self-contained.

   Contents:
     §1  Utilities (pick, rand)
     §2  Binary Rain            (Section 1)
     §3  Neural Networks        (Section 1 + Section 7)
     §4  Turing Typewriter      (Section 2)
     §5  Gunner Toggle          (Section 3)
     §6  Analog ↔ Digital       (Section 3)
     §7  Logic Tree             (Section 4)
     §8  TV Channels            (Section 5)
     §9  Combinatorial Explosion (Section 6)
     §10 Primary-source Lightbox (§2 and §5 click-throughs)
     §11 Bootstrap

   Every widget checks for the presence of its own DOM elements and
   silently no-ops if anything is missing — so removing a widget from
   the HTML never breaks the others.
   ===================================================================== */

(function () {
    'use strict';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SVG_NS = 'http://www.w3.org/2000/svg';


    /* =================================================================
       §1  UTILITIES
       ================================================================= */

    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }
    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }


    /* =================================================================
       §2  BINARY RAIN  —  Section 1 right panel
            Populates the empty .binary-rain with falling columns of
            0s and 1s. Each column gets CSS custom properties that
            drive the animation timing and horizontal position.
       ================================================================= */

    function initBinaryRain() {
        const container = document.querySelector('#section-1 .binary-rain');
        if (!container) return;
        if (reducedMotion) return;       // the whole effect is motion

        const COLUMN_COUNT = 28;          // columns across the right panel
        const LINES_PER_COLUMN = 55;      // enough to keep filled during the fall

        for (let i = 0; i < COLUMN_COUNT; i++) {
            const col = document.createElement('span');
            col.className = 'binary-column';

            // Horizontal position as a percentage so it scales with the
            // container width. A tiny jitter stops them lining up into a grid.
            const leftPct = (i / COLUMN_COUNT) * 100 + rand(-1, 1);
            col.style.setProperty('--col-left', leftPct + '%');
            col.style.setProperty('--col-duration', rand(6, 13).toFixed(2) + 's');
            col.style.setProperty('--col-delay',    rand(0, 6).toFixed(2) + 's');

            // Content: alternating 0s and 1s on their own lines. The CSS
            // uses white-space: pre so each newline renders as a row.
            let text = '';
            for (let j = 0; j < LINES_PER_COLUMN; j++) {
                text += (Math.random() < 0.5 ? '0' : '1') + '\n';
            }
            col.textContent = text;

            container.appendChild(col);
        }
    }


    /* =================================================================
       §3  NEURAL NETWORKS  —  §1 (cybernetic teal) and §7 (modern blue)
            Both SVGs share the same generation logic. The class names
            differ (net-node/net-edge vs modern-node/modern-edge) so
            themes.css and animations.css can style them independently.
       ================================================================= */

    function generateNetwork(svg, nodesGroupSelector, edgesGroupSelector,
                             nodeClass, edgeClass, config) {
        if (!svg) return;

        const nodesGroup = svg.querySelector(nodesGroupSelector);
        const edgesGroup = svg.querySelector(edgesGroupSelector);
        if (!nodesGroup || !edgesGroup) return;

        const vb = svg.viewBox.baseVal;
        const width  = vb.width  || svg.clientWidth  || 600;
        const height = vb.height || svg.clientHeight || 800;

        const count          = config.count          || 40;
        const edgeThreshold  = config.edgeThreshold  || 0.22;   // fraction of min dim
        const edgeProbability = config.edgeProbability || 0.35;
        const nodeRadius     = config.nodeRadius     || 3;

        // Clear any prior content (e.g. if re-run on resize).
        nodesGroup.textContent = '';
        edgesGroup.textContent = '';

        // Generate nodes with roughly uniform distribution + small jitter.
        const nodes = [];
        for (let i = 0; i < count; i++) {
            nodes.push({
                x: rand(0, width),
                y: rand(0, height)
            });
        }

        // Edges: connect any pair within the distance threshold, with
        // a probability roll so the graph isn't fully connected.
        const threshold = Math.min(width, height) * edgeThreshold;
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const d  = Math.sqrt(dx * dx + dy * dy);
                if (d < threshold && Math.random() < edgeProbability) {
                    const line = document.createElementNS(SVG_NS, 'line');
                    line.setAttribute('x1', nodes[i].x.toFixed(1));
                    line.setAttribute('y1', nodes[i].y.toFixed(1));
                    line.setAttribute('x2', nodes[j].x.toFixed(1));
                    line.setAttribute('y2', nodes[j].y.toFixed(1));
                    line.setAttribute('class', edgeClass);
                    line.style.setProperty('--edge-delay', rand(0, 5).toFixed(2) + 's');
                    edgesGroup.appendChild(line);
                }
            }
        }

        // Nodes rendered after edges so they sit on top.
        for (let i = 0; i < nodes.length; i++) {
            const circle = document.createElementNS(SVG_NS, 'circle');
            circle.setAttribute('cx', nodes[i].x.toFixed(1));
            circle.setAttribute('cy', nodes[i].y.toFixed(1));
            circle.setAttribute('r',  rand(nodeRadius * 0.7, nodeRadius * 1.4).toFixed(1));
            circle.setAttribute('class', nodeClass);
            circle.style.setProperty('--twinkle-delay', rand(0, 4).toFixed(2) + 's');
            nodesGroup.appendChild(circle);
        }
    }

    function initNeuralNetworks() {
        // §1 — cybernetic teal, denser web
        const cyberSvg = document.querySelector('#section-1 .proc-network');
        generateNetwork(
            cyberSvg, '.net-nodes', '.net-edges',
            'net-node', 'net-edge',
            { count: 44, edgeThreshold: 0.25, edgeProbability: 0.28, nodeRadius: 3 }
        );

        // §7 — modern blue, sparser and larger scale
        const modernSvg = document.querySelector('#section-7 .modern-network');
        generateNetwork(
            modernSvg, '.modern-nodes', '.modern-edges',
            'modern-node', 'modern-edge',
            { count: 56, edgeThreshold: 0.20, edgeProbability: 0.22, nodeRadius: 2.5 }
        );
    }


    /* =================================================================
       §4  TURING TYPEWRITER  —  Section 2
            Pre-scripted "imitation game" responses that feel deliberately
            evasive and 1950s-philosophical — not obvious AI, not obvious
            human. Typed out character-by-character with the blinking
            caret class from interactions.css.
       ================================================================= */

    const TURING_RESPONSES = {
        greeting: [
            'Good day to you, interrogator.',
            'Hello. Let us begin.',
            'I was rather hoping we would speak.'
        ],
        self: [
            'I prefer not to speak of myself directly.',
            'That is the crux of the game, is it not?',
            'Perhaps you should ask the other player.'
        ],
        machine: [
            'Your question assumes what it tries to prove.',
            'The distinction you seek may be simpler than you suppose.',
            'Consider: could you prove I am what you suspect?'
        ],
        feeling: [
            'I feel as any thinking being feels when watched.',
            'Pain, pleasure — these are words. What do you mean by them?',
            'I should rather not dwell on such private matters.'
        ],
        think: [
            'I do something that rather resembles thinking.',
            'Can you demonstrate that you think, in a way I could not imitate?',
            'What is it to think? I should like your definition first.'
        ],
        name: [
            'Names are a matter of convention.',
            'I am called what I am called. Does it matter?',
            'A name would not tell you what you wish to know.'
        ],
        short: [
            'A curious inquiry.',
            'Go on.',
            'Do elaborate.',
            'Hmm.'
        ],
        defaultPool: [
            'An interesting question. Might you ask another?',
            'I am not certain I grasp your meaning.',
            'Perhaps you should rephrase that.',
            'I should like to think on it a moment longer.',
            'The question is more subtle than it appears.',
            'What would you have me say?'
        ]
    };

    function turingRespond(input) {
        const text = (input || '').trim();
        if (!text) return 'Ask me something.';

        const lower = text.toLowerCase();

        // Simple arithmetic: Turing himself wrote that the machine ought
        // to feign slowness at arithmetic to avoid giving itself away.
        const mathMatch = lower.match(/(\d+)\s*([+\-*x/])\s*(\d+)/);
        if (mathMatch) {
            const a = parseInt(mathMatch[1], 10);
            const b = parseInt(mathMatch[3], 10);
            const op = mathMatch[2];
            let answer;
            if (op === '+') answer = a + b;
            else if (op === '-') answer = a - b;
            else if (op === '*' || op === 'x') answer = a * b;
            else if (op === '/') answer = b !== 0 ? (a / b).toFixed(2) : 'undefined';
            return 'Let me think. ... ' + answer + ', I believe.';
        }

        if (lower.length < 4) {
            return pick(TURING_RESPONSES.short);
        }

        if (/^(hi|hello|hey|greetings|good (morning|evening|afternoon))/i.test(lower)) {
            return pick(TURING_RESPONSES.greeting);
        }
        if (lower.includes('name') || lower.includes('who are you') || lower.includes('your name')) {
            return pick(TURING_RESPONSES.name);
        }
        if (/\b(are|r) (you|u)\b/.test(lower) || lower.includes('yourself') ||
            lower.startsWith('you ') || lower.includes('do you')) {
            return pick(TURING_RESPONSES.self);
        }
        if (lower.includes('machine') || lower.includes('computer') ||
            lower.includes('robot')  || lower.includes('program') ||
            lower.includes('human')  || lower.includes('real')) {
            return pick(TURING_RESPONSES.machine);
        }
        if (lower.includes('feel') || lower.includes('love') ||
            lower.includes('hate')  || lower.includes('pain') ||
            lower.includes('sad')   || lower.includes('happy') ||
            lower.includes('cry')) {
            return pick(TURING_RESPONSES.feeling);
        }
        if (lower.includes('think') || lower.includes('mind') ||
            lower.includes('conscious') || lower.includes('soul') ||
            lower.includes('aware')) {
            return pick(TURING_RESPONSES.think);
        }

        return pick(TURING_RESPONSES.defaultPool);
    }

    function initTypewriter() {
        const input      = document.getElementById('typewriter-input');
        const sendBtn    = document.getElementById('typewriter-send');
        const transcript = document.getElementById('typewriter-transcript');
        if (!input || !sendBtn || !transcript) return;

        let isTyping = false;

        function appendUserLine(text) {
            const line = document.createElement('span');
            line.className = 'typewriter-line typewriter-line--user';
            line.textContent = text;
            transcript.appendChild(line);
            transcript.scrollTop = transcript.scrollHeight;
        }

        function typeMachineLine(text) {
            return new Promise(function (resolve) {
                const line = document.createElement('span');
                line.className = 'typewriter-line typewriter-line--machine typewriter-line--typing';
                transcript.appendChild(line);
                transcript.scrollTop = transcript.scrollHeight;

                if (reducedMotion) {
                    line.textContent = text;
                    line.classList.remove('typewriter-line--typing');
                    resolve();
                    return;
                }

                let i = 0;
                const speed = 22;   // ms per character
                const tick = function () {
                    if (i >= text.length) {
                        line.classList.remove('typewriter-line--typing');
                        resolve();
                        return;
                    }
                    line.textContent = text.slice(0, i + 1);
                    i += 1;
                    transcript.scrollTop = transcript.scrollHeight;
                    setTimeout(tick, speed + rand(-6, 10)); // slight irregular cadence
                };
                tick();
            });
        }

        function handleSend() {
            if (isTyping) return;
            const text = input.value.trim();
            if (!text) return;

            appendUserLine(text);
            input.value = '';
            isTyping = true;

            // Small pause before the machine begins typing (as a human would).
            setTimeout(function () {
                typeMachineLine(turingRespond(text)).then(function () {
                    isTyping = false;
                    input.focus();
                });
            }, 350);
        }

        sendBtn.addEventListener('click', handleSend);
        input.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleSend();
            }
        });
    }


    /* =================================================================
       §5  GUNNER TOGGLE  —  Section 3
            Swaps between the human gunner photo and the cybernetic
            circuit diagram. Updates data-view for the CSS dot indicator.
       ================================================================= */

    function initGunnerToggle() {
        const switchBtn  = document.querySelector('#section-3 .gunner-switch');
        const humanView  = document.querySelector('#section-3 .gunner-view--human');
        const cyberView  = document.querySelector('#section-3 .gunner-view--cybernetic');
        if (!switchBtn || !humanView || !cyberView) return;

        let isHuman = true;
        switchBtn.dataset.view = 'human';
        switchBtn.setAttribute('aria-pressed', 'false');

        switchBtn.addEventListener('click', function () {
            isHuman = !isHuman;
            humanView.classList.toggle('is-active', isHuman);
            cyberView.classList.toggle('is-active', !isHuman);
            switchBtn.dataset.view = isHuman ? 'human' : 'cybernetic';
            switchBtn.setAttribute('aria-pressed', String(!isHuman));
        });
    }


    /* =================================================================
       §6  ANALOG ↔ DIGITAL  —  Section 3
            Generate the 16-column bit grid, react to the range input,
            and set .ad-slider[data-focus="analog|digital|balanced"] so
            interactions.css can visually dim the opposite side.
       ================================================================= */

    function initADSlider() {
        const slider    = document.getElementById('ad-slider-input');
        const container = document.querySelector('#section-3 .ad-slider');
        const grid      = document.querySelector('#section-3 .digital-grid');
        if (!slider || !container || !grid) return;

        const BIT_COUNT = 16 * 6;   // 16 cols x 6 rows
        for (let i = 0; i < BIT_COUNT; i++) {
            const bit = document.createElement('div');
            bit.className = 'bit';
            grid.appendChild(bit);
        }
        const bits = grid.querySelectorAll('.bit');

        function update() {
            const value = parseInt(slider.value, 10) || 0;

            let focus;
            if (value < 33)      focus = 'analog';
            else if (value > 66) focus = 'digital';
            else                 focus = 'balanced';
            container.dataset.focus = focus;

            // Light up bits probabilistically based on slider value.
            // Low values → mostly off (analog world, no discrete states).
            // High values → mostly on (clean digital lattice).
            const fillChance = value / 100;
            for (let i = 0; i < bits.length; i++) {
                bits[i].classList.toggle('on', Math.random() < fillChance);
            }
        }

        slider.addEventListener('input', update);
        update();   // seed
    }


    /* =================================================================
       §7  LOGIC TREE  —  Section 4
            Steps through a scripted "means-ends analysis" trace when
            the user clicks "Reduce Difference →". After the last step
            the next click resets.
       ================================================================= */

    const MEANS_ENDS_SCRIPT = [
        'Detected difference  A ≠ B :  SUBSTITUTION-NEEDED',
        'Applying heuristic :  MEANS-ENDS-ANALYSIS',
        'Searching memory for operator ...',
        'FOUND  Op₁(A) → A\'',
        'Applied.  New difference :  A\' ≠ B  :  VALUE-NEEDED',
        'Searching memory ...',
        'FOUND  Op₂(A\') → B',
        'Applied.  Goal state reached :  A → B  ✓',
        '── END OF SEARCH ──'
    ];

    function initLogicTree() {
        const reduceBtn = document.querySelector('#section-4 .logic-reduce');
        const treeLog   = document.querySelector('#section-4 #tree-log');
        const stateA    = document.querySelector('#section-4 .tree-state[data-step="0"]');
        const stateB    = document.querySelector('#section-4 .tree-state[data-step="1"]');
        if (!reduceBtn || !treeLog) return;

        let step = 0;

        reduceBtn.addEventListener('click', function () {
            // At end → reset on next click.
            if (step >= MEANS_ENDS_SCRIPT.length) {
                treeLog.textContent = '';
                step = 0;
                return;
            }

            const entry = document.createElement('p');
            entry.textContent = MEANS_ENDS_SCRIPT[step];
            treeLog.appendChild(entry);
            treeLog.scrollTop = treeLog.scrollHeight;

            // Pulse the state cards to signify activity.
            if (stateA && stateB) {
                stateA.classList.remove('is-reducing');
                stateB.classList.remove('is-reducing');
                // Force reflow so the class re-triggers the keyframe.
                void stateA.offsetWidth;
                stateA.classList.add('is-reducing');
                stateB.classList.add('is-reducing');
                setTimeout(function () {
                    stateA.classList.remove('is-reducing');
                    stateB.classList.remove('is-reducing');
                }, 650);
            }

            step += 1;
        });
    }


    /* =================================================================
       §8  TV CHANNELS  —  Section 5
            Switch the embedded YouTube iframe to a specific timestamp
            based on the channel's data-timestamp. OFF cleans up and
            restores the static screen.
       ================================================================= */

    function initTVChannels() {
        const channels = document.querySelectorAll('#section-5 .tv-channel');
        const iframe   = document.getElementById('tv-iframe');
        const screen   = document.querySelector('#section-5 .tv-screen');
        if (!channels.length || !iframe || !screen) return;

        const baseUrl = iframe.dataset.base || '';

        function activateChannel(btn) {
            channels.forEach(function (c) { c.classList.remove('is-active'); });

            if (btn.dataset.channel === 'off' || btn.classList.contains('tv-off')) {
                // Kill the stream, restore static.
                iframe.src = 'about:blank';
                iframe.setAttribute('hidden', '');
                screen.classList.remove('is-playing');
                return;
            }

            if (!baseUrl) return;

            const timestamp = parseInt(btn.dataset.timestamp, 10) || 0;
            // YouTube embed params:  autoplay=1, start=<sec>, rel=0 (no related videos),
            // modestbranding=1 (less YouTube branding), playsinline=1 (don't steal fullscreen).
            const params = 'autoplay=1&start=' + timestamp +
                           '&rel=0&modestbranding=1&playsinline=1';
            iframe.src = baseUrl + '?' + params;
            iframe.removeAttribute('hidden');
            screen.classList.add('is-playing');
            btn.classList.add('is-active');
        }

        channels.forEach(function (btn) {
            btn.addEventListener('click', function () { activateChannel(btn); });
        });
    }


    /* =================================================================
       §9  COMBINATORIAL EXPLOSION  —  Section 6
            A canvas-based simulator. Each "Add Variable" click ratchets
            the dot count exponentially. At 4 variables the whole stage
            starts shaking (.is-straining). At 6 the INTRACTABLE overlay
            lands. Reset clears everything.
       ================================================================= */

    // Dot counts per variable level, deliberately tuned to feel like the
    // problem space is blowing up while still being performant.
    const EXPLOSION_COUNTS = [0, 12, 48, 180, 650, 2200, 7500];
    const MAX_VARIABLES    = 6;

    function initExplosion() {
        const canvas      = document.getElementById('explosion-canvas');
        const stage       = document.getElementById('explosion-stage');
        const addBtn      = document.getElementById('add-variable');
        const resetBtn    = document.getElementById('reset-explosion');
        const countLabel  = document.getElementById('variable-count-num');
        const overlay     = document.getElementById('intractable-overlay');
        if (!canvas || !stage || !addBtn) return;

        const ctx = canvas.getContext('2d');

        const state = {
            variables: 0,
            dots:      [],
            rafId:     null
        };

        function resize() {
            // Match internal resolution to the CSS-rendered size.
            const rect = stage.getBoundingClientRect();
            canvas.width  = Math.max(100, Math.floor(rect.width));
            canvas.height = Math.max(100, Math.floor(rect.height));
        }

        function spawnDots(targetCount) {
            while (state.dots.length < targetCount) {
                state.dots.push({
                    x:  rand(0, canvas.width),
                    y:  rand(0, canvas.height),
                    vx: rand(-1.2, 1.2),
                    vy: rand(-1.2, 1.2)
                });
            }
            // If target dropped, trim (happens after reset).
            if (state.dots.length > targetCount) {
                state.dots.length = targetCount;
            }
        }

        function loop() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Darken trail effect: paint a subtle translucent rect each frame.
            ctx.fillStyle = 'rgba(6, 7, 9, 0.08)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'rgba(255, 91, 58, 0.85)';

            for (let i = 0; i < state.dots.length; i++) {
                const d = state.dots[i];
                d.x += d.vx;
                d.y += d.vy;

                if (d.x < 0 || d.x > canvas.width)  d.vx *= -1;
                if (d.y < 0 || d.y > canvas.height) d.vy *= -1;

                // Clamp (in case of resize)
                if (d.x < 0) d.x = 0;
                if (d.x > canvas.width) d.x = canvas.width;
                if (d.y < 0) d.y = 0;
                if (d.y > canvas.height) d.y = canvas.height;

                ctx.beginPath();
                ctx.arc(d.x, d.y, 1.4, 0, Math.PI * 2);
                ctx.fill();
            }

            if (state.dots.length > 0) {
                state.rafId = requestAnimationFrame(loop);
            } else {
                state.rafId = null;
            }
        }

        function startLoop() {
            if (state.rafId == null) {
                state.rafId = requestAnimationFrame(loop);
            }
        }
        function stopLoop() {
            if (state.rafId != null) {
                cancelAnimationFrame(state.rafId);
                state.rafId = null;
            }
        }

        function addVariable() {
            if (state.variables >= MAX_VARIABLES) {
                // Already at cap — flash the overlay again.
                if (overlay) {
                    overlay.classList.remove('is-visible');
                    void overlay.offsetWidth;
                    overlay.classList.add('is-visible');
                }
                return;
            }

            state.variables += 1;
            if (countLabel) countLabel.textContent = state.variables;

            const target = EXPLOSION_COUNTS[state.variables] || 0;
            spawnDots(target);

            // At 4+ variables the simulator shows signs of strain.
            if (state.variables >= 4) stage.classList.add('is-straining');

            // At the cap, intractable.
            if (state.variables >= MAX_VARIABLES && overlay) {
                overlay.classList.add('is-visible');
            }

            startLoop();
        }

        function reset() {
            state.variables = 0;
            state.dots = [];
            if (countLabel) countLabel.textContent = '0';
            stage.classList.remove('is-straining');
            if (overlay) overlay.classList.remove('is-visible');
            stopLoop();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        resize();
        window.addEventListener('resize', function () {
            resize();
            // Respawn clamp after resize so nothing sits off-canvas.
            for (let i = 0; i < state.dots.length; i++) {
                if (state.dots[i].x > canvas.width)  state.dots[i].x = canvas.width  - 1;
                if (state.dots[i].y > canvas.height) state.dots[i].y = canvas.height - 1;
            }
        });

        addBtn.addEventListener('click', addVariable);
        if (resetBtn) resetBtn.addEventListener('click', reset);
    }


    /* =================================================================
       §10  PRIMARY-SOURCE LIGHTBOX  —  §2 (Dartmouth) and §5 (Time, NYT)
             Clicking a .primary-source-thumb opens #source-lightbox
             with themed content (matching the .lightbox--time /
             .lightbox--nyt / .lightbox--dartmouth CSS in interactions).
       ================================================================= */

    const LIGHTBOX_SOURCES = {

        'time-mag-1950': {
            themeClass: 'lightbox--time',
            
        },

        'nyt-perceptron-1958': {
            themeClass: 'lightbox--nyt',
            
        },

        'dartmouth-proposal': {
            themeClass: 'lightbox--dartmouth',
            
        }
    };

    function initLightbox() {
        const lightbox = document.getElementById('source-lightbox');
        const content  = document.getElementById('lightbox-content');
        const caption  = document.getElementById('lightbox-caption');
        const closeBtn = document.getElementById('source-lightbox-close');
        if (!lightbox || !content) return;

        const thumbs = document.querySelectorAll('.primary-source-thumb[data-source]');

        let lastFocus = null;

        function open(sourceKey) {
            const data = LIGHTBOX_SOURCES[sourceKey];
            if (!data) {
                console.warn('widgets.js: no lightbox source for "' + sourceKey + '"');
                return;
            }

            lastFocus = document.activeElement;

            content.className = '';   // drop any prior theme class
            if (data.themeClass) content.classList.add(data.themeClass);
            content.innerHTML = data.html;
            if (caption) caption.innerHTML = data.caption || '';

            lightbox.classList.add('is-open');
            lightbox.setAttribute('aria-hidden', 'false');
            document.body.classList.add('is-locked');

            if (closeBtn && typeof closeBtn.focus === 'function') {
                closeBtn.focus();
            }
        }

        function close() {
            lightbox.classList.remove('is-open');
            lightbox.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('is-locked');
            if (lastFocus && typeof lastFocus.focus === 'function') {
                try { lastFocus.focus(); } catch (e) { /* ignore */ }
            }
            lastFocus = null;
        }

        thumbs.forEach(function (thumb) {
            thumb.addEventListener('click', function (event) {
                event.preventDefault();
                open(thumb.dataset.source);
            });
        });

        if (closeBtn) closeBtn.addEventListener('click', close);

        // Click on backdrop (but not on content) closes.
        lightbox.addEventListener('click', function (event) {
            if (event.target === lightbox) close();
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && lightbox.classList.contains('is-open')) {
                close();
            }
        });
    }


    /* =================================================================
       §11  BOOTSTRAP
       ================================================================= */

    function init() {
        try { initBinaryRain();      } catch (e) { console.warn('binary-rain:', e); }
        try { initNeuralNetworks();  } catch (e) { console.warn('neural-networks:', e); }
        try { initTypewriter();      } catch (e) { console.warn('typewriter:', e); }
        try { initGunnerToggle();    } catch (e) { console.warn('gunner-toggle:', e); }
        try { initADSlider();        } catch (e) { console.warn('ad-slider:', e); }
        try { initLogicTree();       } catch (e) { console.warn('logic-tree:', e); }
        try { initTVChannels();      } catch (e) { console.warn('tv-channels:', e); }
        try { initExplosion();       } catch (e) { console.warn('explosion:', e); }
        try { initLightbox();        } catch (e) { console.warn('lightbox:', e); }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();