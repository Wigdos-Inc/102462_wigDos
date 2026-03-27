import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

function makeTree() {
	const g = new THREE.Group();
	const trunk = new THREE.Mesh(
		new THREE.CylinderGeometry(0.34, 0.42, 2.6, 8),
		new THREE.MeshStandardMaterial({ color: 0x5c3318, roughness: 0.95 })
	);
	trunk.position.y = 1.3;
	g.add(trunk);
	const top = new THREE.Mesh(
		new THREE.DodecahedronGeometry(1.1, 0),
		new THREE.MeshStandardMaterial({ color: 0x1db136, roughness: 0.82 })
	);
	top.position.y = 2.9;
	top.scale.y = 1.2;
	g.add(top);
	g.traverse((obj) => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
	return g;
}

function makeCliff(width, height, depth, x, z) {
	const cliff = new THREE.Mesh(
		new THREE.BoxGeometry(width, height, depth),
		new THREE.MeshStandardMaterial({ color: 0x987032, roughness: 0.96 })
	);
	cliff.position.set(x, height / 2 + 3, z);
	cliff.castShadow = true;
	cliff.receiveShadow = true;
	const moss = new THREE.Mesh(
		new THREE.BoxGeometry(width + 0.2, 0.32, depth + 0.2),
		new THREE.MeshStandardMaterial({ color: 0x1fb03f, roughness: 0.85 })
	);
	moss.position.set(x, height + 3.15, z);
	moss.castShadow = true;
	moss.receiveShadow = true;
	return { cliff, moss };
}

function addBridge(parent, position) {
	const bridge = new THREE.Group();
	for (let i = 0; i < 13; i += 1) {
		const plank = new THREE.Mesh(
			new THREE.BoxGeometry(0.9, 0.12, 1.1),
			new THREE.MeshStandardMaterial({ color: 0x6f3414, roughness: 0.88 })
		);
		plank.position.set(0, 6.55 - Math.sin((i / 12) * Math.PI) * 0.4, i * 1.05 - 6.2);
		plank.rotation.y = Math.sin(i * 0.7) * 0.04;
		bridge.add(plank);
	}
	const ropeL = new THREE.Mesh(
		new THREE.CapsuleGeometry(0.05, 12.7, 4, 8),
		new THREE.MeshStandardMaterial({ color: 0x602212, roughness: 0.8 })
	);
	const ropeR = ropeL.clone();
	ropeL.rotation.x = Math.PI / 2;
	ropeR.rotation.x = Math.PI / 2;
	ropeL.position.set(-0.62, 7.05, 0);
	ropeR.position.set(0.62, 7.05, 0);
	bridge.add(ropeL, ropeR);
	bridge.position.copy(position);
	bridge.rotation.y = -0.65;
	bridge.traverse((obj) => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
	parent.add(bridge);
}

function createLairCaveExterior() {
	const lair = new THREE.Group();

	const baseRock = new THREE.Mesh(
		new THREE.CylinderGeometry(9, 11.5, 13, 14),
		new THREE.MeshStandardMaterial({ color: 0x3f5129, roughness: 0.96 })
	);
	baseRock.position.y = 9.4;
	lair.add(baseRock);

	const caveMouth = new THREE.Mesh(
		new THREE.CylinderGeometry(3.2, 3.6, 2.2, 20, 1, true, 0, Math.PI),
		new THREE.MeshStandardMaterial({ color: 0x2b1a12, roughness: 0.95, side: THREE.DoubleSide })
	);
	caveMouth.position.set(3.4, 7.3, 3.3);
	caveMouth.rotation.y = -0.68;
	caveMouth.rotation.z = 0.03;
	lair.add(caveMouth);

	const eyeMat = new THREE.MeshStandardMaterial({ color: 0x4fff50, emissive: 0x1b8524, emissiveIntensity: 1.6, roughness: 0.45 });
	const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), eyeMat);
	const eyeR = eyeL.clone();
	eyeL.position.set(1.7, 9.2, 1.7);
	eyeR.position.set(4.5, 9.0, 2.7);
	eyeL.scale.set(1.1, 0.76, 0.9);
	eyeR.scale.set(1.1, 0.76, 0.9);
	lair.add(eyeL, eyeR);

	const mouthGlow = new THREE.Mesh(
		new THREE.CircleGeometry(2.1, 20),
		new THREE.MeshBasicMaterial({ color: 0xb52f2f, transparent: true, opacity: 0.7 })
	);
	mouthGlow.position.set(3.6, 6.8, 3.1);
	mouthGlow.rotation.y = -0.66;
	lair.add(mouthGlow);

	addBridge(lair, new THREE.Vector3(4.1, 0, 7.5));

	lair.traverse((obj) => {
		if (obj.isMesh) {
			obj.castShadow = true;
			obj.receiveShadow = true;
		}
	});

	return lair;
}

