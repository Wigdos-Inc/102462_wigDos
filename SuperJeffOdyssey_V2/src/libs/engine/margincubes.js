import { engine as defaultRenderer, getTextureBuffer } from './../../globals.js';

const FACE_NEIGHBORS = [
	[1, 0, 0],
	[-1, 0, 0],
	[0, 1, 0],
	[0, -1, 0],
	[0, 0, 1],
	[0, 0, -1]
];

const DEFAULT_COLOR = { x: 0.62, y: 0.62, z: 0.62 };

function clampInt(value, min, max) {
	const v = Math.floor(value);
	return Math.max(min, Math.min(max, v));
}

function normalizeVec3(v) {
	const x = v?.x ?? 0;
	const y = v?.y ?? 0;
	const z = v?.z ?? 0;
	const len = Math.sqrt((x * x) + (y * y) + (z * z));
	if (len <= 1e-8) return { x: 0, y: 0, z: 1 };
	return { x: x / len, y: y / len, z: z / len };
}

function toColorVec3(color, fallback = DEFAULT_COLOR) {
	if (!color) return fallback;
	if (Array.isArray(color)) {
		return {
			x: Number.isFinite(color[0]) ? color[0] : fallback.x,
			y: Number.isFinite(color[1]) ? color[1] : fallback.y,
			z: Number.isFinite(color[2]) ? color[2] : fallback.z
		};
	}
	return {
		x: Number.isFinite(color.x) ? color.x : fallback.x,
		y: Number.isFinite(color.y) ? color.y : fallback.y,
		z: Number.isFinite(color.z) ? color.z : fallback.z
	};
}

export class MarginCubeWorld {
	constructor(options = {}) {
		this.width = Math.max(1, Math.floor(options.width ?? 32));
		this.height = Math.max(1, Math.floor(options.height ?? 32));
		this.depth = Math.max(1, Math.floor(options.depth ?? 32));

		this.cubeSize = Number.isFinite(options.cubeSize) ? Math.max(0.01, options.cubeSize) : 1;
		this.origin = {
			x: Number.isFinite(options.origin?.x) ? options.origin.x : 0,
			y: Number.isFinite(options.origin?.y) ? options.origin.y : 0,
			z: Number.isFinite(options.origin?.z) ? options.origin.z : 0
		};

		this._volume = this.width * this.height * this.depth;
		this._solid = new Uint8Array(this._volume);
		this._material = new Uint16Array(this._volume);
		this._isMargin = new Uint8Array(this._volume);
		this._marginIndices = new Set();
		this._marginCache = [];
		this._cacheDirty = true;

		if (options.defaultSolid) {
			const defaultMaterial = Number.isFinite(options.defaultMaterial) ? options.defaultMaterial : 1;
			this.fill(true, defaultMaterial);
		}
	}

	get volume() {
		return this._volume;
	}

	inBounds(x, y, z) {
		return x >= 0 && y >= 0 && z >= 0 && x < this.width && y < this.height && z < this.depth;
	}

	index(x, y, z) {
		return x + (y * this.width) + (z * this.width * this.height);
	}

	coordsFromIndex(index) {
		const layer = this.width * this.height;
		const z = Math.floor(index / layer);
		const inLayer = index - (z * layer);
		const y = Math.floor(inLayer / this.width);
		const x = inLayer - (y * this.width);
		return { x, y, z };
	}

	gridToWorld(x, y, z) {
		return {
			x: this.origin.x + ((x + 0.5) * this.cubeSize),
			y: this.origin.y + ((y + 0.5) * this.cubeSize),
			z: this.origin.z + ((z + 0.5) * this.cubeSize)
		};
	}

	worldToGrid(x, y, z) {
		return {
			x: Math.floor((x - this.origin.x) / this.cubeSize),
			y: Math.floor((y - this.origin.y) / this.cubeSize),
			z: Math.floor((z - this.origin.z) / this.cubeSize)
		};
	}

