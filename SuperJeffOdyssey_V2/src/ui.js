import { getKingdomtrack, getmusicfiles, playTrack, getAudio, getMusicIndex } from './audio.js';

let prevMusicForPause;

const sprites_base = '../../assets/sprites/';
const health_pie = document.getElementById('health_pie');
const health_sprites = [
    'Jeff_hp_3.svg',
    'Jeff_hp_2.svg',
    'Jeff_hp_1.svg',
    'Jeff_hp_0.svg'
]

export function updateHUD(game, kingdomConfigs, player) {
    document.getElementById('moons').textContent = game.moons;
    document.getElementById('totalMoons').textContent = game.totalMoons;
    document.getElementById('kingdom').textContent = kingdomConfigs[game.currentKingdom].name;
    const hpFill = document.getElementById('healthFill');
    if (hpFill) {
        const maxHp = Math.max(1, Number(game.playerMaxHealth) || 3);
        const hp = Math.max(0, Math.min(maxHp, Number(game.playerHealth) || 0));
        const pct = (hp / maxHp) * 100;
        hpFill.style.width = `${pct}%`;
    } else {
        health_pie.src = sprites_base + health_sprites[game.playerHealth];
    }
    
    const t = Math.max(0, Math.floor(player.soupTimer));
    const soupEl = document.getElementById('soupTimer');
    if (soupEl) soupEl.textContent = t > 0 ? (t + 's') : '0s';
    updateBossHealthUI(game);
}

function getActiveBossHealthInfo(game) {
    if (game.gameOverActive) return null;
    if (game.boss && typeof game.boss.getHealthInfo === 'function') {
        return game.boss.getHealthInfo();
    }
    if (game.miniBoss && typeof game.miniBoss.getHealthInfo === 'function') {
        return game.miniBoss.getHealthInfo();
    }
    return null;
}

export function updateBossHealthUI(game) {
    const root = document.getElementById('bossHealthUI');
    const label = document.getElementById('bossHealthLabel');
    const fill = document.getElementById('bossHealthFill');
    const val = document.getElementById('bossHealthValue');
    if (!root || !label || !fill || !val) return;

    const info = getActiveBossHealthInfo(game);
    if (!info || !Number.isFinite(info.max) || info.max <= 0) {
        root.style.display = 'none';
        return;
    }

    const current = Math.max(0, Math.min(info.max, Number(info.current) || 0));
    const pct = (current / info.max) * 100;
    root.style.display = 'flex';
    root.classList.toggle('rage', !!info.rage);
    label.textContent = info.label || 'BOSS';
    fill.style.width = `${pct}%`;
    val.textContent = `${Math.ceil(current)}/${Math.ceil(info.max)}`;
}

export function showCredits(game) {
    if (game.creditsShown) return;
    game.creditsShown = true;
    // overlay message
    const overlay = document.createElement('div');
    overlay.id = 'credits-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.color = '#fff';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '200';
    overlay.style.fontSize = '2em';
    overlay.innerHTML = '<div>Thank you for playing!</div><div style="font-size:0.6em;margin-top:20px;">All moons collected</div>';
    document.body.appendChild(overlay);
    // play credit track
    const creditIndex = musicFiles.indexOf(creditTrackName);
    if (creditIndex !== -1) {
        playTrack(creditIndex);
        getAudio().loop = false;
    }
}

export function togglePause(game) {
    game.paused = !game.paused;
    console.log('Game ' + (game.paused ? 'paused' : 'resumed'));
    if (game.paused) {
        prevMusicForPause = getMusicIndex();
        const musicFiles = getmusicfiles();
        const musictracks = getKingdomtrack();
        const idx = musicFiles.indexOf(musictracks.pause);
        if (idx !== -1) playTrack(idx);
        getAudio().loop = true;
        const ov = document.createElement('div');
        ov.id = 'pause-overlay';
        ov.style.position = 'absolute';
        ov.style.top = '0';
        ov.style.left = '0';
        ov.style.width = '100%';
        ov.style.height = '100%';
        ov.style.background = 'rgba(0,0,0,0.65)';
        ov.style.display = 'flex';
        ov.style.alignItems = 'center';
        ov.style.justifyContent = 'center';
        ov.style.zIndex = '200';
        ov.style.color = '#fff';
        ov.style.fontSize = '3em';
        ov.textContent = 'PAUSED';

        const volume_bar = document.createElement('div');
        volume_bar.setAttribute('class', 'audio-ui');
        const volume_label = document.createElement('label');
        volume_label.setAttribute('for', 'volume');
        volume_label.innerHTML = '🔊';
        const volume_input = document.createElement('input');
        volume_input.id = 'volume';
        volume_input.type = 'range';
        volume_input.min = 0;
        volume_input.max = 100;
        volume_input.value = localStorage.getItem("volume") || 60;

        //const volumeSlider = document.getElementById("volume");
        //volumeSlider.value = localStorage.getItem("volume") || 60;
        const audio = getAudio();
        audio.volume = volume_input.value / 100;

        volume_input.addEventListener("input", () => {
            audio.volume = volume_input.value / 100;
            localStorage.setItem("volume", volume_input.value);
        });

        volume_bar.appendChild(volume_label);
        volume_bar.appendChild(volume_input);
        ov.appendChild(volume_bar);
        document.body.appendChild(ov);
    } else {
        const ov = document.getElementById('pause-overlay');
        if (ov) ov.remove();
        if (prevMusicForPause !== undefined) {
            playTrack(prevMusicForPause);
            prevMusicForPause = undefined;
        }
    }
}

export function showMessage(text, color = '#FFD700') {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.style.color = color;
    setTimeout(() => { msg.textContent = ''; }, 2000);
}
