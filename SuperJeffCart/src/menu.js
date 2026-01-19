/**
 * Menu System for Kart Racing Game
 */

export class MenuSystem {
    constructor(onStartRace, onSelectTrack, onSelectCharacter) {
        this.onStartRace = onStartRace;
        this.onSelectTrack = onSelectTrack;
        this.onSelectCharacter = onSelectCharacter;
        
        this.currentMenu = 'main'; // main, character, track, settings
        this.selectedCharacter = 'superjeff';
        this.selectedTrack = 'classic';
        
        this.createMenus();
        this.setupEventListeners();
    }

    createMenus() {
        // Main Menu already exists in HTML
        // We'll create additional menus
        
        // Track selection menu
        const trackMenu = document.createElement('div');
        trackMenu.id = 'track-select';
        trackMenu.className = 'menu-screen';
        trackMenu.style.display = 'none';
        trackMenu.innerHTML = `
            <h1>🏁 Select Track</h1>
            <div class="track-buttons">
                <button id="track-classic" class="selected">Classic Oval</button>
                <button id="track-city">City Circuit</button>
                <button id="track-desert">Desert Track</button>
            </div>
            <button id="track-back" class="back-button">Back</button>
        `;
        document.body.appendChild(trackMenu);

        // Pause menu
        const pauseMenu = document.createElement('div');
        pauseMenu.id = 'pause-menu';
        pauseMenu.className = 'menu-screen';
        pauseMenu.style.display = 'none';
        pauseMenu.innerHTML = `
            <h1>⏸️ PAUSED</h1>
            <div class="pause-buttons">
                <button id="pause-resume">Resume</button>
                <button id="pause-restart">Restart Race</button>
                <button id="pause-menu">Main Menu</button>
            </div>
        `;
        document.body.appendChild(pauseMenu);

        // Results screen
        const resultsScreen = document.createElement('div');
        resultsScreen.id = 'results-screen';
        resultsScreen.className = 'menu-screen';
        resultsScreen.style.display = 'none';
        resultsScreen.innerHTML = `
            <h1>🏆 Race Results</h1>
            <div id="results-content"></div>
            <div class="results-buttons">
                <button id="results-retry">Race Again</button>
                <button id="results-menu">Main Menu</button>
            </div>
        `;
        document.body.appendChild(resultsScreen);
    }

    setupEventListeners() {
        // Track selection
        ['classic', 'city', 'desert'].forEach(track => {
            const btn = document.getElementById(`track-${track}`);
            if (btn) {
                btn.addEventListener('click', () => this.selectTrack(track));
            }
        });

        // Pause menu
        const pauseResume = document.getElementById('pause-resume');
        if (pauseResume) {
            pauseResume.addEventListener('click', () => this.resumeGame());
        }

        // ESC key for pause
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentMenu === 'game') {
                this.showPauseMenu();
            }
        });
    }

    selectTrack(track) {
        this.selectedTrack = track;
        document.querySelectorAll('.track-buttons button').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.getElementById(`track-${track}`).classList.add('selected');
    }

    showTrackSelect() {
        document.getElementById('character-select').style.display = 'none';
        document.getElementById('track-select').style.display = 'block';
        this.currentMenu = 'track';
    }

    startGame() {
        document.getElementById('character-select').style.display = 'none';
        document.getElementById('track-select').style.display = 'none';
        document.getElementById('ui').style.display = 'block';
        this.currentMenu = 'game';
        
        if (this.onStartRace) {
            this.onStartRace(this.selectedCharacter, this.selectedTrack);
        }
    }

    showPauseMenu() {
        document.getElementById('pause-menu').style.display = 'block';
        this.currentMenu = 'pause';
    }

    resumeGame() {
        document.getElementById('pause-menu').style.display = 'none';
        this.currentMenu = 'game';
    }

    showResults(position, time, lap) {
        const resultsContent = document.getElementById('results-content');
        resultsContent.innerHTML = `
            <div class="result-item">
                <h2>Position: ${this.getPositionText(position)}</h2>
            </div>
            <div class="result-item">
                <h3>Final Time: ${time}</h3>
            </div>
            <div class="result-item">
                <h3>Laps Completed: ${lap}</h3>
            </div>
        `;
        
        document.getElementById('results-screen').style.display = 'block';
        this.currentMenu = 'results';
    }

    getPositionText(position) {
        const suffixes = ['st', 'nd', 'rd'];
        const suffix = position <= 3 ? suffixes[position - 1] : 'th';
        return `${position}${suffix}`;
    }

    hideAllMenus() {
        document.getElementById('character-select').style.display = 'none';
        document.getElementById('track-select').style.display = 'none';
        document.getElementById('pause-menu').style.display = 'none';
        document.getElementById('results-screen').style.display = 'none';
    }
}