export function createHubScene() {
	const group = new THREE.Group();

	const floor = new THREE.Mesh(
		new THREE.CircleGeometry(45, 80),
		new THREE.MeshStandardMaterial({ color: 0x1a9a39, roughness: 0.92 })
	);
	floor.rotation.x = -Math.PI / 2;
	floor.position.y = 3;
	floor.receiveShadow = true;
	group.add(floor);

	const path = new THREE.Mesh(
		new THREE.RingGeometry(8, 16, 72, 1, Math.PI * 0.15, Math.PI * 1.15),
		new THREE.MeshStandardMaterial({ color: 0xc9b95b, roughness: 0.94, side: THREE.DoubleSide })
	);
	path.rotation.x = -Math.PI / 2;
	path.position.y = 3.03;
	group.add(path);

	const cliffDefs = [
		[16, 8, 10, -18, -8],
		[12, 10, 8, 16, -16],
		[14, 9, 12, 19, 7],
		[10, 7, 14, -20, 16],
		[9, 6, 8, 0, -24],
		[11, 8, 9, -3, 20]
	];
	cliffDefs.forEach((d) => {
		const { cliff, moss } = makeCliff(d[0], d[1], d[2], d[3], d[4]);
		group.add(cliff, moss);
	});

	for (let i = 0; i < 16; i += 1) {
		const tree = makeTree();
		const angle = (i / 16) * Math.PI * 2;
		const radius = 22 + Math.random() * 14;
		tree.position.set(Math.cos(angle) * radius, 3, Math.sin(angle) * radius);
		tree.scale.setScalar(0.9 + Math.random() * 0.5);
		group.add(tree);
	}

	const waterfall = new THREE.Mesh(
		new THREE.PlaneGeometry(4, 9),
		new THREE.MeshBasicMaterial({ color: 0x8ad8ff, transparent: true, opacity: 0.62 })
	);
	waterfall.position.set(-12, 8.4, 18.2);
	waterfall.rotation.y = -0.2;
	group.add(waterfall);

	const lairExterior = createLairCaveExterior();
	lairExterior.position.set(17, 0, 4);
	lairExterior.rotation.y = -0.3;
	group.add(lairExterior);

	const beachPortal = new THREE.Group();
	const portalBase = new THREE.Mesh(
		new THREE.CylinderGeometry(2.6, 3.0, 1.2, 20),
		new THREE.MeshStandardMaterial({ color: 0x7a4b1e, roughness: 0.83 })
	);
	portalBase.position.y = 3.6;
	beachPortal.add(portalBase);
	const portalRing = new THREE.Mesh(
		new THREE.TorusGeometry(1.8, 0.28, 12, 24),
		new THREE.MeshStandardMaterial({ color: 0x61cfff, emissive: 0x0d4e86, emissiveIntensity: 1.2, roughness: 0.38 })
	);
	portalRing.position.y = 4.6;
	portalRing.rotation.x = Math.PI / 2;
	beachPortal.add(portalRing);
	beachPortal.position.set(-5.5, 0, -8.5);
	group.add(beachPortal);

	const cliffPortal = new THREE.Group();
	const cliffBase = portalBase.clone();
	cliffPortal.add(cliffBase);
	const cliffRing = new THREE.Mesh(
		new THREE.TorusGeometry(1.8, 0.28, 12, 24),
		new THREE.MeshStandardMaterial({ color: 0x6b6b7a, emissive: 0x202030, emissiveIntensity: 0.5, roughness: 0.6 })
	);
	cliffRing.position.y = 4.6;
	cliffRing.rotation.x = Math.PI / 2;
	cliffPortal.add(cliffRing);
	cliffPortal.position.set(7.5, 0, -10.5);
	group.add(cliffPortal);

	return {
		group,
		bounds: 40,
		portalBeach: beachPortal,
		portalBeachRing: portalRing,
		portalCliff: cliffPortal,
		portalCliffRing: cliffRing
	};
}