	isSolid(x, y, z) {
		if (!this.inBounds(x, y, z)) return false;
		return this._solid[this.index(x, y, z)] === 1;
	}

	getMaterial(x, y, z) {
		if (!this.inBounds(x, y, z)) return 0;
		return this._material[this.index(x, y, z)];
	}

	_setVoxelRaw(x, y, z, solid, material = 1) {
		const idx = this.index(x, y, z);
		const solidVal = solid ? 1 : 0;
		const matVal = solid ? Math.max(1, Math.floor(material)) : 0;

		if (this._solid[idx] === solidVal && this._material[idx] === matVal) {
			return false;
		}

		this._solid[idx] = solidVal;
		this._material[idx] = matVal;
		return true;
	}

	setVoxel(x, y, z, solid = true, material = 1) {
		if (!this.inBounds(x, y, z)) return false;
		const changed = this._setVoxelRaw(x, y, z, solid, material);
		if (!changed) return false;

		this._updateMarginAround(x, y, z);
		this._cacheDirty = true;
		return true;
	}

	fill(solid = true, material = 1) {
		const solidVal = solid ? 1 : 0;
		const matVal = solid ? Math.max(1, Math.floor(material)) : 0;

		this._solid.fill(solidVal);
		this._material.fill(matVal);
		this.rebuildMargin();
	}

	clear() {
		this.fill(false, 0);
	}

	fillBox(minX, minY, minZ, maxX, maxY, maxZ, solid = true, material = 1) {
		const x0 = clampInt(Math.min(minX, maxX), 0, this.width - 1);
		const y0 = clampInt(Math.min(minY, maxY), 0, this.height - 1);
		const z0 = clampInt(Math.min(minZ, maxZ), 0, this.depth - 1);
		const x1 = clampInt(Math.max(minX, maxX), 0, this.width - 1);
		const y1 = clampInt(Math.max(minY, maxY), 0, this.height - 1);
		const z1 = clampInt(Math.max(minZ, maxZ), 0, this.depth - 1);

		let changed = false;
		for (let z = z0; z <= z1; z++) {
			for (let y = y0; y <= y1; y++) {
				for (let x = x0; x <= x1; x++) {
					changed = this._setVoxelRaw(x, y, z, solid, material) || changed;
				}
			}
		}

		if (changed) this.rebuildMargin();
		return changed;
	}

	generateFromHeight(heightFn, options = {}) {
		const clampToHeight = options.clampToHeight !== false;
		const materialFn = typeof options.materialFn === 'function' ? options.materialFn : null;
		const defaultMaterial = Number.isFinite(options.defaultMaterial) ? options.defaultMaterial : 1;

		this.clear();

		for (let z = 0; z < this.depth; z++) {
			for (let x = 0; x < this.width; x++) {
				const hRaw = heightFn(x, z, this);
				if (!Number.isFinite(hRaw)) continue;
				const h = clampToHeight ? clampInt(hRaw, 0, this.height - 1) : Math.floor(hRaw);

				for (let y = 0; y <= h && y < this.height; y++) {
					if (y < 0) continue;
					const mat = materialFn ? materialFn(x, y, z, this) : defaultMaterial;
					this._setVoxelRaw(x, y, z, true, mat);
				}
			}
		}

		this.rebuildMargin();
	}

	generateFromDensity(densityFn, isoLevel = 0, options = {}) {
		const materialFn = typeof options.materialFn === 'function' ? options.materialFn : null;
		const defaultMaterial = Number.isFinite(options.defaultMaterial) ? options.defaultMaterial : 1;

		this.clear();

		for (let z = 0; z < this.depth; z++) {
			for (let y = 0; y < this.height; y++) {
				for (let x = 0; x < this.width; x++) {
					const density = densityFn(x, y, z, this);
					if (!Number.isFinite(density) || density < isoLevel) continue;
					const mat = materialFn ? materialFn(x, y, z, density, this) : defaultMaterial;
					this._setVoxelRaw(x, y, z, true, mat);
				}
			}
		}

		this.rebuildMargin();
	}

