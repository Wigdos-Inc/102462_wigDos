import character_models from "../assets/model/characters.json" with { type: "json" };

function createRingObstacles(options) {
    const count = options.count;
    const radius = options.radius;
    const zScale = options.zScale;
    const y = options.y;
    const dimensions = options.dimensions;
    const prefix = options.prefix;
    const color = options.color;

    const obstacles = [];
    for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius * zScale;

        obstacles.push({
            id: `${prefix}-${i}`,
            shape: "cube",
            position: { x: x, y: y, z: z },
            dimensions: dimensions,
            rotation: { x: 0, y: (-angle * 180) / Math.PI, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            texture: {
                generated: {
                    id: "default-grid",
                    color: color,
                    opacity: 1,
                },
                "custom": []
            },
            detail: {},
        });
    }

    return obstacles;
}

function buildSuperJeffCartLevelPayload(options) {
    const selectedCharacter = options && options.character ? options.character : "carl";

    const terrainObjects = [
        {
            id: "track-ground",
            shape: "cube",
            position: { x: 0, y: -2, z: 0 },
            dimensions: { x: 220, y: 2, z: 220 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            texture: {
                generated: {
                    id: "grass-soft",
                    color: { r: 0.21, g: 0.42, b: 0.17, a: 1 },
                    opacity: 1,
                },
                "custom": []
            },
            detail: {},
        },
        {
            id: "track-lane",
            shape: "cube",
            position: { x: 0, y: -0.9, z: 0 },
            dimensions: { x: 150, y: 0.2, z: 190 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            texture: {
                generated: {
                    id: "default-grid",
                    color: { r: 0.18, g: 0.18, b: 0.18, a: 1 },
                    opacity: 1,
                },
                "custom": []
            },
            detail: {},
        },
    ];

    const outerBarrier = createRingObstacles({
        count: 80,
        radius: 62,
        zScale: 1.3,
        y: 1,
        dimensions: { x: 3.5, y: 3, z: 2.2 },
        prefix: "outer-barrier",
        color: { r: 0.9, g: 0.15, b: 0.15, a: 1 },
    });

    const innerBarrier = createRingObstacles({
        count: 66,
        radius: 41,
        zScale: 1.15,
        y: 1,
        dimensions: { x: 3.5, y: 3, z: 2.2 },
        prefix: "inner-barrier",
        color: { r: 0.95, g: 0.95, b: 0.95, a: 1 },
    });

    return {
        id: "superjeffcart-classic",
        title: "Super Jeff Cart And Carl is here",
        world: {
            length: 220,
            width: 220,
            height: 80,
            deathBarrierY: -25,
            textureScale: 1,
            scatterScale: 1,
            waterLevel: null,
        },
        terrain: {
            objects: terrainObjects,
            triggers: [],
        },
        obstacles: [...outerBarrier, ...innerBarrier],
        entities: [],
        entityBlueprints: {
            enemies: [],
            npcs: [],
            collectibles: [],
            projectiles: [],
            entities: [],
        },
        camera: {
            levelOpening: {
                startPosition: { x: 0, y: 34, z: 92 },
                endPosition: { x: 0, y: 26, z: 72 },
            },
            distance: 10,
            heightOffset: 3,
            sensitivity: 0.12,
        },
        player: {
            character: 'chara',
            spawnPosition: { x: 51, y: 2, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            modelParts: character_models.jeff.model.parts
        },
        music: null,
        meta: {
            levelId: "superjeffcart",
            stageId: "classic-track",
        },
    };
}

export { buildSuperJeffCartLevelPayload };
