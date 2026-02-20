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