	_forEachVoxelInSphere(center, radius, callback) {
		const g = this.worldToGrid(center.x, center.y, center.z);
		const rGrid = Math.ceil(radius / this.cubeSize);
		const rSq = radius * radius;

		const minX = Math.max(0, g.x - rGrid);
		const maxX = Math.min(this.width - 1, g.x + rGrid);
		const minY = Math.max(0, g.y - rGrid);
		const maxY = Math.min(this.height - 1, g.y + rGrid);
		const minZ = Math.max(0, g.z - rGrid);
		const maxZ = Math.min(this.depth - 1, g.z + rGrid);

		for (let z = minZ; z <= maxZ; z++) {
			for (let y = minY; y <= maxY; y++) {
				for (let x = minX; x <= maxX; x++) {
					const p = this.gridToWorld(x, y, z);
					const dx = p.x - center.x;
					const dy = p.y - center.y;
					const dz = p.z - center.z;
					if ((dx * dx) + (dy * dy) + (dz * dz) <= rSq) {
						callback(x, y, z);
					}
				}
			}
		}
	}

	paintSphere(center, radius, solid = true, material = 1) {
		let changed = false;
		this._forEachVoxelInSphere(center, radius, (x, y, z) => {
			changed = this._setVoxelRaw(x, y, z, solid, material) || changed;
		});
		if (changed) this.rebuildMargin();
		return changed;
	}

	carveSphere(center, radius) {
		return this.paintSphere(center, radius, false, 0);
	}

	applyExplosion(center, radius) {
		return this.carveSphere(center, radius);
	}

	hasExposedNeighbor(x, y, z) {
		if (!this.isSolid(x, y, z)) return false;

		for (let i = 0; i < FACE_NEIGHBORS.length; i++) {
			const n = FACE_NEIGHBORS[i];
			const nx = x + n[0];
			const ny = y + n[1];
			const nz = z + n[2];

			if (!this.inBounds(nx, ny, nz)) return true;
			if (!this.isSolid(nx, ny, nz)) return true;
		}

		return false;
	}

	_setMarginState(x, y, z, isMargin) {
		if (!this.inBounds(x, y, z)) return;
		const idx = this.index(x, y, z);
		const nextState = isMargin ? 1 : 0;
		if (this._isMargin[idx] === nextState) return;

		this._isMargin[idx] = nextState;
		if (nextState === 1) this._marginIndices.add(idx);
		else this._marginIndices.delete(idx);
	}

	_updateMarginAt(x, y, z) {
		if (!this.inBounds(x, y, z)) return;
		const isMargin = this.hasExposedNeighbor(x, y, z);
		this._setMarginState(x, y, z, isMargin);
	}

	_updateMarginAround(x, y, z) {
		this._updateMarginAt(x, y, z);
		for (let i = 0; i < FACE_NEIGHBORS.length; i++) {
			const n = FACE_NEIGHBORS[i];
			this._updateMarginAt(x + n[0], y + n[1], z + n[2]);
		}
	}

	rebuildMargin() {
		this._marginIndices.clear();
		this._isMargin.fill(0);

		for (let z = 0; z < this.depth; z++) {
			for (let y = 0; y < this.height; y++) {
				for (let x = 0; x < this.width; x++) {
					if (!this.isSolid(x, y, z)) continue;
					if (this.hasExposedNeighbor(x, y, z)) {
						this._setMarginState(x, y, z, true);
					}
				}
			}
		}

		this._cacheDirty = true;
	}

	getMarginCubes(forceRebuild = false) {
		if (forceRebuild) this.rebuildMargin();
		if (!this._cacheDirty) return this._marginCache;

		const out = [];
		this._marginIndices.forEach((idx) => {
			const g = this.coordsFromIndex(idx);
			const p = this.gridToWorld(g.x, g.y, g.z);
			out.push({
				index: idx,
				gridX: g.x,
				gridY: g.y,
				gridZ: g.z,
				x: p.x,
				y: p.y,
				z: p.z,
				material: this._material[idx],
				size: this.cubeSize
			});
		});

		this._marginCache = out;
		this._cacheDirty = false;
		return out;
	}

