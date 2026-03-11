import { getKingdomtrack, getmusicfiles, playTrack, getAudio, getMusicIndex } from './audio.js';

let prevMusicForPause;

export function updateHUD(game, kingdomConfigs, player) {
    document.getElementById('moons').textContent = game.moons;
    document.getElementById('totalMoons').textContent = game.totalMoons;
    document.getElementById('kingdom').textContent = kingdomConfigs[game.currentKingdom].name;
    const t = Math.max(0, Math.floor(player.soupTimer));
    const soupEl = document.getElementById('soupTimer');
    if (soupEl) soupEl.textContent = t > 0 ? (t + 's') : '0s';
    // boss health display
    const bossEl = document.getElementById('bossHealth');
    const bossVal = document.getElementById('bossVal');
    if (game.boss && game.boss.phase === 2) {
        bossEl.style.display = 'block';
        bossVal.textContent = game.boss.robotHealth;
    } else {
        bossEl.style.display = 'none';
    }
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
