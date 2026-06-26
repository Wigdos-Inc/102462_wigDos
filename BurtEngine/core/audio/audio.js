import { hasInteracted } from '../engine/splash.js';

export class BurtAudio {
    constructor(path) {
        this.src = path;
        this.loop = false;
        this.volume = 1;
        this.pitch = 1;
        this.playing = false;
    }

    async init() {
        this.audioCtx = new AudioContext();

        const response = await fetch(this.src);
        const arrayBuffer = await response.arrayBuffer();
        this.buffer = await this.audioCtx.decodeAudioData(arrayBuffer);

        this.audio = this.audioCtx.createBufferSource();
        this.audio.buffer = this.buffer;
        this.audio.connect(this.audioCtx.destination);
    }

    update() {
        let sourceNode = this.audioCtx.createBufferSource();
        sourceNode.loop = this.loop;

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = this.volume;

        const input = this.buffer.getChannelData(0);

        const outputLength = Math.floor(input.length / this.pitch);
        const outputBuffer = this.audioCtx.createBuffer(1, outputLength, this.buffer.sampleRate);
        const output = outputBuffer.getChannelData(0);

        for (let i = 0; i < outputLength; i++) {
            output[i] = input[Math.floor(i * this.pitch)] || 0;
        }

        sourceNode.buffer = outputBuffer;
        sourceNode.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        this.audio = sourceNode;
    }

    play() {
        if (!hasInteracted) {
            console.error(`Error Audio ${this.src} Couldn't play! User didn't interact with page.`); 
            return;
        }

        if (this.playing) this.stop();

        this.playing = true;
        this.update();
        this.audio.start();
    }

    stop() {
        if (!this.playing) return;

        this.playing = false;
        this.audio.stop();
    }
}
