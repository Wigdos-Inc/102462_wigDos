const bg_music = document.getElementById('backgroundaudio');
let bg_music_playing = false;

function playBackgroundMusic(){
    if(bg_music_playing = false){
        bg_music = true;
        bg_music.currentTime = 0;  // Rewind to start of the audio
        bg_music.play();
    }
}
