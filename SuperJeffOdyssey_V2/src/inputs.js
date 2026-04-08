// central input handler: populates game.keys and provides touch UI
export function initInput(game) {
    game.keys = game.keys || {};

    function resetAllInputState() {
        Object.keys(game.keys).forEach((key) => {
            game.keys[key] = false;
        });
        game.spaceWasPressed = false;
        game.shiftWasPressed = false;
        game.qWasPressed = false;
        game.eWasPressed = false;
        game.fWasPressed = false;
        game.kWasPressed = false;
        game.rWasPressed = false;
        game.pWasPressed = false;
        game.bWasPressed = false;
    }

    // helper to set a key (lowercase and uppercase consistency)
    function setKey(key, value) {
        if (key == null) return;
        game.keys[key] = value;
        game.keys[key.toUpperCase()] = value;
    }

    function setKeyboardStateFromEvent(e, value) {
        if (!e) return;

        if (e.key != null) game.keys[e.key] = value;
        if (e.code != null) game.keys[e.code] = value;

        if (e.code && e.code.startsWith('Key') && e.code.length === 4) {
            const letter = e.code.slice(3);
            game.keys[letter.toLowerCase()] = value;
            game.keys[letter.toUpperCase()] = value;
        }

        if (e.code === 'Space') {
            game.keys[' '] = value;
            game.keys['Space'] = value;
        }

        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.key === 'Shift') {
            game.keys['Shift'] = value;
            game.keys['ShiftLeft'] = value;
            game.keys['ShiftRight'] = value;
        }
    }

    // keyboard listeners
    window.addEventListener('keydown', (e) => {
        // prevent default for game-related keys so page doesn't scroll
        const ignore = ['w','a','s','d','W','A','S','D',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
            'Shift','q','Q','e','E','f','F','k','K','p','P','b','B'];
        if (ignore.includes(e.key) || e.code.startsWith('Key')) {
            e.preventDefault();
        }
        setKeyboardStateFromEvent(e, true);
    });

    window.addEventListener('keyup', (e) => {
        setKeyboardStateFromEvent(e, false);
    });

    window.addEventListener('blur', resetAllInputState);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            resetAllInputState();
        }
    });

    // pointer lock & mouse controls
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.setAttribute('tabindex', '0');
        canvas.focus();

        // mouse wheel zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            game.camera.zoom += e.deltaY * -0.001;
            game.camera.zoom = Math.max(0.5, Math.min(3.0, game.camera.zoom));
        });

        // desktop mouse move (pointer lock)
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === canvas) {
                game.camera.yaw -= e.movementX * 0.003;
            }
        });

        canvas.addEventListener('click', (e) => {
            canvas.requestPointerLock();
            canvas.focus();
        });

        canvas.addEventListener('blur', resetAllInputState);
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement !== canvas) {
                resetAllInputState();
            }
        });

        // mobile touch drag for camera
        let lastTouchX = null;
        canvas.addEventListener('touchstart', e => {
            if (e.touches.length === 1) {
                lastTouchX = e.touches[0].clientX;
            }
        });
        canvas.addEventListener('touchmove', e => {
            if (e.touches.length === 1 && lastTouchX !== null) {
                const dx = e.touches[0].clientX - lastTouchX;
                game.camera.yaw -= dx * 0.003;
                lastTouchX = e.touches[0].clientX;
            }
            e.preventDefault();
        }, {passive: false});
        canvas.addEventListener('touchend', () => { lastTouchX = null; });
    }

    // only build touch UI if device actually supports touch
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    if (isTouch) {
        // joystick container
        const joySize = 120;
        const joy = document.createElement('div');
        joy.id = 'joystick';
        joy.style.position = 'absolute';
        joy.style.bottom = '20px';
        joy.style.left = '20px';
        joy.style.width = joySize + 'px';
        joy.style.height = joySize + 'px';
        joy.style.background = 'rgba(0,0,0,0.2)';
        joy.style.borderRadius = '50%';
        joy.style.touchAction = 'none';
        joy.style.zIndex = '150';

        const knob = document.createElement('div');
        knob.id = 'joy-knob';
        const knobSize = 48;
        knob.style.position = 'absolute';
        knob.style.width = knobSize + 'px';
        knob.style.height = knobSize + 'px';
        knob.style.background = 'rgba(255,255,255,0.6)';
        knob.style.borderRadius = '50%';
        knob.style.top = (joySize/2 - knobSize/2) + 'px';
        knob.style.left = (joySize/2 - knobSize/2) + 'px';
        joy.appendChild(knob);
        document.body.appendChild(joy);

        let joyActive = false;
        let joyCenter = { x: 0, y: 0 };
        function updateJoy(touch) {
            const rect = joy.getBoundingClientRect();
            joyCenter.x = rect.left + rect.width/2;
            joyCenter.y = rect.top + rect.height/2;
            const dx = touch.clientX - joyCenter.x;
            const dy = touch.clientY - joyCenter.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const max = joySize/2;
            const nx = dx / max;
            const ny = dy / max;
            const clampedX = Math.max(-1, Math.min(1, nx));
            const clampedY = Math.max(-1, Math.min(1, ny));
            // move knob
            const knobX = clampedX * (max - knobSize/2);
            const knobY = clampedY * (max - knobSize/2);
            knob.style.transform = `translate(${knobX}px, ${knobY}px)`;

            // set direction keys
            setKey('w', clampedY < -0.3);
            setKey('s', clampedY > 0.3);
            setKey('a', clampedX < -0.3);
            setKey('d', clampedX > 0.3);
        }
        function resetJoy() {
            knob.style.transform = '';
            setKey('w', false);
            setKey('s', false);
            setKey('a', false);
            setKey('d', false);
        }
        joy.addEventListener('touchstart', e => {
            joyActive = true;
            updateJoy(e.touches[0]);
            e.preventDefault();
        });
        joy.addEventListener('touchmove', e => {
            if (joyActive) updateJoy(e.touches[0]);
            e.preventDefault();
        }, {passive:false});
        joy.addEventListener('touchend', e => {
            joyActive = false;
            resetJoy();
            e.preventDefault();
        });

        // action buttons
        const actions = document.createElement('div');
        actions.id = 'touch-actions';
        actions.style.position = 'absolute';
        actions.style.bottom = '20px';
        actions.style.right = '20px';
        actions.style.zIndex = '150';
        actions.style.display = 'flex';
        actions.style.flexWrap = 'wrap';
        actions.style.width = '180px';
        actions.style.userSelect = 'none';
        actions.style.touchAction = 'none';

        const addBtn = (text, key) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.style.width = '60px';
            btn.style.height = '60px';
            btn.style.margin = '2px';
            btn.style.fontSize = '1.2em';
            btn.style.opacity = '0.6';
            btn.style.background = 'rgba(0,0,0,0.4)';
            btn.style.color = '#fff';
            btn.style.border = 'none';
            btn.style.borderRadius = '8px';
            btn.addEventListener('touchstart', e => { e.preventDefault(); setKey(key, true); });
            btn.addEventListener('touchend', e => { e.preventDefault(); setKey(key, false); });
            actions.appendChild(btn);
        };
        addBtn('JUMP', ' ');
        addBtn('ATTK', 'q');
        addBtn('ROLL', 'e');
        addBtn('HAIR', 'f');
        document.body.appendChild(actions);
    }
}

export default { initInput };
