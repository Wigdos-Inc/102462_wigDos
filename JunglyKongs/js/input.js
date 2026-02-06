export function createInput(){
  const state = { keys: {}, dir: {x:0,z:0}, jump:false, roll:false, shoot:false, punch:false, kick:false };
  window.addEventListener('keydown', (e)=>{
    state.keys[e.code] = true;
  });
  window.addEventListener('keyup', (e)=>{ state.keys[e.code] = false; });

  function update(){
    state.dir.x = 0; state.dir.z = 0; state.jump = false; state.roll = false; state.shoot = false; state.punch = false; state.kick = false;
    if(state.keys['KeyW'] || state.keys['ArrowUp']) state.dir.z -= 1;
    if(state.keys['KeyS'] || state.keys['ArrowDown']) state.dir.z += 1;
    if(state.keys['KeyA'] || state.keys['ArrowLeft']) state.dir.x -= 1;
    if(state.keys['KeyD'] || state.keys['ArrowRight']) state.dir.x += 1;
    if(state.keys['Space']) state.jump = true;
    if(state.keys['ShiftLeft'] || state.keys['ShiftRight']) state.roll = true;
    if(state.keys['KeyQ']) state.shoot = true;
    if(state.keys['KeyE']) state.punch = true;
    if(state.keys['KeyR']) state.kick = true;
    // normalize small vector
    const len = Math.hypot(state.dir.x, state.dir.z);
    if(len>1){ state.dir.x/=len; state.dir.z/=len; }
  }

  return { state, update };
}
