/**
 * Tic Tac Toe : Sovereign Edition (HTML5 / CSS3 / Vanilla JS)
 * JSON-Driven Architecture with Interactive Graphics, Sound Synthesis, Keyboard Controls & Minimax Pro AI
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let gameData = null;
    let currentScreen = 'screen-password';
    let attemptsRemaining = 4;
    let isAudioEnabled = true;
    let gameMode = 'pvp'; // 'pvp' or 'ai'
    let aiDifficulty = 'hard'; // 'easy', 'medium', 'hard'
    let currentPlayer = '1';
    let boardState = Array(9).fill(null);
    let scores = { '1': 0, '2': 0 };
    let isGameOver = false;
    let isAiThinking = false;

    // --- 3D ENGINE STATE ---
    let scene, camera, renderer;
    let cellMeshes = [];
    let symbolMeshes = Array(9).fill(null);
    let winBeamMesh = null;
    let mouse = new THREE.Vector2();
    let raycaster = new THREE.Raycaster();
    let hoveredCellIndex = null;
    let mouseX = 0, mouseY = 0;

    // --- DOM ELEMENTS ---
    const screens = {
        'screen-password': document.getElementById('screen-password'),
        'screen-menu': document.getElementById('screen-menu'),
        'screen-ai-level': document.getElementById('screen-ai-level'),
        'screen-game': document.getElementById('screen-game'),
        'screen-guide': document.getElementById('screen-guide')
    };

    // Auth Elements
    const passwordForm = document.getElementById('password-form');
    const passwordInput = document.getElementById('password-input');
    const attemptsCount = document.getElementById('attempts-count');
    const attemptsProgress = document.getElementById('attempts-progress');
    const passwordFeedback = document.getElementById('password-feedback');
    const passwordPrompt = document.getElementById('password-prompt');

    // Menu Elements
    const menuTitle = document.getElementById('menu-title');
    const menuSubtitle = document.getElementById('menu-subtitle');
    const menuOptionsContainer = document.getElementById('menu-options-container');
    const authorCredits = document.getElementById('author-credits');
    const authorSource = document.getElementById('author-source');

    // AI Level Elements
    const aiLevelTitle = document.getElementById('ai-level-title');
    const aiLevelSubtitle = document.getElementById('ai-level-subtitle');
    const aiLevelsContainer = document.getElementById('ai-levels-container');
    const btnAiBack = document.getElementById('btn-ai-back');

    // Game Elements
    const appVersion = document.getElementById('app-version');
    const themeSelect = document.getElementById('theme-select');
    const btnAudio = document.getElementById('btn-audio');
    const btnGameBack = document.getElementById('btn-game-back');
    const btnGameReset = document.getElementById('btn-game-reset');
    const p1Name = document.getElementById('p1-name');
    const p2Name = document.getElementById('p2-name');
    const p1Score = document.getElementById('p1-score');
    const p2Score = document.getElementById('p2-score');
    const aiDifficultyBadge = document.getElementById('ai-difficulty-badge');
    const turnDisplay = document.getElementById('turn-display');
    const gameBoard = document.getElementById('game-board');
    const winLine = document.getElementById('win-line');
    const gameStatusPanel = document.getElementById('game-status-panel');
    const statusTitle = document.getElementById('status-title');
    const continuePrompt = document.getElementById('continue-prompt');
    const btnPlayAgain = document.getElementById('btn-play-again');
    const btnMenuReturn = document.getElementById('btn-menu-return');

    // Guide Elements
    const guideTitle = document.getElementById('guide-title');
    const guideContentContainer = document.getElementById('guide-content-container');
    const btnGuideBack = document.getElementById('btn-guide-back');

    // Toast Elements
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    let toastTimeout = null;

    // --- WEB AUDIO API SYNTHESIZER ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    function playSound(type) {
        if (!isAudioEnabled) return;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;

        switch(type) {
            case 'click':
                createTone(440, 0.05, 'sine', now);
                break;
            case 'grant':
                createTone(523.25, 0.1, 'triangle', now); // C5
                createTone(659.25, 0.1, 'triangle', now + 0.1); // E5
                createTone(783.99, 0.15, 'triangle', now + 0.2); // G5
                createTone(1046.50, 0.25, 'triangle', now + 0.35); // C6
                break;
            case 'deny':
                createTone(150, 0.2, 'sawtooth', now);
                createTone(110, 0.3, 'sawtooth', now + 0.15);
                break;
            case 'placeX':
                createTone(587.33, 0.08, 'sine', now); // D5
                createTone(880, 0.12, 'sine', now + 0.08); // A5
                break;
            case 'placeO':
                createTone(659.25, 0.08, 'sine', now); // E5
                createTone(987.77, 0.12, 'sine', now + 0.08); // B5
                break;
            case 'win':
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                    createTone(freq, 0.15, 'triangle', now + idx * 0.12);
                });
                createTone(1318.51, 0.4, 'sine', now + 0.48); // E6
                break;
            case 'draw':
                createTone(330, 0.15, 'sine', now);
                createTone(293.66, 0.15, 'sine', now + 0.15);
                createTone(261.63, 0.25, 'sine', now + 0.3);
                break;
        }
    }

    function createTone(freq, duration, waveType, startTime) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = waveType;
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    // --- INTERACTIVE CANVAS BACKGROUND ---
    const bgCanvas = document.getElementById('bg-canvas');
    const bgCtx = bgCanvas.getContext('2d');
    let particles = [];

    function initBgCanvas() {
        function resize() {
            bgCanvas.width = window.innerWidth;
            bgCanvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        // Create particles
        const particleCount = Math.min(window.innerWidth / 15, 80);
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * bgCanvas.width,
                y: Math.random() * bgCanvas.height,
                radius: Math.random() * 2 + 1,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                alpha: Math.random() * 0.5 + 0.2
            });
        }
        animateBg();
    }

    function animateBg() {
        bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        
        // Draw particles
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            // Bounce edges
            if (p.x < 0 || p.x > bgCanvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > bgCanvas.height) p.vy *= -1;

            bgCtx.beginPath();
            bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            bgCtx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
            bgCtx.fill();
        });

        requestAnimationFrame(animateBg);
    }

    // --- INTERACTIVE FX CANVAS (CONFETTI) ---
    const fxCanvas = document.getElementById('fx-canvas');
    const fxCtx = fxCanvas.getContext('2d');
    let confetti = [];

    function initFxCanvas() {
        function resize() {
            fxCanvas.width = window.innerWidth;
            fxCanvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();
        animateFx();
    }

    function triggerConfetti() {
        confetti = [];
        const colors = ['#ff007f', '#00f0ff', '#ffd700', '#00ff66', '#ffffff'];
        for (let i = 0; i < 120; i++) {
            confetti.push({
                x: fxCanvas.width / 2,
                y: fxCanvas.height / 2,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.5) * 16 - 4,
                radius: Math.random() * 5 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                decay: Math.random() * 0.015 + 0.015
            });
        }
    }

    function animateFx() {
        fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
        
        for (let i = confetti.length - 1; i >= 0; i--) {
            const c = confetti[i];
            c.x += c.vx;
            c.y += c.vy;
            c.vy += 0.3; // Gravity
            c.alpha -= c.decay;

            if (c.alpha <= 0) {
                confetti.splice(i, 1);
                continue;
            }

            fxCtx.beginPath();
            fxCtx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
            fxCtx.fillStyle = c.color;
            fxCtx.globalAlpha = c.alpha;
            fxCtx.fill();
            fxCtx.globalAlpha = 1;
        }

        requestAnimationFrame(animateFx);
    }

    // --- TOAST NOTIFICATIONS ---
    function showToast(msg, type = 'info') {
        toastMsg.textContent = msg;
        const icon = document.getElementById('toast-icon');
        icon.className = 'toast-icon fa-solid ';
        if (type === 'error') icon.className += 'fa-circle-xmark';
        else if (type === 'success') icon.className += 'fa-circle-check';
        else icon.className += 'fa-circle-info';

        toast.classList.remove('hidden');
        toast.style.animation = 'none';
        toast.offsetHeight; // Reflow
        toast.style.animation = 'toastEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';

        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 3500);
    }

    // --- SCREEN TRANSITIONS ---
    function switchScreen(targetId) {
        playSound('click');
        Object.keys(screens).forEach(id => {
            if (id === targetId) {
                screens[id].classList.remove('hidden');
                screens[id].classList.add('active');
            } else {
                screens[id].classList.remove('active');
                screens[id].classList.add('hidden');
            }
        });
        currentScreen = targetId;

        if (targetId === 'screen-game' && !scene) {
            // Lazy load/init 3D when game screen is first shown
            initThreeD();
        }
    }

    // --- LOAD JSON CONFIGURATION ---
    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            gameData = data;
            initApp();
        })
        .catch(err => {
            console.error('Failed to load JSON configuration:', err);
            showToast('Error loading game configuration!', 'error');
        });

    function initApp() {
        // Init Canvases
        initBgCanvas();
        initFxCanvas();

        // Populate Metadata
        appVersion.textContent = `v${gameData.gameMetadata.version}`;
        authorCredits.textContent = gameData.gameMetadata.author;
        authorSource.textContent = gameData.gameMetadata.source;
        passwordPrompt.textContent = gameData.security.prompts.enter;
        attemptsRemaining = gameData.security.maxAttempts;
        attemptsCount.textContent = attemptsRemaining;
        continuePrompt.textContent = gameData.game.messages.continue;

        // Populate Menu
        menuTitle.textContent = gameData.menu.title;
        menuSubtitle.textContent = gameData.menu.subtitle;
        menuOptionsContainer.innerHTML = '';
        gameData.menu.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'menu-option-btn';
            btn.innerHTML = `<i class="fa-solid ${opt.icon}"></i> <span>${opt.label}</span>`;
            btn.addEventListener('click', () => handleMenuAction(opt.action));
            menuOptionsContainer.appendChild(btn);
        });

        // Populate AI Levels
        aiLevelTitle.textContent = gameData.game.aiLevels.title;
        aiLevelSubtitle.textContent = gameData.game.aiLevels.subtitle;
        aiLevelsContainer.innerHTML = '';
        gameData.game.aiLevels.levels.forEach(lvl => {
            const btn = document.createElement('button');
            btn.className = 'menu-option-btn';
            btn.innerHTML = `<i class="fa-solid ${lvl.icon}"></i> <div style="display: flex; flex-direction: column; text-align: left;"><strong>${lvl.name}</strong><span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 400;">${lvl.desc}</span></div>`;
            btn.addEventListener('click', () => selectAiLevel(lvl.id));
            aiLevelsContainer.appendChild(btn);
        });

        // Populate Themes
        themeSelect.innerHTML = '';
        gameData.themes.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = t.name;
            themeSelect.appendChild(option);
        });

        // Populate Guide
        guideTitle.textContent = gameData.guide.title;
        guideContentContainer.innerHTML = '';
        gameData.guide.sections.forEach(sec => {
            const div = document.createElement('div');
            div.className = 'guide-section';
            div.innerHTML = `<h3><i class="fa-solid fa-bookmark"></i> ${sec.heading}</h3><p>${sec.content}</p>`;
            
            // Add visual examples if specified
            if (sec.visual === 'win_examples') {
                const visContainer = document.createElement('div');
                visContainer.className = 'guide-visual';
                gameData.guide.examples.forEach(ex => {
                    const miniCard = document.createElement('div');
                    miniCard.className = 'mini-board-card';
                    let gridHtml = '<div class="mini-grid">';
                    ex.board.forEach(cell => {
                        const cellClass = cell === 'X' ? 'x' : (cell === 'O' ? 'o' : '');
                        gridHtml += `<div class="mini-cell ${cellClass}">${cell}</div>`;
                    });
                    gridHtml += '</div>';
                    miniCard.innerHTML = `<span class="mini-board-title">${ex.title}</span>${gridHtml}`;
                    visContainer.appendChild(miniCard);
                });
                div.appendChild(visContainer);
            }
            guideContentContainer.appendChild(div);
        });

        // Event Listeners
        setupEventListeners();
    }

    function setupEventListeners() {
        // Theme Selector
        themeSelect.addEventListener('change', (e) => {
            playSound('click');
            const theme = gameData.themes.find(t => t.id === e.target.value);
            if (theme) {
                document.documentElement.style.setProperty('--bg-gradient', theme.bg);
                document.documentElement.style.setProperty('--primary', theme.primary);
                document.documentElement.style.setProperty('--secondary', theme.secondary);
                document.documentElement.style.setProperty('--surface', theme.surface);
                showToast(`Theme changed to ${theme.name}`, 'success');
                // Sync with 3D board
                setTimeout(updateThreeDTheme, 50);
            }
        });

        // Audio Toggle
        btnAudio.addEventListener('click', () => {
            isAudioEnabled = !isAudioEnabled;
            btnAudio.innerHTML = isAudioEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
            if (isAudioEnabled) playSound('click');
            showToast(`Sound effects ${isAudioEnabled ? 'enabled' : 'disabled'}`, 'info');
        });

        // Password Form Submit
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (attemptsRemaining <= 0) return;

            const inputVal = passwordInput.value.trim();
            if (inputVal === gameData.security.password) {
                playSound('grant');
                passwordFeedback.textContent = gameData.security.prompts.granted;
                passwordFeedback.className = 'feedback-msg success';
                passwordInput.disabled = true;
                
                setTimeout(() => {
                    switchScreen('screen-menu');
                }, 1200);
            } else {
                playSound('deny');
                attemptsRemaining--;
                attemptsCount.textContent = attemptsRemaining;
                attemptsProgress.style.width = `${(attemptsRemaining / gameData.security.maxAttempts) * 100}%`;
                
                if (attemptsRemaining <= 0) {
                    attemptsProgress.style.background = 'var(--error)';
                    passwordFeedback.textContent = gameData.security.prompts.locked;
                    passwordFeedback.className = 'feedback-msg error';
                    passwordInput.disabled = true;
                    showToast('System Locked. Max attempts reached.', 'error');
                } else {
                    passwordFeedback.textContent = gameData.security.prompts.denied;
                    passwordFeedback.className = 'feedback-msg error';
                    passwordInput.value = '';
                    passwordInput.focus();
                    // Trigger reflow for shake animation
                    passwordFeedback.style.animation = 'none';
                    passwordFeedback.offsetHeight;
                    passwordFeedback.style.animation = 'shake 0.4s ease';
                }
            }
        });

        // Navigation Buttons
        btnGameBack.addEventListener('click', () => switchScreen('screen-menu'));
        btnAiBack.addEventListener('click', () => switchScreen('screen-menu'));
        btnGuideBack.addEventListener('click', () => switchScreen('screen-menu'));
        btnMenuReturn.addEventListener('click', () => switchScreen('screen-menu'));
        btnPlayAgain.addEventListener('click', () => startNewMatch());
        btnGameReset.addEventListener('click', () => startNewMatch());

        // Keyboard Controls (1-9) matching C++ Console input
        window.addEventListener('keydown', (e) => {
            if (currentScreen !== 'screen-game' || isGameOver || isAiThinking) return;

            const keyMap = {
                '1': 0, '2': 1, '3': 2,
                '4': 3, '5': 4, '6': 5,
                '7': 6, '8': 7, '9': 8,
                'Numpad1': 0, 'Numpad2': 1, 'Numpad3': 2,
                'Numpad4': 3, 'Numpad5': 4, 'Numpad6': 5,
                'Numpad7': 6, 'Numpad8': 7, 'Numpad9': 8
            };

            const cellIndex = keyMap[e.code] !== undefined ? keyMap[e.code] : keyMap[e.key];
            if (cellIndex !== undefined) {
                handleCellClick(cellIndex);
            }
        });
    }

    function handleMenuAction(action) {
        switch(action) {
            case 'game_pvp':
                gameMode = 'pvp';
                p2Name.textContent = gameData.game.players['2'].name;
                aiDifficultyBadge.classList.add('hidden');
                initGameScreen();
                break;
            case 'game_ai':
                switchScreen('screen-ai-level');
                break;
            case 'guide':
                switchScreen('screen-guide');
                break;
            case 'exit':
                showToast('Logging out of Sovereign OS...', 'info');
                setTimeout(() => {
                    switchScreen('screen-password');
                    passwordInput.disabled = false;
                    passwordInput.value = '';
                    attemptsRemaining = gameData.security.maxAttempts;
                    attemptsCount.textContent = attemptsRemaining;
                    attemptsProgress.style.width = '100%';
                    attemptsProgress.style.background = 'var(--success)';
                    passwordFeedback.textContent = '';
                }, 1500);
                break;
        }
    }

    function selectAiLevel(levelId) {
        aiDifficulty = levelId;
        gameMode = 'ai';
        const levelInfo = gameData.game.aiLevels.levels.find(l => l.id === levelId);
        aiDifficultyBadge.textContent = levelInfo ? levelInfo.name : levelId.toUpperCase();
        aiDifficultyBadge.classList.remove('hidden');
        p2Name.textContent = 'AI Sovereign';
        initGameScreen();
        showToast(`AI Level set to ${levelInfo.name}`, 'info');
    }

    // --- GAME MECHANICS ---
    function initGameScreen() {
        switchScreen('screen-game');
        scores = { '1': 0, '2': 0 };
        p1Score.textContent = '0';
        p2Score.textContent = '0';
        startNewMatch();
    }

    function startNewMatch() {
        playSound('click');
        boardState = Array(9).fill(null);
        isGameOver = false;
        isAiThinking = false;
        currentPlayer = '1';

        // Clear 3D symbols & beams
        clearThreeDGame();

        // Clear win line & status
        winLine.classList.add('hidden');
        winLine.style.width = '0';
        gameStatusPanel.classList.add('hidden');

        // Render Board
        gameBoard.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.index = i;
            cell.addEventListener('click', () => handleCellClick(i));
            gameBoard.appendChild(cell);
        }

        updateTurnDisplay();
    }

    function updateTurnDisplay() {
        const pInfo = gameData.game.players[currentPlayer];
        const name = currentPlayer === '2' && gameMode === 'ai' ? 'AI Sovereign' : pInfo.name;
        
        turnDisplay.textContent = gameData.game.messages.turn
            .replace('{player}', name);
        
        turnDisplay.style.color = pInfo.color;
        turnDisplay.style.textShadow = `0 0 15px ${pInfo.color}`;

        // Update active player badge
        const p1Badge = document.querySelector('.p1-badge');
        const p2Badge = document.querySelector('.p2-badge');
        if (currentPlayer === '1') {
            p1Badge.classList.add('active');
            p2Badge.classList.remove('active');
        } else {
            p2Badge.classList.add('active');
            p1Badge.classList.remove('active');
        }
    }

    function handleCellClick(index) {
        if (isGameOver || isAiThinking || boardState[index] !== null) {
            if (boardState[index] !== null && !isGameOver) {
                playSound('deny');
                showToast(gameData.game.messages.invalid, 'error');
            }
            return;
        }

        makeMove(index, currentPlayer);

        if (!isGameOver && gameMode === 'ai' && currentPlayer === '2') {
            isAiThinking = true;
            turnDisplay.textContent = 'AI Sovereign is thinking...';
            turnDisplay.style.color = 'var(--text-muted)';
            turnDisplay.style.textShadow = 'none';

            setTimeout(() => {
                makeAiMove();
            }, 400);
        }
    }

    function makeMove(index, player) {
        const pInfo = gameData.game.players[player];
        boardState[index] = pInfo.symbol;

        // 3D Update
        spawn3DSymbol(index, pInfo.symbol);

        // DOM Update
        const cell = document.querySelector(`.grid-cell[data-index="${index}"]`);
        if (cell) {
            cell.textContent = pInfo.symbol;
            cell.dataset.symbol = pInfo.symbol;
            cell.classList.add('occupied');
        }

        // Play Sound
        if (player === '1') playSound('placeX');
        else playSound('placeO');

        // Check Win / Draw
        const winCombo = checkWin(pInfo.symbol);
        if (winCombo) {
            handleWin(player, winCombo);
        } else if (boardState.every(c => c !== null)) {
            handleDraw();
        } else {
            // Switch Turn
            currentPlayer = currentPlayer === '1' ? '2' : '1';
            updateTurnDisplay();
            // Sync point light with current player color
            updateThreeDTheme();
        }
    }

    function checkWin(symbol) {
        for (const combo of gameData.game.winCombinations) {
            if (combo.every(idx => boardState[idx] === symbol)) {
                return combo;
            }
        }
        return null;
    }

    function handleWin(player, combo) {
        isGameOver = true;
        isAiThinking = false;
        playSound('win');
        triggerConfetti();

        // 3D win beam
        const pInfo = gameData.game.players[player];
        draw3DWinningBeam(combo, pInfo.symbol);

        // Highlight Winning Cells
        combo.forEach(idx => {
            const cell = document.querySelector(`.grid-cell[data-index="${idx}"]`);
            if (cell) cell.classList.add('win-pulse');
        });

        // Position Win Line
        drawWinningLine(combo);

        // Update Score
        scores[player]++;
        if (player === '1') p1Score.textContent = scores['1'];
        else p2Score.textContent = scores['2'];

        // Show Status Panel
        const name = player === '2' && gameMode === 'ai' ? 'AI Sovereign' : pInfo.name;
        statusTitle.textContent = gameData.game.messages.win
            .replace('{player}', name);
        
        statusTitle.style.color = pInfo.color;
        gameStatusPanel.classList.remove('hidden');
    }

    function handleDraw() {
        isGameOver = true;
        isAiThinking = false;
        playSound('draw');

        statusTitle.textContent = gameData.game.messages.draw;
        statusTitle.style.color = 'var(--text-main)';
        gameStatusPanel.classList.remove('hidden');
    }

    function drawWinningLine(combo) {
        winLine.classList.remove('hidden');
        const firstCell = document.querySelector(`.grid-cell[data-index="${combo[0]}"]`);
        const lastCell = document.querySelector(`.grid-cell[data-index="${combo[2]}"]`);
        
        const fRect = firstCell.getBoundingClientRect();
        const lRect = lastCell.getBoundingClientRect();
        const bRect = gameBoard.getBoundingClientRect();

        const x1 = fRect.left + fRect.width / 2 - bRect.left;
        const y1 = fRect.top + fRect.height / 2 - bRect.top;
        const x2 = lRect.left + lRect.width / 2 - bRect.left;
        const y2 = lRect.top + lRect.height / 2 - bRect.top;

        const length = Math.hypot(x2 - x1, y2 - y1);
        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

        winLine.style.width = `${length}px`;
        winLine.style.height = '8px';
        winLine.style.left = `${x1}px`;
        winLine.style.top = `${y1 - 4}px`;
        winLine.style.transform = `rotate(${angle}deg)`;
    }

    // --- AI LOGIC (EASY / MEDIUM / HARD PRO MINIMAX) ---
    function makeAiMove() {
        if (isGameOver) return;

        const aiSymbol = gameData.game.players['2'].symbol;
        const playerSymbol = gameData.game.players['1'].symbol;
        const availableMoves = boardState.map((val, idx) => val === null ? idx : null).filter(val => val !== null);

        if (availableMoves.length === 0) return;

        // 1. EASY: Purely Random
        if (aiDifficulty === 'easy') {
            const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
            isAiThinking = false;
            makeMove(randomMove, '2');
            return;
        }

        // 2. MEDIUM: Tactical Win/Block -> Center -> Random
        if (aiDifficulty === 'medium') {
            // Can AI Win in 1 move?
            const winMove = findImmediateMove(aiSymbol);
            if (winMove !== null) {
                isAiThinking = false;
                makeMove(winMove, '2');
                return;
            }

            // Can Player Win in 1 move? Block it.
            const blockMove = findImmediateMove(playerSymbol);
            if (blockMove !== null) {
                isAiThinking = false;
                makeMove(blockMove, '2');
                return;
            }

            // Take Center if free
            if (boardState[4] === null) {
                isAiThinking = false;
                makeMove(4, '2');
                return;
            }

            // Take random available move
            const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
            isAiThinking = false;
            makeMove(randomMove, '2');
            return;
        }

        // 3. HARD (PRO): Minimax Absolute Computation
        if (aiDifficulty === 'hard') {
            let bestScore = -Infinity;
            let bestMove = null;

            for (let i = 0; i < 9; i++) {
                if (boardState[i] === null) {
                    boardState[i] = aiSymbol;
                    let score = minimax(boardState, 0, false, aiSymbol, playerSymbol);
                    boardState[i] = null;
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = i;
                    }
                }
            }

            isAiThinking = false;
            if (bestMove !== null) {
                makeMove(bestMove, '2');
            } else {
                const randomMove = availableMoves[0];
                makeMove(randomMove, '2');
            }
            return;
        }
    }

    function findImmediateMove(symbol) {
        for (const combo of gameData.game.winCombinations) {
            const cells = combo.map(idx => boardState[idx]);
            const symbolCount = cells.filter(c => c === symbol).length;
            const nullCount = cells.filter(c => c === null).length;

            if (symbolCount === 2 && nullCount === 1) {
                return combo[cells.indexOf(null)];
            }
        }
        return null;
    }

    // Minimax Algorithm for Pro AI
    function minimax(board, depth, isMaximizing, aiSymbol, playerSymbol) {
        // Check terminal states
        if (checkWinForMinimax(board, aiSymbol)) return 10 - depth;
        if (checkWinForMinimax(board, playerSymbol)) return depth - 10;
        if (board.every(cell => cell !== null)) return 0; // Draw

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = aiSymbol;
                    let score = minimax(board, depth + 1, false, aiSymbol, playerSymbol);
                    board[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = playerSymbol;
                    let score = minimax(board, depth + 1, true, aiSymbol, playerSymbol);
                    board[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    function checkWinForMinimax(board, symbol) {
        for (const combo of gameData.game.winCombinations) {
            if (combo.every(idx => board[idx] === symbol)) {
                return true;
            }
        }
        return false;
    }

    // ==========================================
    // --- 3D SOVEREIGN RENDER ENGINE ---
    // ==========================================

    function initThreeD() {
        const container = document.getElementById('board-3d-container');
        if (!container) return;

        // Scene
        scene = new THREE.Scene();

        // Camera
        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(0, 7.5, 9);
        camera.lookAt(0, 0, 0);

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.bias = -0.001;
        scene.add(dirLight);

        // Point Light that changes color based on theme/turn
        const themeLight = new THREE.PointLight(0xffffff, 1.2, 15);
        themeLight.position.set(0, 3, 0);
        themeLight.name = "themeLight";
        scene.add(themeLight);

        // Generate Board
        create3DBoard();

        // Listeners for Raycasting & Mouse move
        container.addEventListener('mousemove', onMouseMove);
        container.addEventListener('click', onCanvasClick);
        container.addEventListener('mouseleave', onMouseLeave);

        // Resize Observer for robust resizing
        const resizeObserver = new ResizeObserver(() => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            if (width === 0 || height === 0) return;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        });
        resizeObserver.observe(container);

        // Sync colors with current theme
        updateThreeDTheme();

        // Start render loop
        animateThreeD();
    }

    function create3DBoard() {
        cellMeshes = [];

        const cellSize = 2.1;
        const cellThickness = 0.25;
        const spacing = 2.4;

        // Base Board (glowing dark platform below)
        const baseGeo = new THREE.BoxGeometry(cellSize * 3 + 0.8, 0.15, cellSize * 3 + 0.8);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x110924,
            roughness: 0.8,
            metalness: 0.2,
            transparent: true,
            opacity: 0.6
        });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = -0.15;
        baseMesh.receiveShadow = true;
        scene.add(baseMesh);

        // Glass Cells
        for (let i = 0; i < 9; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;

            const x = (col - 1) * spacing;
            const z = (row - 1) * spacing;

            const cellGeo = new THREE.BoxGeometry(cellSize, cellThickness, cellSize);
            
            // Physical glass material
            const cellMat = new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                roughness: 0.15,
                metalness: 0.1,
                transmission: 0.7,
                transparent: true,
                opacity: 0.35,
                clearcoat: 1.0,
                clearcoatRoughness: 0.1
            });

            const cellMesh = new THREE.Mesh(cellGeo, cellMat);
            cellMesh.position.set(x, 0, z);
            cellMesh.receiveShadow = true;
            cellMesh.castShadow = true;
            cellMesh.userData = { cellIndex: i, isHovered: false };
            scene.add(cellMesh);
            cellMeshes.push(cellMesh);

            // Subtle border outline for the cell
            const edges = new THREE.EdgesGeometry(cellGeo);
            const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
            const line = new THREE.LineSegments(edges, lineMat);
            cellMesh.add(line);
        }
    }

    function updateThreeDTheme() {
        if (!scene) return;

        // Get colors from CSS Variables
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "#ff007f";
        const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || "#00f0ff";

        // Update Theme PointLight
        const themeLight = scene.getObjectByName("themeLight");
        if (themeLight) {
            themeLight.color.set(currentPlayer === '1' ? primaryColor : secondaryColor);
        }

        // Update all symbol meshes
        for (let i = 0; i < 9; i++) {
            const mesh = symbolMeshes[i];
            if (mesh) {
                const symbol = boardState[i];
                const activeColor = (symbol === 'X') ? primaryColor : secondaryColor;
                mesh.traverse(child => {
                    if (child.isMesh) {
                        child.material.color.set(activeColor);
                        child.material.emissive.set(activeColor);
                    }
                });
            }
        }

        // Update win beam if active
        if (winBeamMesh) {
            const winnerSymbol = winBeamMesh.userData.winnerSymbol;
            const beamColor = (winnerSymbol === 'X') ? primaryColor : secondaryColor;
            winBeamMesh.material.color.set(beamColor);
            winBeamMesh.material.emissive.set(beamColor);
        }

        // Update cell outline line materials
        cellMeshes.forEach(cellMesh => {
            const line = cellMesh.children[0];
            if (line && line.material) {
                line.material.color.set(secondaryColor);
                line.material.opacity = 0.25;
            }
        });
    }

    function onMouseMove(e) {
        const container = document.getElementById('board-3d-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        
        // Normalize mouse coordinates for Raycasting
        mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

        // Mouse coordinates for camera tilt parallax
        mouseX = (e.clientX - rect.left - container.clientWidth / 2) / (container.clientWidth / 2);
        mouseY = (e.clientY - rect.top - container.clientHeight / 2) / (container.clientHeight / 2);
    }

    function onCanvasClick() {
        if (hoveredCellIndex !== null) {
            handleCellClick(hoveredCellIndex);
        }
    }

    function onMouseLeave() {
        resetHover();
        mouseX = 0;
        mouseY = 0;
    }

    function checkRaycast() {
        if (!scene || !camera || isGameOver || isAiThinking) {
            resetHover();
            return;
        }

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(cellMeshes);

        if (intersects.length > 0) {
            const hitCell = intersects[0].object;
            const index = hitCell.userData.cellIndex;

            if (hoveredCellIndex !== index) {
                resetHover();
                hoveredCellIndex = index;
                
                // Highlight if not occupied
                if (boardState[index] === null) {
                    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "#ff007f";
                    const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || "#00f0ff";
                    const activeColor = (currentPlayer === '1') ? primaryColor : secondaryColor;

                    hitCell.material.emissive.set(activeColor);
                    hitCell.material.emissiveIntensity = 0.35;
                    hitCell.material.opacity = 0.7;
                    hitCell.scale.set(1.03, 1.1, 1.03);
                } else {
                    // Flash red to show invalid cell
                    hitCell.material.emissive.set(0xff0000);
                    hitCell.material.emissiveIntensity = 0.2;
                }
            }
        } else {
            resetHover();
        }
    }

    function resetHover() {
        if (hoveredCellIndex !== null) {
            const cellMesh = cellMeshes[hoveredCellIndex];
            if (cellMesh) {
                cellMesh.material.emissive.set(0x000000);
                cellMesh.material.emissiveIntensity = 0;
                cellMesh.material.opacity = 0.35;
                cellMesh.scale.set(1, 1, 1);
            }
            hoveredCellIndex = null;
        }
    }

    function spawn3DSymbol(index, symbol) {
        if (!scene) return;

        // Clear existing mesh at this index if any
        if (symbolMeshes[index]) {
            scene.remove(symbolMeshes[index]);
            symbolMeshes[index] = null;
        }

        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "#ff007f";
        const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || "#00f0ff";
        const activeColor = (symbol === 'X') ? primaryColor : secondaryColor;

        const cellMesh = cellMeshes[index];
        if (!cellMesh) return;

        const x = cellMesh.position.x;
        const z = cellMesh.position.z;

        const symbolGroup = new THREE.Group();

        const symMaterial = new THREE.MeshStandardMaterial({
            color: activeColor,
            emissive: activeColor,
            emissiveIntensity: 0.6,
            roughness: 0.1,
            metalness: 0.5
        });

        if (symbol === 'X') {
            // Neon cross
            const capGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.6, 12);
            
            const limb1 = new THREE.Mesh(capGeo, symMaterial);
            limb1.rotation.z = Math.PI / 4;
            limb1.castShadow = true;
            symbolGroup.add(limb1);

            const limb2 = new THREE.Mesh(capGeo, symMaterial);
            limb2.rotation.z = -Math.PI / 4;
            limb2.castShadow = true;
            symbolGroup.add(limb2);

            symbolGroup.rotation.x = Math.PI / 6;
        } else {
            // Neon torus
            const torusGeo = new THREE.TorusGeometry(0.6, 0.18, 16, 80);
            const torus = new THREE.Mesh(torusGeo, symMaterial);
            torus.castShadow = true;
            symbolGroup.add(torus);

            symbolGroup.rotation.x = Math.PI / 2.5;
        }

        // Bounce drop settings
        symbolGroup.position.set(x, 6, z);
        symbolGroup.scale.set(0.01, 0.01, 0.01);

        scene.add(symbolGroup);
        symbolMeshes[index] = symbolGroup;

        symbolGroup.userData = {
            targetY: 0.6,
            velocityY: 0,
            gravity: -0.015,
            bounce: 0.6,
            targetScale: 1.0,
            rotSpeed: (Math.random() - 0.5) * 0.03
        };
    }

    function draw3DWinningBeam(combo, symbol) {
        if (!scene) return;

        if (winBeamMesh) {
            scene.remove(winBeamMesh);
            winBeamMesh = null;
        }

        const startCell = cellMeshes[combo[0]];
        const endCell = cellMeshes[combo[2]];
        if (!startCell || !endCell) return;

        const p1 = startCell.position;
        const p2 = endCell.position;

        const distance = p1.distanceTo(p2);
        const beamGeo = new THREE.CylinderGeometry(0.1, 0.1, distance, 12);
        
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "#ff007f";
        const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || "#00f0ff";
        const beamColor = (symbol === 'X') ? primaryColor : secondaryColor;

        const beamMat = new THREE.MeshStandardMaterial({
            color: beamColor,
            emissive: beamColor,
            emissiveIntensity: 1.5,
            transparent: true,
            opacity: 0.95
        });

        const beam = new THREE.Mesh(beamGeo, beamMat);
        
        const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        beam.position.copy(midPoint);
        beam.position.y = 0.6;

        const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
        const alignAxis = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(alignAxis, direction);
        beam.setRotationFromQuaternion(quaternion);

        beam.scale.set(1, 0.01, 1);
        beam.userData = { targetScaleY: 1.0, winnerSymbol: symbol };

        scene.add(beam);
        winBeamMesh = beam;

        // Make winning pieces spin and scale
        combo.forEach(idx => {
            const sym = symbolMeshes[idx];
            if (sym && sym.userData) {
                sym.userData.rotSpeed = 0.15;
                sym.userData.targetScale = 1.35;
            }
        });
    }

    function clearThreeDGame() {
        if (!scene) return;

        for (let i = 0; i < 9; i++) {
            if (symbolMeshes[i]) {
                scene.remove(symbolMeshes[i]);
                symbolMeshes[i] = null;
            }
        }

        if (winBeamMesh) {
            scene.remove(winBeamMesh);
            winBeamMesh = null;
        }

        updateThreeDTheme();
    }

    function animateThreeD() {
        requestAnimationFrame(animateThreeD);

        if (!scene) return;

        // Camera tilt effect
        const targetCamX = mouseX * 2.8;
        const targetCamY = 7.5 + mouseY * -1.8;
        camera.position.x += (targetCamX - camera.position.x) * 0.06;
        camera.position.y += (targetCamY - camera.position.y) * 0.06;
        camera.lookAt(0, 0, 0);

        checkRaycast();

        // Update meshes
        for (let i = 0; i < 9; i++) {
            const symbol = symbolMeshes[i];
            if (symbol && symbol.userData) {
                const ud = symbol.userData;

                if (symbol.scale.x < ud.targetScale) {
                    const nextScale = symbol.scale.x + (ud.targetScale - symbol.scale.x) * 0.15;
                    symbol.scale.setScalar(nextScale);
                }

                if (symbol.position.y > ud.targetY || Math.abs(ud.velocityY) > 0.001) {
                    ud.velocityY += ud.gravity;
                    symbol.position.y += ud.velocityY;

                    if (symbol.position.y <= ud.targetY) {
                        symbol.position.y = ud.targetY;
                        ud.velocityY = -ud.velocityY * ud.bounce;
                        
                        if (Math.abs(ud.velocityY) < 0.02) {
                            ud.velocityY = 0;
                        }
                    }
                }

                symbol.rotation.y += ud.rotSpeed;
            }
        }

        // Winning beam scale up animation
        if (winBeamMesh && winBeamMesh.scale.y < winBeamMesh.userData.targetScaleY) {
            winBeamMesh.scale.y += (winBeamMesh.userData.targetScaleY - winBeamMesh.scale.y) * 0.12;
        }

        // Pulsate PointLight
        const themeLight = scene.getObjectByName("themeLight");
        if (themeLight) {
            themeLight.intensity = 1.2 + Math.sin(Date.now() * 0.003) * 0.15;
        }

        renderer.render(scene, camera);
    }
});
