export class SimplexNoise {
    constructor(seed = 12345) {
        const p = new Uint8Array(256);

        for(let i = 0; i < 256; i++) p[i] = i;

        let s = seed;

        function rand() {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        }

        for(let i = 255; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));

            const tmp = p[i];
            p[i] = p[j];
            p[j] = tmp;
        }

        this.perm = new Uint8Array(512);

        for(let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    }

    static grad3 = [
        [1,1],[-1,1],[1,-1],[-1,-1],
        [1,0],[-1,0],[1,0],[-1,0],
        [0,1],[0,-1],[0,1],[0,-1]
    ];

    simplex2(xin, yin) {
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

        let n0, n1, n2;

        const s = (xin + yin) * F2;

        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);

        const t = (i + j) * G2;

        const X0 = i - t;
        const Y0 = j - t;

        const x0 = xin - X0;
        const y0 = yin - Y0;

        let i1, j1;

        if(x0 > y0) {
            i1 = 1;
            j1 = 0;
        }
        else {
            i1 = 0;
            j1 = 1;
        }

        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;

        const x2 = x0 - 1 + 2 * G2;
        const y2 = y0 - 1 + 2 * G2;

        const ii = i & 255;
        const jj = j & 255;

        const gi0 = this.perm[ii + this.perm[jj]] % 12;

        const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;

        const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

        let t0 = 0.5 - x0*x0 - y0*y0;

        if(t0 < 0) n0 = 0;
        else {
            t0 *= t0;
            const g = SimplexNoise.grad3[gi0];
            n0 = t0 * t0 * (g[0]*x0 + g[1]*y0);
        }

        let t1 = 0.5 - x1*x1 - y1*y1;

        if(t1 < 0) n1 = 0;
        else {
            t1 *= t1;
            const g = SimplexNoise.grad3[gi1];
            n1 = t1 * t1 * (g[0]*x1 + g[1]*y1);
        }

        let t2 = 0.5 - x2*x2 - y2*y2;

        if(t2 < 0) n2 = 0;
        else {
            t2 *= t2;
            const g = SimplexNoise.grad3[gi2];
            n2 = t2 * t2 * (g[0]*x2 + g[1]*y2);
        }

        return 70 * (n0 + n1 + n2);
    }

    getTerrainHeight(x, z, base_height) {
        let h = base_height; // base sea level shift

        const n1 = this.simplex2(x * 0.003, z * 0.003);
        const n2 = this.simplex2(x * 0.01,  z * 0.01);
        const n3 = this.simplex2(x * 0.03,  z * 0.03);

        h += n1 * 20;
        h += n2 * 8;
        h += n3 * 2;

        return h;
    }
}

export class NoiseImage {
    constructor(pixels, width, height) {
        this.pixels = pixels;
        this.width = width;
        this.height = height;
    }

    getTerrainHeight(x, z, base_height) {
        const px = Math.floor(x);
        const pz = Math.floor(z);

        const idx = (pz * this.width + px) * 4;

        const r = this.pixels[idx];
        const g = this.pixels[idx + 1];
        const b = this.pixels[idx + 2];

        const brightness = (r + g + b) / 3;
        const normalized = brightness / 255;

        return base_height + normalized * 30;
    }
}
