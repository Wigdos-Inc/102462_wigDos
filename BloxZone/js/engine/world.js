export function createRobloxLikeWorld() {
    const blocks = [];

    // Under-layer so the player can never fall into empty space.
    blocks.push(makeBlock(0, -4, 0, 260, 8, 260, '#9f7c56', false));

    // Classic colorful studded floor look using flat tiled texture-style blocks.
    const tilePalette = ['#e23d3d', '#f2d53c', '#2f8ce0', '#43ad58'];
    const tileSize = 4;
    const half = 20;

    for (let gx = -half; gx <= half; gx += 1) {
        for (let gz = -half; gz <= half; gz += 1) {
            const pick = (gx * 17 + gz * 23 + 101) & 3;
            const color = tilePalette[pick];

            const x = gx * tileSize;
            const z = gz * tileSize;
            blocks.push(makeBlock(x, 0, z, tileSize, 1.2, tileSize, color));
        }
    }

    // Thin plate seams to imitate baseplate texture grid (no raised studs).
    for (let i = -half; i <= half; i += 1) {
        const pos = i * tileSize;
        blocks.push(makeBlock(pos, 0.62, 0, 0.12, 0.04, tileSize * (half * 2 + 1), '#a38761', false));
        blocks.push(makeBlock(0, 0.62, pos, tileSize * (half * 2 + 1), 0.04, 0.12, '#a38761', false));
    }

    // Spawn plate.
    blocks.push(makeBlock(0, 1.05, 0, 11, 0.7, 11, '#d5dbe2'));

    // Stage in front, inspired by the screenshot composition.
    blocks.push(makeBlock(0, 2.1, 45, 26, 2.2, 10, '#2a2f39'));
    blocks.push(makeBlock(0, 3.8, 43, 18, 1.3, 2.5, '#f0c338'));
    blocks.push(makeBlock(-12, 5.1, 43, 2.2, 5, 2.2, '#b8bfc9'));
    blocks.push(makeBlock(12, 5.1, 43, 2.2, 5, 2.2, '#b8bfc9'));
    blocks.push(makeBlock(0, 7.2, 43, 19, 0.9, 1.8, '#b8bfc9'));
    blocks.push(makeBlock(0, 8.5, 43, 9.5, 1.9, 1.2, '#d64545'));

    // Simple obby lane at the side.
    for (let i = 0; i < 12; i += 1) {
        const y = 1.2 + ((i + 1) % 2) * 1.2;
        const color = i % 2 ? '#ffc933' : '#ff8b3d';
        blocks.push(makeBlock(-62 + i * 7, y, -36, 4.2, 2.2, 4.2, color));
    }

    // Decorative towers for skyline variety.
    const towerColors = ['#ff595e', '#5bc0eb', '#ffca3a', '#8ac926'];
    for (let i = 0; i < towerColors.length; i += 1) {
        const x = -44 + i * 30;
        const h = 10 + i * 3;
        blocks.push(makeBlock(x, h * 0.5, 78, 9, h, 9, towerColors[i]));
    }

    return blocks;
}

function makeBlock(x, y, z, w, h, d, color, solid = true) {
    return {
        center: { x, y, z },
        size: { x: w, y: h, z: d },
        color,
        solid
    };
}
