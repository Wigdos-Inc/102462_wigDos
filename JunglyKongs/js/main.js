import { startGame } from './game.js';

window.addEventListener('DOMContentLoaded', ()=>{
  // create a root container if not present
  let root = document.getElementById('game-root');
  if(!root){ root = document.createElement('div'); root.id = 'game-root'; root.style.position='absolute'; root.style.left='0'; root.style.top='0'; root.style.right='0'; root.style.bottom='0'; document.body.appendChild(root); }
  startGame().catch(e=>{ console.error('Game start failed', e); alert('Error starting game: '+e.message); });
});