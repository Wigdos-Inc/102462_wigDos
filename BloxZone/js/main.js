// Simple navigation to play game
document.addEventListener('DOMContentLoaded', () => {
    // Check if there's a play button
    const playButtons = document.querySelectorAll('[onclick*="playGame"]');
    
    // Simple play game function
    window.playGame = function() {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            alert('Please login first!');
            window.location.href = 'pages/login.html';
            return;
        }
        
        const gameWidth = 1024;
        const gameHeight = 768;
        const gwleft = (window.innerWidth / 2) - (gameWidth / 2);
        const gwtop = (window.innerHeight / 2) - (gameHeight / 2);
        
        window.open('pages/player.html', 'bloxzone-game', `width=${gameWidth},height=${gameHeight},left=${gwleft},top=${gwtop}`);
    };
});
