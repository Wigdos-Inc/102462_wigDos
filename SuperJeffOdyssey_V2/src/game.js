import { game, kingdomConfigs, engine, vector } from './globals.js';
import { drawJeff, player, updatePlayerMovementAndCollision } from './player.js';
import { drawStructures } from './structures.js';
import { initInput } from './inputs.js';
import { loadKingdom, enterPyramid, exitPyramid } from './levelgeneration.js';
import { showMessage, updateHUD, updateBossHealthUI, togglePause, showCredits } from './ui.js';
import { MiniBoss } from './characters.js';
import { playEffect, stopAllEffects, beginbackgroundmusic, musicInit, getKingdomtrack, playTrack, getmusicfiles, getAudio } from './audio.js';

// ReJeffAninated Studios
// Jarlo & Jauigi
// Moonshine
// The Fierceble Nuts Kasew, Wilnut, Almun

(function() {
    'use strict';

    // initialize input handling (keyboard + touch)
    initInput(game);

    // RTX mode toggle
    game.rtxMode = false;

    musicInit();

    // total moons across all kingdom configs (used to trigger credits)
    game.overallMoons = Object.values(kingdomConfigs).reduce((sum, k) => sum + k.moons, 0);
    const REQUIRED_KINGDOMS_FOR_BOSS = ['cap', 'cascade', 'sand'];
    const MINI_BOSS_KINGDOMS = ['cap', 'cascade', 'sand'];
    const MINI_BOSS_THEME_BY_KINGDOM = {
        cap: 'mini_boss',
        cascade: 'mini_boss',
        sand: 'mini_boss'
    };
    const POWER_MOON_SFX = 'sfx/p_sfx_8.mp3';
    const GAME_OVER_REDIRECT_PATH = '../../index.html';
    const GAME_OVER_DURATION = 10.0;
    const GAME_OVER_LAND_TIME = 6.2;
    const GAME_OVER_MUSIC_TRACK = 'Fierceble Nuts.mp3';
    const GAME_OVER_LAUGH_SFX = 'sfx/penut_sfx_1.mp3';
    const PEANUT_HIT_SFX = ['sfx/penut_sfx_1.mp3', 'sfx/penut_sfx_2.mp3'];
    let peanutHitSfxIndex = 0;

    function isSwDebugActive() {
        const hudDebug = document.getElementById('hud_debug');
        if (hudDebug) {
            return window.getComputedStyle(hudDebug).display !== 'none';
        }

        const legacyHud = document.getElementById('hud');
        if (!legacyHud) return false;
        return window.getComputedStyle(legacyHud).display !== 'none';
    }

    function playPeanutHitSfx() {
        const sfx = PEANUT_HIT_SFX[peanutHitSfxIndex % PEANUT_HIT_SFX.length];
        peanutHitSfxIndex++;
        playEffect(sfx, 0.55);
    }

    function stopGameOverFallLoop() {
        if (!game._gameOverFallLoopSfx) return;
        try {
            game._gameOverFallLoopSfx.pause();
            game._gameOverFallLoopSfx.currentTime = 0;
            game._gameOverFallLoopSfx.loop = false;
        } catch (_) {
            // Ignore audio teardown errors.
        }
        game._gameOverFallLoopSfx = null;
    }

    function stopGameOverMusicLoop() {
        if (!game._gameOverMusicSfx) return;
        try {
            game._gameOverMusicSfx.pause();
            game._gameOverMusicSfx.currentTime = 0;
            game._gameOverMusicSfx.loop = false;
        } catch (_) {
            // Ignore audio teardown errors.
        }
        game._gameOverMusicSfx = null;
    }

    function getGameOverJeffY(t) {
        const clamped = Math.max(0, t);
        const fallProgress = Math.min(1, clamped / GAME_OVER_LAND_TIME);
        const eased = 1 - Math.pow(1 - fallProgress, 2);
        const baseY = 9.5 - eased * 13.0;
        if (clamped < GAME_OVER_LAND_TIME) return baseY;

        const splashT = clamped - GAME_OVER_LAND_TIME;
        const bounce = Math.sin(splashT * 13) * 0.32 * Math.exp(-splashT * 2.0);
        return -3.5 + bounce;
    }

    function spawnGameOverOverlay() {
        if (game.gameOverOverlayShown) return;
        game.gameOverOverlayShown = true;

        const existing = document.getElementById('game-over-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'game-over-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.pointerEvents = 'auto';
        overlay.style.background = 'rgba(0, 0, 0, 0.28)';
        overlay.style.zIndex = '220';
        overlay.innerHTML = '<div id="game-over-text" style="font-size:4.2rem;color:#ffd92c;text-shadow:0 0 12px #000, 0 0 24px #000;letter-spacing:0.08em;transform:rotate(-960deg) scale(0.08);transform-origin:center;">GAME OVER</div><div id="game-over-sub" style="margin-top:0.9rem;font-size:1.2rem;color:#ffd99a;text-shadow:0 0 8px #000;opacity:0;">Peanutface: HAH-HAH-HAH!</div><button id="game-over-menu-btn" style="display:none;opacity:0;margin-top:1.4rem;padding:0.7rem 1.4rem;border:4px solid #000;border-radius:16px;background:#ffd92c;color:#111;font-weight:700;cursor:pointer;box-shadow:4px 4px 0 #000;">Go Back to Main Menu</button>';
        document.body.appendChild(overlay);

        const menuBtn = document.getElementById('game-over-menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                stopGameOverFallLoop();
                stopGameOverMusicLoop();
                window.location.href = GAME_OVER_REDIRECT_PATH;
            });
        }
    }

    function updateGameOverOverlayAnimation() {
        const text = document.getElementById('game-over-text');
        if (!text) return;

        const sub = document.getElementById('game-over-sub');
        const overlay = document.getElementById('game-over-overlay');
        const menuBtn = document.getElementById('game-over-menu-btn');
        const localT = Math.max(0, (game.gameOverTimer || 0) - GAME_OVER_LAND_TIME);
        const spinDuration = 2.2;
        const p = Math.min(1, localT / spinDuration);
        const eased = 1 - Math.pow(1 - p, 3);
        const spinDeg = (1 - p) * 960;
        const scale = 0.08 + (eased * 1.95);

        if (p < 1) {
            const hue = (((localT * 260) % 360) + 360) % 360;
            text.style.color = `hsl(${hue} 95% 58%)`;
        } else {
            text.style.color = '#ff2a2a';
        }

        text.style.transform = `rotate(${spinDeg}deg) scale(${scale})`;
        text.style.letterSpacing = `${0.08 + eased * 0.08}em`;

        if (sub) {
            const subP = Math.max(0, Math.min(1, (localT - 0.6) / 0.9));
            sub.style.opacity = `${subP}`;
        }

        if (overlay) {
            overlay.style.background = `rgba(0, 0, 0, ${0.28 + eased * 0.35})`;
        }

        if (menuBtn) {
            const doneT = Math.max(0, (game.gameOverTimer || 0) - GAME_OVER_DURATION);
            const appear = Math.min(1, doneT / 0.8);
            if (appear > 0) {
                menuBtn.style.display = 'inline-block';
                menuBtn.style.opacity = `${appear}`;
                menuBtn.style.transform = `scale(${0.9 + appear * 0.1})`;
            }
        }
    }

    function startGameOverCutscene() {
        if (game.gameOverActive) return;

        stopGameOverFallLoop();
        stopGameOverMusicLoop();

        // Silence gameplay audio so only cutscene audio remains.
        stopAllEffects();
        const bgAudio = getAudio();
        if (bgAudio) {
            try {
                bgAudio.pause();
            } catch (_) {
                // Ignore background audio pause errors.
            }
        }

        game.gameOverActive = true;
        game.gameOverTimer = 0;
        game.gameOverOverlayShown = false;
        game.gameOverRedirectDone = false;
        game.playerInvuln = 99;
        game._nextGameOverLaugh = 0.9;
        game._gameOverLanded = false;

        player.vel = vector.create(0, 0, 0);
        player.hairThrown = false;
        player.hairPos = null;
        player.hairVel = null;
        player.hairReturn = false;

        const loopFx = playEffect('sfx/p_sfx_2.mp3', 0);
        if (loopFx) {
            loopFx.loop = true;
            loopFx.play().catch(() => {});
        }
        game._gameOverFallLoopSfx = loopFx || null;

        const musicFx = playEffect(GAME_OVER_MUSIC_TRACK, 0);
        if (musicFx) {
            musicFx.loop = true;
            musicFx.volume = Math.min(1, musicFx.volume * 0.8);
            musicFx.play().catch(() => {});
        }
        game._gameOverMusicSfx = musicFx || null;

        showMessage('Jeff is out of health!', '#FF3333');
        playEffect('sfx/p_sfx_9.mp3', 0.7);
        updateHUD(game, kingdomConfigs, player);
    }

    function applyPlayerDamage(amount = 1, hitPos = null, message = 'Ouch!') {
        if (game.gameOverActive) return;
        if ((game.playerInvuln || 0) > 0) return;

        const maxHp = Math.max(1, Number(game.playerMaxHealth) || 3);
        const current = Number(game.playerHealth);
        game.playerHealth = Math.max(0, (Number.isFinite(current) ? current : maxHp) - amount);
        game.playerInvuln = 1.0;

        if (hitPos) {
            const away = vector.normalize(vector.sub(player.pos, hitPos));
            player.vel.x += away.x * 9;
            player.vel.z += away.z * 9;
            player.vel.y = Math.max(player.vel.y, 6.5);
        }

        if (game.playerHealth <= 0) {
            startGameOverCutscene();
        } else {
            showMessage(`${message} HP ${game.playerHealth}/${maxHp}`, '#FF6A4A');
            playEffect('sfx/p_sfx_7.mp3', 0.4);
            updateHUD(game, kingdomConfigs, player);
        }
    }

    function updateGameOverCutscene(dt) {
        if (!game.gameOverActive) return;

        game.gameOverTimer += dt;

        if (!game._gameOverLanded && game.gameOverTimer >= GAME_OVER_LAND_TIME) {
            game._gameOverLanded = true;
            stopGameOverFallLoop();
            playEffect('sfx/p_sfx_4.mp3', 0.55);
        }

        game._nextGameOverLaugh -= dt;
        if (game._nextGameOverLaugh <= 0) {
            playEffect(GAME_OVER_LAUGH_SFX, 0.5);
            game._nextGameOverLaugh = game._gameOverLanded ? 0.48 : 1.05;
        }

        if (game.gameOverTimer >= GAME_OVER_LAND_TIME) {
            spawnGameOverOverlay();
            updateGameOverOverlayAnimation();
        }

        if (game.gameOverTimer > GAME_OVER_DURATION && !game.gameOverRedirectDone) {
            game.gameOverRedirectDone = true;
            showMessage('Choose "Go Back to Main Menu" when ready.', '#FFD700');
        }
    }

    function drawGameOverCutscene() {
        const t = game.gameOverTimer || 0;
        const jeffY = getGameOverJeffY(t);

        let cam;
        let target;
        if (t < GAME_OVER_LAND_TIME) {
            cam = {
                x: 7.2 + Math.sin(t * 1.2) * 2.8,
                y: jeffY + 4.2 + Math.sin(t * 2.1) * 0.5,
                z: 11.5 + Math.cos(t * 1.0) * 2.2
            };
            target = vector.create(0, jeffY - 0.8, 0);
        } else {
            const danceT = t - GAME_OVER_LAND_TIME;
            cam = {
                x: Math.sin(danceT * 0.9) * 10.5,
                y: 4.8 + Math.sin(danceT * 1.7) * 1.1,
                z: 14.6 + Math.cos(danceT * 0.9) * 3.9
            };
            target = vector.create(0, -2.8, -2.0);
        }
        engine.engineUpdate(cam, target);

        // Dark floor and peanut vat.
        engine.drawCube(0, -6.5, 0, 40, 1.1, 40, {x: 0.08, y: 0.08, z: 0.1});
        engine.drawCylinder(0, -3.8, 0, 6.8, 2.3, {x: 0.2, y: 0.16, z: 0.14});
        engine.drawCylinder(0, -2.45, 0, 7.3, 0.45, {x: 0.28, y: 0.22, z: 0.18});

        for (let i = 0; i < 34; i++) {
            const a = (i / 34) * Math.PI * 2 + t * 0.25;
            const ring = 2 + (i % 5) * 0.68;
            const px = Math.cos(a) * ring;
            const pz = Math.sin(a) * ring;
            const py = -3.2 + Math.sin(t * 3.3 + i) * 0.16;
            const r = 0.38 + (i % 3) * 0.05;
            engine.drawSphere(px, py, pz, r, {x: 0.72, y: 0.53, z: 0.28});
        }

        // Peanutface wacky insane dance in the background.
        const dance = t * 6.8;
        const bx = Math.sin(dance * 0.9) * 3.1;
        const by = 2.95 + Math.sin(dance * 2.7) * 0.75;
        const bz = -8.2 + Math.cos(dance * 0.85) * 1.2;
        const handSwing = Math.sin(dance * 3.9) * 1.2;
        const headTilt = Math.sin(dance * 5.0) * 0.35;
        const hop = Math.abs(Math.sin(dance * 2.5)) * 0.42;

        engine.drawCylinder(bx, by, bz, 2.1, 2.4, {x: 0.66, y: 0.42, z: 0.2});
        engine.drawCylinder(bx, by + 1.7 + hop, bz + headTilt, 1.45, 1.0, {x: 0.2, y: 0.2, z: 0.24});
        engine.drawSphere(bx - 0.6, by + 0.42 + hop, bz + 1.74 + headTilt, 0.29, {x: 0.95, y: 0.95, z: 0.95});
        engine.drawSphere(bx + 0.6, by + 0.42 + hop, bz + 1.74 + headTilt, 0.29, {x: 0.95, y: 0.95, z: 0.95});
        engine.drawSphere(bx - 0.58, by + 0.42 + hop, bz + 1.94 + headTilt, 0.12, {x: 0.09, y: 0.09, z: 0.09});
        engine.drawSphere(bx + 0.58, by + 0.42 + hop, bz + 1.94 + headTilt, 0.12, {x: 0.09, y: 0.09, z: 0.09});
        const mouthH = 0.22 + Math.abs(Math.sin(dance * 3.8)) * 0.42;
        engine.drawCube(bx, by - 0.3 + hop, bz + 1.95 + headTilt, 1.25, mouthH, 0.18, {x: 0.95, y: 0.95, z: 0.9});
        engine.drawCylinder(bx - 0.72, by - 0.08 + hop, bz + 1.87 + headTilt, 0.26, 1.2, {x: 0.34, y: 0.19, z: 0.1});
        engine.drawCylinder(bx + 0.72, by - 0.08 + hop, bz + 1.87 + headTilt, 0.26, 1.2, {x: 0.34, y: 0.19, z: 0.1});

        // Flailing dancing arms.
        engine.drawCylinder(bx - 2.25 - handSwing * 0.6, by + 0.8 + hop, bz + 0.2, 0.28, 1.7, {x: 0.48, y: 0.34, z: 0.2});
        engine.drawCylinder(bx + 2.25 + handSwing * 0.6, by + 0.8 + hop, bz + 0.2, 0.28, 1.7, {x: 0.48, y: 0.34, z: 0.2});
        engine.drawSphere(bx - 3.0 - handSwing * 0.65, by + 0.6 + hop, bz + 0.35, 0.32, {x: 0.72, y: 0.72, z: 0.74});
        engine.drawSphere(bx + 3.0 + handSwing * 0.65, by + 0.6 + hop, bz + 0.35, 0.32, {x: 0.72, y: 0.72, z: 0.74});

        // Jeff falling into the vat.
        const jy = jeffY;

        const oldPos = vector.create(player.pos.x, player.pos.y, player.pos.z);
        const oldVel = vector.create(player.vel.x, player.vel.y, player.vel.z);
        const oldState = player.state;
        const oldRot = player.rotation;
        const oldOnGround = player.onGround;

        player.pos.x = 0;
        player.pos.y = jy;
        player.pos.z = 0;
        player.vel.x = 0;
        player.vel.y = -6;
        player.vel.z = 0;
        player.state = 'spinjump';
        player.rotation = t * 8;
        player.onGround = false;
        drawJeff(player);

        player.pos = oldPos;
        player.vel = oldVel;
        player.state = oldState;
        player.rotation = oldRot;
        player.onGround = oldOnGround;
    }

    function updateHubNpcs(dt) {
        if (game.currentKingdom !== 'hub' || !Array.isArray(game.structures)) return;

        for (let i = 0; i < game.structures.length; i++) {
            const s = game.structures[i];
            if (!s || s.type !== 'npc') continue;

            if (!s._npcInit) {
                s._npcInit = true;
                s._npcBaseX = Number.isFinite(s.x) ? s.x : 0;
                s._npcBaseZ = Number.isFinite(s.z) ? s.z : 0;
                s._npcWalkTime = Math.random() * Math.PI * 2;
                s._npcWalkSpeed = 0.55 + (Math.random() * 0.35);
                s._npcWalkRadius = Number.isFinite(s.walkRadius) ? s.walkRadius : 2.4;
                s._npcWalkEllipse = Number.isFinite(s.walkEllipse) ? s.walkEllipse : 0.7;
            }

            s._npcWalkTime += dt * s._npcWalkSpeed;
            const tx = Math.cos(s._npcWalkTime) * s._npcWalkRadius;
            const tz = Math.sin(s._npcWalkTime * 0.9) * (s._npcWalkRadius * s._npcWalkEllipse);
            s.x = s._npcBaseX + tx;
            s.z = s._npcBaseZ + tz;
        }
    }

    function getBossUnlockProgress() {
        let completeCount = 0;
        for (let i = 0; i < REQUIRED_KINGDOMS_FOR_BOSS.length; i++) {
            const key = REQUIRED_KINGDOMS_FOR_BOSS[i];
            if (game.completedKingdoms && game.completedKingdoms[key]) {
                completeCount++;
            }
        }
        return {
            completeCount,
            totalCount: REQUIRED_KINGDOMS_FOR_BOSS.length
        };
    }

    function getHubNpcBossHint() {
        const progress = getBossUnlockProgress();
        if (game.bossUnlocked) {
            return 'The Boss Room is open. Use the red gate on the south side of hub!';
        }

        const missing = REQUIRED_KINGDOMS_FOR_BOSS
            .filter(key => !(game.completedKingdoms && game.completedKingdoms[key]))
            .map(key => kingdomConfigs[key]?.name || key);

        const missingText = missing.join(', ');
        return `Clear ${missingText}. Then use the red south gate for the Boss Room (${progress.completeCount}/${progress.totalCount}).`;
    }

    function checkKingdomCompletionAndReturnHub() {
        if (game.kingdomCompletionTriggered) return;
        if (game.insidePyramid) return;
        if (game.currentKingdom === 'hub' || game.currentKingdom === 'boss') return;
        if (game.totalMoons <= 0 || game.moons < game.totalMoons) return;

        const kingdomKey = game.currentKingdom;
        const miniBossRequired = MINI_BOSS_KINGDOMS.includes(kingdomKey);
        const miniBossDone = !miniBossRequired || (game.completedMiniBosses && game.completedMiniBosses[kingdomKey]);
        if (!miniBossDone) {
            trySpawnMiniBoss();
            if (game.miniBoss) {
                showMessage('Mini Boss spawned! Defeat it to clear the kingdom.', '#FFAA55');
            } else {
                showMessage(`Mini Boss challenge is pending (${game.soupsCollected || 0}/${game.totalSoups || 0} soups).`, '#FFAA55');
            }
            return;
        }

        game.kingdomCompletionTriggered = true;
        game.completedKingdoms[kingdomKey] = true;

        const progress = getBossUnlockProgress();
        const justUnlockedBoss = !game.bossUnlocked && progress.completeCount >= progress.totalCount;
        if (justUnlockedBoss) {
            game.bossUnlocked = true;
            showMessage('All kingdoms complete! Boss gate unlocked. Returning to Hub!', '#FF4500');
        } else {
            showMessage('Kingdom complete! Returning to Hub...', '#FFD700');
        }

        setTimeout(() => {
            if (game.currentKingdom !== 'hub') {
                loadKingdom('hub');
            }
        }, 500);
    }

    function collectPowerMoon(moon, messageText = 'Power Moon collected!') {
        if (!moon || moon.collected) return;

        moon.collected = true;
        game.moons++;
        game.moonsCollectedTotal++;

        playEffect(POWER_MOON_SFX, 1.6);
        updateHUD(game, kingdomConfigs, player);
        showMessage(messageText, '#FFD700');

        checkKingdomCompletionAndReturnHub();

        if (game.moonsCollectedTotal >= game.overallMoons) {
            showCredits(game);
        }
    }

    function markSoupCollected(soup) {
        if (!soup || soup._progressCounted) return;
        soup._progressCounted = true;
        game.soupsCollected = Math.min(game.totalSoups, (game.soupsCollected || 0) + 1);
    }

    function playNamedTrack(trackName) {
        if (!trackName) return;
        const files = getmusicfiles();
        const idx = files.indexOf(trackName);
        if (idx !== -1) playTrack(idx);
    }

    function playKingdomTheme(kingdomKey) {
        const tracks = getKingdomtrack();
        playNamedTrack(tracks[kingdomKey]);
    }

    function ensureMiniBossTheme(kingdomKey) {
        if (game.miniBossThemePlaying) return;
        const tracks = getKingdomtrack();
        const alias = MINI_BOSS_THEME_BY_KINGDOM[kingdomKey] || 'boss';
        playNamedTrack(tracks[alias] || tracks.boss);
        game.miniBossThemePlaying = true;
    }

    function trySpawnMiniBoss() {
        const key = game.currentKingdom;
        if (!MINI_BOSS_KINGDOMS.includes(key)) return;
        if (game.insidePyramid) return;
        if (game.miniBoss || (game.completedMiniBosses && game.completedMiniBosses[key])) return;

        const soupsReady = !game.totalSoups || game.soupsCollected >= game.totalSoups;
        const moonsReady = game.totalMoons > 0 && game.moons >= game.totalMoons;
        if (!soupsReady && !moonsReady) return;

        const facing = player.facingDir ? vector.normalize(player.facingDir) : vector.create(0, 0, 1);
        const spawnX = player.pos.x + facing.x * 16;
        const spawnZ = player.pos.z + facing.z * 16;
        const spawnY = Math.max(player.pos.y + 0.5, 3);

        game.miniBoss = new MiniBoss(key, spawnX, spawnY, spawnZ);
        game.miniBossThemePlaying = false;
        showMessage('All soups found. A Mini Boss appears!', '#FFAA55');
    }

    function updateMiniBossEncounter(dt) {
        const key = game.currentKingdom;
        if (!MINI_BOSS_KINGDOMS.includes(key) || game.insidePyramid) return false;

        trySpawnMiniBoss();
        if (!game.miniBoss) return false;

        ensureMiniBossTheme(key);
        game.miniBoss.update(dt);

        game._miniBossHitCooldown = Math.max(0, (game._miniBossHitCooldown || 0) - dt);
        if (game._miniBossHitCooldown <= 0 && game.miniBoss && game.miniBoss.isFightActive()) {
            const hit = game.miniBoss.checkPlayerHit(player.pos, player.radius);
            if (hit) {
                applyPlayerDamage(1, hit.pos, hit.type === 'projectile' ? 'Mini Boss projectile hit!' : 'Mini Boss body slam!');
                game._miniBossHitCooldown = 0.62;
            }
        }

        if (game.miniBoss && game.miniBoss.state === 'defeated') {
            game.completedMiniBosses[key] = true;
            game.miniBoss = null;
            game.miniBossThemePlaying = false;
            playKingdomTheme(key);
            showMessage('Mini Boss defeated! This kingdom portal is now green in Hub.', '#7CFC00');
            checkKingdomCompletionAndReturnHub();
            return false;
        }

        return !!(game.miniBoss && game.miniBoss.isCutscene());
    }

    function update(deltaTime) {
        if (game.paused) return; // skip game logic while paused
        const dt = Math.min(deltaTime / 1000, 0.05);

        if (game.gameOverActive) {
            updateGameOverCutscene(dt);
            return;
        }

        game.playerInvuln = Math.max(0, (game.playerInvuln || 0) - dt);

        updateHubNpcs(dt);

        // boss logic if present
        if (game.boss) game.boss.update(dt);

        if (game.boss && typeof game.boss.checkRocketHit === 'function') {
            const rocketHit = game.boss.checkRocketHit(player.pos, player.radius);
            if (rocketHit) {
                applyPlayerDamage(1, rocketHit.pos, 'Rocket blast!');
                playPeanutHitSfx();
            }
        }

        const miniBossCutscene = updateMiniBossEncounter(dt);

        const input = updatePlayerMovementAndCollision(game, dt, showMessage);
        const qKey = input.qKey;
        const eKey = input.eKey;
        const fKey = input.fKey;
        const kKey = input.kKey;
        const rKey = input.rKey;
        const bKey = input.bKey;

        if (miniBossCutscene) {
            player.vel.x *= 0.84;
            player.vel.z *= 0.84;
        }


        // Attack
        if (qKey && !game.qWasPressed && player.onGround) {
            player.state = 'attacking';
            player.stateTimer = 0.5;
        }
        game.qWasPressed = qKey;

        // Roll (now Summersault) - E key on ground
        if (eKey && !game.eWasPressed && player.onGround && !game.insidePyramid) {
            // Check if near pyramid first
            let nearPyramid = false;
            if (game.structures) {
                const pyramid = game.structures.find(s => s.type === 'pyramid' && s.hasInterior);
                if (pyramid) {
                    const dx = player.pos.x - pyramid.x;
                    const dz = player.pos.z - pyramid.z;
                    const distToPyramid = Math.sqrt(dx * dx + dz * dz);
                    if (distToPyramid < (pyramid.size || 15) * 1.2) {
                        nearPyramid = true;
                    }
                }
            }
            
            if (!nearPyramid) {
                player.vel.y = 10;
                player.state = 'summersault';
                player.stateTimer = 0.8;
                player.rotation = 0;
            }
        }

        // Hair Throw (Cappy mechanic) - F key
        if (fKey && !game.fWasPressed && !player.hairThrown) {
            // Throw hair in facing direction
            player.hairThrown = true;
            player.hairReturn = false;
            player.hairPos = vector.add(player.pos, vector.scale(vector.create(0, 1, 0), 2));
            
            const throwDir = player.facingDir || vector.create(0, 0, 1);
            player.hairVel = vector.scale(vector.normalize(vector.add(throwDir, vector.create(0, 0.2, 0))), 25);
            
            showMessage('Hair Throw!', '#FFD700');
            playEffect("jeff's song (3).mp3", 2);
        }
        game.fWasPressed = fKey;

        // Update hair projectile
        if (player.hairThrown && player.hairPos) {
            const hairSpeed = 25;
            const maxDist = 20;
            const returnSpeed = 30;
            
            if (!player.hairReturn) {
                // Hair flying out
                player.hairPos = vector.add(player.hairPos, vector.scale(player.hairVel, dt));
                player.hairVel.y -= 15 * dt; // Gravity on hair
                
                // Check distance or ground collision
                const distFromPlayer = vector.length(vector.sub(player.hairPos, player.pos));
                if (distFromPlayer > maxDist || player.hairPos.y < 0) {
                    player.hairReturn = true;
                }
                
                // Check moon collection with hair
                game.collectibles.forEach(moon => {
                    if (!moon.collected && player.hairPos) {
                        const dist = vector.length(vector.sub(player.hairPos, moon.pos));
                        if (dist < 1.5) {
                            collectPowerMoon(moon, 'Hair Capture! Power Moon!');
                            player.hairReturn = true;
                        }
                    }
                });

                // Check soup collection with hair
                if (game.powerSoups) {
                    game.powerSoups.forEach(soup => {
                        if (!soup.collected && player.hairPos) {
                            const dist = vector.length(vector.sub(player.hairPos, soup.pos));
                            if (dist < 1.5) {
                                soup.collected = true;
                                soup.collectedTime = Date.now();
                                markSoupCollected(soup);
                                // Apply soup buff
                                player.speedMultiplier = 1.6;
                                player.jumpMultiplier = 1.2;
                                player.soupTimer = 8.0;
                                showMessage('Hair Capture! Power Soup activated!', '#FF8C00');
                                player.hairReturn = true;
                            }
                        }
                    });
                }

                // Check walker collision with hair
                game.walkers.forEach(walker => {
                    if (walker.alive && player.hairPos) {
                        const dist = vector.length(vector.sub(player.hairPos, walker.pos));
                        if (dist < 1.5) {
                            walker.die();
                            player.hairReturn = true;
                            game.moons++;
                            game.moonsCollectedTotal++;
                            updateHUD(game, kingdomConfigs, player);
                            showMessage('Hair Hit! Enemy defeated!', '#FF8C00');
                            if (game.moonsCollectedTotal >= game.overallMoons) showCredits(game);
                        }
                    }
                });

                // boss hit detection
                if (game.boss && player.hairPos) {
                    if (game.boss.phase === 1) {
                        const dist = vector.length(vector.sub(player.hairPos, game.boss.peanutPos));
                        if (dist < 2) {
                            game.boss.onHit('hair');
                            player.hairReturn = true;
                        }
                    } else if (game.boss.phase === 2) {
                        const dist = vector.length(vector.sub(player.hairPos, game.boss.robotPos));
                        if (dist < 3) {
                            game.boss.onHit('hair');
                            player.hairReturn = true;
                        }
                    }
                }

                if (game.miniBoss && player.hairPos && game.miniBoss.isFightActive()) {
                    const distMini = vector.length(vector.sub(player.hairPos, game.miniBoss.pos));
                    if (distMini < game.miniBoss.radius + 0.75) {
                        game.miniBoss.onHit('hair');
                        player.hairReturn = true;
                    }
                }
            } else {
                // Hair returning
                const toPlayer = vector.sub(player.pos, player.hairPos);
                const dist = vector.length(toPlayer);
                
                if (dist < 1) {
                    // Hair returned
                    player.hairThrown = false;
                    player.hairPos = null;
                    player.hairVel = null;
                } else {
                    const returnDir = vector.normalize(toPlayer);
                    player.hairPos = vector.add(player.hairPos, vector.scale(returnDir, returnSpeed * dt));
                }
            }
        }

        // Kingdom switch via K
        if (kKey && !game.kWasPressed && isSwDebugActive()) {
            const kingdomKeys = Object.keys(kingdomConfigs);
            const currentIndex = kingdomKeys.indexOf(game.currentKingdom);
            const dbg = isSwDebugActive();

            let target = null;
            for (let step = 1; step <= kingdomKeys.length; step++) {
                const idx = (currentIndex + step) % kingdomKeys.length;
                const candidate = kingdomKeys[idx];
                if (candidate === 'boss' && !game.bossUnlocked && !dbg) {
                    continue;
                }
                target = candidate;
                break;
            }

            if (target) {
                if (target === 'boss' && !game.bossUnlocked && dbg) {
                    loadKingdom('boss', { force: true });
                } else {
                    loadKingdom(target);
                }
            } else {
                showMessage('No teleport target available.', '#FF5555');
            }
        }
        game.kWasPressed = kKey;
        // direct boss debug key B
        if (bKey && !game.bWasPressed) {
            if (isSwDebugActive()) {
                loadKingdom('boss', { force: true });
                showMessage('Debug Warp: Boss Arena', '#FF66AA');
            } else {
                showMessage('Enable swDbg() first to use B boss warp.', '#FF5555');
            }
        }
        game.bWasPressed = bKey;
        
        // Boss stomp collision
        if (game.boss) {
            const toBoss = vector.sub(player.pos, game.boss.phase === 1 ? game.boss.peanutPos : game.boss.robotPos);
            const dist = vector.length(toBoss);
            if (player.vel.y < 0 && player.pos.y > ((game.boss.phase === 1 ? game.boss.peanutPos.y : game.boss.robotPos.y) + 1)) {
                if ((game.boss.phase === 1 && dist < 2) || (game.boss.phase === 2 && dist < 3)) {
                    game.boss.onHit('stomp');
                    player.vel.y = 12;
                }
            }
        }

        if (game.miniBoss && game.miniBoss.isFightActive()) {
            const toMini = vector.sub(player.pos, game.miniBoss.pos);
            const distMini = vector.length(toMini);
            if (player.vel.y < -6 && player.pos.y > game.miniBoss.pos.y + 1.0 && distMini < game.miniBoss.radius + 0.8) {
                game.miniBoss.onHit('stomp');
                player.vel.y = 12;
            }
        }
        
        // Hub entrances (only when in hub world)
        if (game.currentKingdom === 'hub' && game.structures && !game.insidePyramid) {
            let nearest = null, bestDist = Infinity;
            let nearestNpc = null;
            let npcDist = Infinity;
            game.structures.forEach(s => {
                if (s.type === 'entrance') {
                    const dx = player.pos.x - s.x;
                    const dz = player.pos.z - s.z;
                    const d = Math.hypot(dx, dz);
                    if (d < bestDist) {
                        bestDist = d;
                        nearest = s;
                    }
                } else if (s.type === 'npc') {
                    const dx = player.pos.x - s.x;
                    const dz = player.pos.z - s.z;
                    const d = Math.hypot(dx, dz);
                    if (d < npcDist) {
                        npcDist = d;
                        nearestNpc = s;
                    }
                }
            });

            if (nearestNpc && npcDist < 5) {
                const npcName = nearestNpc.name || 'Guide';
                const now = Date.now();
                if (!game._lastNpcPromptTime || (now - game._lastNpcPromptTime) > 1300) {
                    showMessage(`Press E to talk to ${npcName}`, '#00CED1');
                    game._lastNpcPromptTime = now;
                }
                if (eKey && !game.eWasPressed) {
                    showMessage(getHubNpcBossHint(), '#7CFC00');
                    game._lastNpcPromptTime = Date.now() + 1400;
                }
            } else if (nearest && bestDist < 4) {
                const target = nearest.target || 'cap';
                if (target === 'boss' && !game.bossUnlocked) {
                    const progress = getBossUnlockProgress();
                    showMessage(`Boss Gate Locked ${progress.completeCount}/${progress.totalCount}`, '#FF5555');
                    if (eKey && !game.eWasPressed) {
                        showMessage('Clear Cap, Cascade, and Sand to unlock Boss.', '#FF5555');
                    }
                } else {
                    showMessage(`Press E to go to ${kingdomConfigs[target].name}`, '#FFD700');
                    if (eKey && !game.eWasPressed) {
                        loadKingdom(target);
                    }
                }
            }
        }
        // Pyramid teleporter (only in Sand Kingdom)
        if (game.structures && !game.insidePyramid && player.onGround) {
            const pyramid = game.structures.find(s => s.type === 'pyramid' && s.hasInterior);
            if (pyramid) {
                const dx = player.pos.x - pyramid.x;
                const dz = player.pos.z - pyramid.z;
                const distToPyramid = Math.sqrt(dx * dx + dz * dz);
                
                if (distToPyramid < (pyramid.size || 15) * 1.2) {
                    showMessage('Press E to enter pyramid', '#FFD700');
                    
                    if (eKey && !game.eWasPressed) {
                        enterPyramid();
                    }
                }
            }
        } else if (game.insidePyramid && player.onGround && eKey && !game.eWasPressed) {
            exitPyramid();
        }
        game.eWasPressed = eKey;

        // Toggle RTX mode
        if (rKey && !game.rWasPressed) {
            game.rtxMode = !game.rtxMode;
            showMessage(game.rtxMode ? 'RTX Mode ON' : 'RTX Mode OFF', '#8AE234');
        }
        game.rWasPressed = rKey;

        // Update Power Soup timer
        if (player.soupTimer > 0) {
            player.soupTimer -= dt;
            if (player.soupTimer <= 0) {
                player.soupTimer = 0;
                player.speedMultiplier = 1.0;
                player.jumpMultiplier = 1.0;
                showMessage('Power Soup expired');
            }
        }

        // Collect moons
        game.collectibles.forEach(moon => {
            if (!moon.collected) {
                const dist = vector.length(vector.sub(player.pos, moon.pos));
                if (dist < player.radius + moon.radius) {
                    collectPowerMoon(moon, 'Power Moon collected!');
                }
            }
        });

        // Collect Power Soups
        if (game.powerSoups) {
            game.powerSoups.forEach(soup => {
                if (!soup.collected) {
                    const dist = vector.length(vector.sub(player.pos, soup.pos));
                    if (dist < player.radius + soup.radius) {
                        soup.collected = true;
                        soup.collectedTime = Date.now();
                        markSoupCollected(soup);
                        // Apply temporary buffs
                        player.speedMultiplier = 1.6;
                        player.jumpMultiplier = 1.2;
                        player.soupTimer = 8.0; // seconds
                        showMessage('Power Soup! Speed & Jump UP!', '#FF8C00');
                        // play brief powerup music rather than replace background
                        playEffect(getKingdomtrack().powerup, player.soupTimer);
                    }
                }
            });
        }

        trySpawnMiniBoss();

        // Update walkers and handle collisions with player
        game.walkers.forEach(walker => {
            walker.update(dt, game.platforms);

            if (!walker.alive) return;

            const dist = vector.length(vector.sub(player.pos, walker.pos));
            if (dist < player.radius + walker.radius) {
                // Stomp if player is falling onto the walker
                if (player.vel.y < -6 && player.pos.y > walker.pos.y + walker.radius * 0.4) {
                    walker.die();
                    player.vel.y = 12;
                    game.moons++;
                    game.moonsCollectedTotal++;
                    updateHUD(game, kingdomConfigs, player);
                    showMessage('Stomp!');
                    if (game.moonsCollectedTotal >= game.overallMoons) showCredits(game);
                } else if (player.state === 'attacking') {
                    walker.die();
                    player.vel.y = 6;
                    game.moons++;
                    game.moonsCollectedTotal++;
                    updateHUD(game, kingdomConfigs, player);
                    showMessage('Knockout!');
                    if (game.moonsCollectedTotal >= game.overallMoons) showCredits(game);
                } else {
                    // Hurt player
                    const knock = player.facingDir || vector.create(0,0,1);
                    player.vel.x = -knock.x * 12;
                    player.vel.z = -knock.z * 12;
                    applyPlayerDamage(1, walker.pos, 'Walker hit!');
                }
            }
        });

        // Clean up dead walkers after a short time
        game.walkers = game.walkers.filter(w => !( !w.alive && w.deadTimer > 2.0 ));

        // Update & draw power soups (draw happens in draw())
        if (game.powerSoups) {
            game.powerSoups = game.powerSoups.filter(s => !(s.collected && s.collectedTime && (Date.now() - s.collectedTime) > 2000));
        }

        // Camera
        const camDist = game.camera.distance / game.camera.zoom;
        const camHeight = 15 / game.camera.zoom;
        const targetCamPos = vector.add(player.pos, vector.create(
            -Math.sin(game.camera.yaw) * camDist,
            camHeight,
            -Math.cos(game.camera.yaw) * camDist
        ));
        game.camera.x += (targetCamPos.x - game.camera.x) * 0.1;
        game.camera.y += (targetCamPos.y - game.camera.y) * 0.1;
        game.camera.z += (targetCamPos.z - game.camera.z) * 0.1;
    }

    function draw() {
        if (game.gameOverActive) {
            drawGameOverCutscene();
            return;
        }

        engine.engineUpdate({x: game.camera.x, y: game.camera.y, z: game.camera.z}, player.pos);

        if (game.rtxMode) {
            console.warn("Warning: RTX mode not available for now");
        } else {
            // Normal render path
            drawStructures();
            game.platforms.forEach(platform => platform.draw());
            game.collectibles.forEach(moon => moon.draw());
            if (game.powerSoups) game.powerSoups.forEach(s => s.draw());
            game.walkers.forEach(w => w.draw());
            if (game.boss) game.boss.draw();
            if (game.miniBoss) game.miniBoss.draw();
            drawJeff(player);
        }
    }

    function gameLoop(timestamp) {
        const deltaTime = timestamp - game.lastTime;
        game.lastTime = timestamp;

        // handle pause key here now that keydown listener is elsewhere
        const pKey = game.keys['p'] || game.keys['P'] || game.keys['KeyP'];
        if (!game.gameOverActive && pKey && !game.pWasPressed) togglePause(game);
        game.pWasPressed = pKey;

        update(deltaTime);
        updateBossHealthUI(game);
        draw();
        requestAnimationFrame(gameLoop);
    }

    beginbackgroundmusic(game.currentKingdom);

    stopGameOverFallLoop();
    stopGameOverMusicLoop();
    game.playerHealth = game.playerMaxHealth;
    game.playerInvuln = 0;
    game.gameOverActive = false;
    game.gameOverTimer = 0;
    game.gameOverOverlayShown = false;
    game.gameOverRedirectDone = false;
    const staleOverlay = document.getElementById('game-over-overlay');
    if (staleOverlay) staleOverlay.remove();

    showMessage('Welcome to Cap Kingdom!', '#FFD700');
    // start in the hub world so player can pick a level
    loadKingdom('hub');
    requestAnimationFrame(gameLoop);
})();
