class LocalGameManager {
    constructor() {
        this.games = [
            {
                id: 'classic-world',
                name: 'Classic Block World',
                description: 'Simple block world with a lego-like character and basic jumping.'
            }
        ];
    }

    getAllGames() {
        return this.games;
    }

    getGame(id) {
        return this.games.find((g) => g.id === id) || null;
    }
}

window.gameManager = new LocalGameManager();