	raycast(origin, direction, maxDistance = 256, step = null) {
		const dir = normalizeVec3(direction);
		const dt = Number.isFinite(step) ? Math.max(0.01, step) : Math.max(0.1, this.cubeSize * 0.35);
		const maxT = Math.max(0, maxDistance);

		for (let t = 0; t <= maxT; t += dt) {
			const px = origin.x + (dir.x * t);
			const py = origin.y + (dir.y * t);
			const pz = origin.z + (dir.z * t);
			const g = this.worldToGrid(px, py, pz);

			if (!this.inBounds(g.x, g.y, g.z)) continue;
			if (!this.isSolid(g.x, g.y, g.z)) continue;

			const c = this.gridToWorld(g.x, g.y, g.z);
			return {
				hit: true,
				distance: t,
				position: { x: px, y: py, z: pz },
				cellCenter: c,
				grid: g,
				material: this.getMaterial(g.x, g.y, g.z)
			};
		}

		return { hit: false };
	}

	removeAtRay(origin, direction, maxDistance = 256, step = null) {
		const hit = this.raycast(origin, direction, maxDistance, step);
		if (!hit.hit) return false;
		return this.setVoxel(hit.grid.x, hit.grid.y, hit.grid.z, false, 0);
	}

	render(options = {}) {
		const renderer = options.renderer || defaultRenderer;
		if (!renderer || typeof renderer.drawCube !== 'function') return 0;

		const cubes = this.getMarginCubes(!!options.rebuildMargin);
		const colorForMaterial = typeof options.colorForMaterial === 'function' ? options.colorForMaterial : null;
		const defaultColor = toColorVec3(options.defaultColor, DEFAULT_COLOR);
		const inflate = Number.isFinite(options.inflate) ? options.inflate : 0;
		const cubeExtent = this.cubeSize + inflate;

		const useTextures =
			options.useTextures === true &&
			typeof renderer.drawTexCube === 'function' &&
			typeof options.materialToTexture === 'function';

		for (let i = 0; i < cubes.length; i++) {
			const cube = cubes[i];
			const color = toColorVec3(colorForMaterial ? colorForMaterial(cube.material, cube, this) : null, defaultColor);

			if (useTextures) {
				let texture = options.materialToTexture(cube.material, cube, this);
				if (typeof texture === 'string') texture = getTextureBuffer(texture);

				if (texture) {
					renderer.drawTexCube(cube.x, cube.y, cube.z, cubeExtent, cubeExtent, cubeExtent, color, true, texture);
					continue;
				}
			}

			renderer.drawCube(cube.x, cube.y, cube.z, cubeExtent, cubeExtent, cubeExtent, color);
		}

		return cubes.length;
	}

	serialize() {
		const voxels = [];
		for (let z = 0; z < this.depth; z++) {
			for (let y = 0; y < this.height; y++) {
				for (let x = 0; x < this.width; x++) {
					if (!this.isSolid(x, y, z)) continue;
					voxels.push({ x, y, z, material: this.getMaterial(x, y, z) });
				}
			}
		}

		return {
			width: this.width,
			height: this.height,
			depth: this.depth,
			cubeSize: this.cubeSize,
			origin: { ...this.origin },
			voxels
		};
	}

	static fromSerialized(data = {}) {
		const world = new MarginCubeWorld({
			width: data.width,
			height: data.height,
			depth: data.depth,
			cubeSize: data.cubeSize,
			origin: data.origin
		});

		if (Array.isArray(data.voxels)) {
			for (let i = 0; i < data.voxels.length; i++) {
				const v = data.voxels[i];
				world.setVoxel(v.x, v.y, v.z, true, v.material ?? 1);
			}
		}

		world.rebuildMargin();
		return world;
	}
}

export function createMarginCubeWorld(options = {}) {
	return new MarginCubeWorld(options);
}

export default MarginCubeWorld;
