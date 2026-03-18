    // ----- audio / music player setup -----
    const musicFiles = [
        'superGalaxyJeffTheme_1.mp3',
        'superGalaxyJeffTheme_2.mp3',
        'JeffOddeseyTheme2.mp3',
        'JeffOddeseyTheme.mp3',
        'themesong_old.mp3',
        'themesong.mp3',
        'themesong (1).mp3',
        "jeff's song (1).mp3",
        "jeff's song.mp3",
        "jeff's song (2).mp3",
        "jeff's song2.mp3",
        "jeff's song (5).mp3",
        "jeff's song (4).mp3",
        "jeff's song (3).mp3",
        "penutfacefinalfury2.mp3",
        "penutfacefinalfury.mp3",
        "PenutFace's fury (1).mp3",
        "PenutFace's fury.mp3",
        "bonustheme.mp3",
        'bonustheme2.mp3',
        'summerhotspot2.mp3'
    ];

    const creditTrackName = "jeff's song (5).mp3";
    const musicBasePath = '../../assets/sound/';

    const kingdomTrack = {
        cap: "jeff's song.mp3",
        cascade: "jeff's song (4).mp3",
        sand: "bonustheme.mp3",
        hub: "summerhotspot2.mp3",
        boss: "PenutFace's fury.mp3",
        final_boss: "penutfacefinalfury.mp3",
        bonus: "bonustheme2.mp3",
        pause: "themesong.mp3",
        powerup: "jeff's song (2).mp3"
    };

    const audio = new Audio();
    audio.volume = 0.6;
    let musicStarted = false;
    let musicIndex;

export function getKingdomtrack() {
    return kingdomTrack;
}

export function getmusicfiles() {
    return musicFiles;
}

export function getAudio() {
    return audio;
}

export function getMusicIndex() {
    return musicIndex;
}

export function playTrack(idx) {
        if (idx < 0 || idx >= musicFiles.length) return;
        musicIndex = idx;
        audio.loop = true;
        audio.src = musicBasePath + encodeURIComponent(musicFiles[idx]);
        audio.play().catch(() => {});
    }

// play a short audio effect; stops after `duration` seconds (default 2)
export function playEffect(name, duration = 2) {
        const eff = new Audio(musicBasePath + encodeURIComponent(name));
        eff.volume = (localStorage.getItem("volume") || 60) / 100;
        eff.play().catch(() => {});
        if (duration > 0) {
            setTimeout(() => {
                eff.pause();
                // rewind in case reused
                eff.currentTime = 0;
            }, duration * 1000);
        }
        return eff;
    }

export function playRandomBackground() {
        if (game.creditsShown) return;
        const candidates = musicFiles.map((f,i) => i).filter(i => musicFiles[i] !== creditTrackName);
        const idx = candidates[Math.floor(Math.random() * candidates.length)];
        playTrack(idx);
    }

export function beginbackgroundmusic(currentKingdom) {
    // begin background music (use specific track for starting kingdom if available)
    const initTrack = kingdomTrack[currentKingdom];
    if (initTrack) {
        const idx = musicFiles.indexOf(initTrack);
        if (idx !== -1) playTrack(idx);
    }
}

export function musicInit() {
document.addEventListener('click', () => {
        if (!musicStarted) {
            if (!audio.src) playRandomBackground();
            audio.play().catch(() => {});
            musicStarted = true;
        }
    }, { once: true });

    audio.addEventListener('ended', () => {
        if (musicFiles[musicIndex] === creditTrackName) {
            audio.loop = false;
        } else {
            playRandomBackground();
        }
    });
}

const volumeSlider = document.getElementById("volume");
volumeSlider.value = localStorage.getItem("volume") || 60;
audio.volume = volumeSlider.value / 100;

volumeSlider.addEventListener("input", () => {
    audio.volume = volumeSlider.value / 100;
    localStorage.setItem("volume", volumeSlider.value);
});