export function createBeachScene() {
	const group = new THREE.Group();

	const sea = new THREE.Mesh(
		new THREE.CircleGeometry(120, 96),
		new THREE.MeshPhongMaterial({ color: 0x126fd2, shininess: 100, specular: 0x7cc7ff })
	);
	sea.rotation.x = -Math.PI / 2;
	sea.position.y = -2;
	group.add(sea);

	const island = new THREE.Mesh(
		new THREE.CylinderGeometry(29, 33, 6, 48),
		new THREE.MeshStandardMaterial({ color: 0xd9ab62, roughness: 0.9 })
	);
	island.position.y = 0;
	group.add(island);

	const top = new THREE.Mesh(
		new THREE.CircleGeometry(27.4, 48),
		new THREE.MeshStandardMaterial({ color: 0xe7cb8a, roughness: 0.86 })
	);
	top.rotation.x = -Math.PI / 2;
	top.position.y = 3.02;
	group.add(top);

	const exitPortal = new THREE.Mesh(
		new THREE.TorusGeometry(1.8, 0.25, 12, 24),
		new THREE.MeshStandardMaterial({ color: 0x77d6ff, emissive: 0x144f8a, emissiveIntensity: 1.1 })
	);
	exitPortal.position.set(0, 4.2, -14);
	exitPortal.rotation.x = Math.PI / 2;
	group.add(exitPortal);

	return { group, sea, bounds: 26, exitPortal };
}

export function createCliffScene() {
	const group = new THREE.Group();

	const floor = new THREE.Mesh(
		new THREE.CircleGeometry(34, 64),
		new THREE.MeshStandardMaterial({ color: 0x47613a, roughness: 0.9 })
	);
	floor.rotation.x = -Math.PI / 2;
	floor.position.y = 3;
	group.add(floor);

	const pit = new THREE.Mesh(
		new THREE.CylinderGeometry(8, 10, 4.4, 24),
		new THREE.MeshStandardMaterial({ color: 0x2f2622, roughness: 0.96 })
	);
	pit.position.set(0, 1.3, 0);
	group.add(pit);

	for (let i = 0; i < 18; i += 1) {
		const b = makeCliff(4 + Math.random() * 4, 4 + Math.random() * 9, 4 + Math.random() * 5,
			Math.cos(i * 0.35) * (13 + Math.random() * 10),
			Math.sin(i * 0.35) * (13 + Math.random() * 10));
		group.add(b.cliff, b.moss);
	}

	const exitPortal = new THREE.Mesh(
		new THREE.TorusGeometry(1.8, 0.25, 12, 24),
		new THREE.MeshStandardMaterial({ color: 0x9dd2ff, emissive: 0x1b5f9b, emissiveIntensity: 1.0 })
	);
	exitPortal.position.set(-11, 5.5, -11);
	exitPortal.rotation.x = Math.PI / 2;
	group.add(exitPortal);

	group.traverse((obj) => {
		if (obj.isMesh) {
			obj.castShadow = true;
			obj.receiveShadow = true;
		}
	});

	return { group, bounds: 29, exitPortal };
}
