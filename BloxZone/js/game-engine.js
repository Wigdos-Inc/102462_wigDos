import { BloxGame } from './engine/game.js';

class SimpleGameEngine {
    constructor(userId, options = {}) {
        this.userId = userId;
        this.options = options;
        this.game = null;
        this.isRunning = false;
    }

    init() {
        const container = document.getElementById('game-container');
        if (!container) {
            throw new Error('Missing #game-container');
        }

        container.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.id = 'game-canvas';
        container.appendChild(canvas);

        this.game = new BloxGame(canvas, this.userId, this.options);
    }

    start() {
        if (!this.game) {
            this.init();
        }
        this.isRunning = true;
        this.game.start();
    }

    stop() {
        this.isRunning = false;
        if (this.game) {
            this.game.stop();
        }
    }
}

export { SimpleGameEngine };
