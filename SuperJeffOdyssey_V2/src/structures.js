import { game, engine } from './globals.js';

// Themed structures and decorations for each kingdom
export function generateCapStructures(rng, width, depth) {
    const structures = [];
    const randomInRange = (min, max) => min + rng() * (max - min);

    // Top hats scattered around
    for (let i = 0; i < 8; i++) {
        structures.push({
            type: 'tophat',
            x: randomInRange(-width * 0.3, width * 0.3),
            z: randomInRange(-depth * 0.3, depth * 0.3),
            size: randomInRange(3, 6),
            color: [0.1, 0.1, 0.1]
        });
    }

    // Hat shop structure
    structures.push({
        type: 'building',
        x: randomInRange(-20, 20),
        z: randomInRange(-20, 20),
        width: 12,
        height: 8,
        depth: 10,
        color: [0.4, 0.5, 0.8]
    });

    return structures;
}

export function generateCascadeStructures(rng, width, depth) {
    const structures = [];
    const randomInRange = (min, max) => min + rng() * (max - min);

    // Boulder formations
    for (let i = 0; i < 12; i++) {
        structures.push({
            type: 'boulder',
            x: randomInRange(-width * 0.35, width * 0.35),
            z: randomInRange(-depth * 0.35, depth * 0.35),
            radius: randomInRange(2, 5),
            color: [0.35, 0.35, 0.35]
        });
    }

    // Ancient pillars
    for (let i = 0; i < 6; i++) {
        structures.push({
            type: 'pillar',
            x: randomInRange(-width * 0.25, width * 0.25),
            z: randomInRange(-depth * 0.25, depth * 0.25),
            height: randomInRange(8, 15),
            radius: randomInRange(1.5, 2.5),
            color: [0.5, 0.45, 0.4]
        });
    }

    return structures;
}

export function generateSandStructures(rng, width, depth) {
    const structures = [];
    const randomInRange = (min, max) => min + rng() * (max - min);

    // Main pyramid
    structures.push({
        type: 'pyramid',
        x: 0,
        z: -15,
        size: 25,
        height: 20,
        color: [0.85, 0.75, 0.5],
        hasInterior: true,
        entranceY: 2
    });

    // Palm trees
    for (let i = 0; i < 10; i++) {
        structures.push({
            type: 'palm',
            x: randomInRange(-width * 0.35, width * 0.35),
            z: randomInRange(-depth * 0.35, depth * 0.35),
            height: randomInRange(6, 10),
            color: [0.3, 0.5, 0.2]
        });
    }

    // Sand dunes
    for (let i = 0; i < 8; i++) {
        structures.push({
            type: 'dune',
            x: randomInRange(-width * 0.4, width * 0.4),
            z: randomInRange(-depth * 0.4, depth * 0.4),
            width: randomInRange(8, 15),
            height: randomInRange(3, 6),
            depth: randomInRange(8, 15),
            color: [0.9, 0.8, 0.6]
        });
    }

    return structures;
}

export function createPyramidInterior() {
    const platforms = [];
    const moons = [];

    // Floor
    platforms.push({ x: 0, y: -1, z: 0, width: 40, height: 1, depth: 40, color: [0.7, 0.6, 0.4] });

    // Interior platforms at different heights
    for (let i = 0; i < 4; i++) {
        const y = i * 5 + 3;
        const size = 8 - i * 1.5;
        platforms.push({ x: 0, y, z: 0, width: size, height: 0.8, depth: size, color: [0.75, 0.65, 0.45] });
        
        // Moon at top
        if (i === 3) moons.push({ x: 0, y: y + 2, z: 0 });
    }

    // Side ledges
    [[-12, 2, 0], [12, 2, 0], [0, 2, -12], [0, 2, 12]].forEach(([x, y, z]) => {
        platforms.push({ x, y, z, width: 6, height: 0.6, depth: 6, color: [0.8, 0.7, 0.5] });
    });

    return { platforms, moons, spawnPoint: { x: 0, y: 1, z: 15 } };
}

export function drawStructures() {
    if (!game.structures) return;
        
    const getHeight = (x, z) => {
        if (game.sampleTerrainHeight) {
            const h = game.sampleTerrainHeight(x, z, Infinity);
            if (h !== null) return h;
        }
        const ix = Math.round(x / (game.gridSize || 1));
        const iz = Math.round(z / (game.gridSize || 1));
        return game.heightMap ? (game.heightMap[`${ix},${iz}`] ?? 0) : 0;
    };
        
    game.structures.forEach(structure => {
        const { type, x, z } = structure;
        const groundY = getHeight(x, z);
            
        if (type === 'tophat') {
            // Draw top hat as cylinder with rim
            const h = structure.size || 4;
            const r = structure.size * 0.4 || 1.5;
            engine.drawCylinder(x, groundY + h/2, z, r, h, {x: structure.color[0], y: structure.color[1], z: structure.color[2]});
            // Rim
            engine.drawCylinder(x, groundY + 0.3, z, r * 1.6, 0.6, {x: structure.color[0], y: structure.color[1], z: structure.color[2]});
        } else if (type === 'building') {
            // Draw as cube
            const { width, height, depth, color } = structure;
            engine.drawCube(x, groundY + height/2, z, width, height, depth, {x: structure.color[0], y: structure.color[1], z: structure.color[2]});
        } else if (type === 'boulder') {
            // Draw as sphere
            const r = structure.size || 3;
            engine.drawSphere(x, groundY + r, z, r, {x: structure.color[0], y: structure.color[1], z: structure.color[2]});
        } else if (type === 'pillar') {
            // Draw as tall thin cylinder
            const { height, radius, color } = structure;
            engine.drawCylinder(x, groundY + height/2, z, radius || 1, height || 8, {x: structure.color[0], y: structure.color[1], z: structure.color[2]});
        } else if (type === 'pyramid') {
            // Draw as cube for now (pyramids would need custom geometry)
            const { size, height, color } = structure;
            engine.drawCube(x, groundY + height/2, z, size, height, size, {x: structure.color[0], y: structure.color[1], z: structure.color[2]});
        } else if (type === 'palm') {
            // trunk
            const h = structure.height || 6;
            engine.drawCylinder(x, groundY + h/2, z, 0.4, h, {x: 0.4, y: 0.3, z: 0.2});
            // leaves  
            engine.drawSphere(x, groundY + h + 1, z, 2, {x: 0.2, y: 0.6, z: 0.3});
        } else if (type === 'dune') {
            // Draw as flattened sphere
            const r = structure.size || 4;
            engine.drawSphere(x, groundY + r * 0.3, z, r, {x: structure.color[0], y: structure.color[1], z: structure.color[2]});
        } else if (type === 'entrance') {
            // simple glowing archway
            engine.drawCube(x, groundY + 2, z, structure.width || 4, structure.height || 4, structure.depth || 2, {x: structure.color[0], y: structure.color[1], z: structure.color[2]});
        } else if (type === 'cave') {
            engine.drawCube(x, groundY + (structure.height||6)/2, z, structure.width || 10, structure.height || 6, structure.depth || 6, {x: structure.color[0], y: structure.color[1], z: structure.color[2]});
        }
    });
}
