import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

export function randomPoint(radius) {
	const a = Math.random() * Math.PI * 2;
	const r = Math.sqrt(Math.random()) * radius;
	return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}

export function buildPlayer() {
	const g = new THREE.Group();
	const furMat = new THREE.MeshStandardMaterial({ color: 0xa45a22, roughness: 0.86 });
	const furDarkMat = new THREE.MeshStandardMaterial({ color: 0x7e3f19, roughness: 0.9 });
	const bellyMat = new THREE.MeshStandardMaterial({ color: 0xe0b47b, roughness: 0.84 });
	const overallMat = new THREE.MeshStandardMaterial({ color: 0x2da042, roughness: 0.72 });
	const overallDarkMat = new THREE.MeshStandardMaterial({ color: 0x1f7a31, roughness: 0.76 });
	const celloMat = new THREE.MeshStandardMaterial({ color: 0xb96e2f, roughness: 0.62, metalness: 0.08 });

	const body = new THREE.Mesh(new THREE.SphereGeometry(1.18, 18, 16), furMat);
	body.scale.set(1.0, 1.2, 0.9);
	body.position.y = 1.35;
	g.add(body);

	const belly = new THREE.Mesh(new THREE.SphereGeometry(0.72, 14, 12), bellyMat);
	belly.scale.set(1, 1.12, 0.72);
	belly.position.set(0, 1.22, 0.54);
	g.add(belly);

	const head = new THREE.Mesh(new THREE.SphereGeometry(0.86, 18, 16), furMat);
	head.position.set(0, 2.36, 0.62);
	g.add(head);

	const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), bellyMat);
	muzzle.scale.set(1.2, 0.88, 0.96);
	muzzle.position.set(0, 2.2, 1.22);
	g.add(muzzle);

	const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), furDarkMat);
	nose.scale.set(1.4, 1, 1);
	nose.position.set(0, 2.25, 1.56);
	g.add(nose);

	const smile = new THREE.Mesh(
		new THREE.TorusGeometry(0.2, 0.028, 8, 18, Math.PI),
		new THREE.MeshStandardMaterial({ color: 0x5e2c16, roughness: 0.6 })
	);
	smile.position.set(0, 2.06, 1.45);
	smile.rotation.z = Math.PI;
	g.add(smile);

	const earOuterL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), furMat);
	const earOuterR = earOuterL.clone();
	earOuterL.position.set(-0.5, 3.02, 0.34);
	earOuterR.position.set(0.5, 3.02, 0.34);
	g.add(earOuterL, earOuterR);

	const earInnerL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), bellyMat);
	const earInnerR = earInnerL.clone();
	earInnerL.position.set(-0.5, 3.0, 0.43);
	earInnerR.position.set(0.5, 3.0, 0.43);
	g.add(earInnerL, earInnerR);

	const eyeWhiteL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }));
	const eyeWhiteR = eyeWhiteL.clone();
	eyeWhiteL.position.set(-0.24, 2.42, 1.34);
	eyeWhiteR.position.set(0.24, 2.42, 1.34);
	g.add(eyeWhiteL, eyeWhiteR);

	const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), new THREE.MeshStandardMaterial({ color: 0x1d160f, roughness: 0.25 }));
	const pupilR = pupilL.clone();
	pupilL.position.set(-0.24, 2.4, 1.43);
	pupilR.position.set(0.24, 2.4, 1.43);
	g.add(pupilL, pupilR);

	const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.95, 6, 10), furMat);
	const armR = armL.clone();
	armL.position.set(-0.97, 1.34, 0.34);
	armR.position.set(0.97, 1.34, 0.34);
	armL.rotation.z = -0.42;
	armR.rotation.z = 0.42;
	g.add(armL, armR);

	const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.68, 6, 10), furMat);
	const legR = legL.clone();
	legL.position.set(-0.42, 0.4, 0.08);
	legR.position.set(0.42, 0.4, 0.08);
	g.add(legL, legR);

	const footL = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 10), furDarkMat);
	const footR = footL.clone();
	footL.scale.set(1.1, 0.7, 1.45);
	footR.scale.set(1.1, 0.7, 1.45);
	footL.position.set(-0.42, 0.03, 0.32);
	footR.position.set(0.42, 0.03, 0.32);
	g.add(footL, footR);

	const shorts = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.76, 1.16), overallMat);
	shorts.position.set(0, 0.7, 0.02);
	g.add(shorts);

	const bib = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.74, 0.2), overallMat);
	bib.position.set(0, 1.24, 0.58);
	g.add(bib);

	const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.94, 0.14), overallDarkMat);
	const strapR = strapL.clone();
	strapL.position.set(-0.33, 1.4, 0.48);
	strapR.position.set(0.33, 1.4, 0.48);
	strapL.rotation.x = 0.22;
	strapR.rotation.x = 0.22;
	g.add(strapL, strapR);

	const buckleL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.06), new THREE.MeshStandardMaterial({ color: 0xf1d67c, metalness: 0.42, roughness: 0.35 }));
	const buckleR = buckleL.clone();
	buckleL.position.set(-0.33, 1.02, 0.66);
	buckleR.position.set(0.33, 1.02, 0.66);
	g.add(buckleL, buckleR);

	const celloBody = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 1.26, 18), celloMat);
	celloBody.position.set(0.84, 1.38, -0.36);
	celloBody.rotation.z = -0.34;
	celloBody.rotation.x = 0.22;
	g.add(celloBody);

	const celloNeck = new THREE.Mesh(
		new THREE.CapsuleGeometry(0.065, 0.78, 4, 8),
		new THREE.MeshStandardMaterial({ color: 0x7a4a24, roughness: 0.7 })
	);
	celloNeck.position.set(1.02, 2.16, -0.44);
	celloNeck.rotation.z = -0.4;
	g.add(celloNeck);

	const birdBody = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshStandardMaterial({ color: 0x2bb8ff, roughness: 0.62 }));
	birdBody.position.set(0.76, 2.16, 0.84);
	g.add(birdBody);

	const birdHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshStandardMaterial({ color: 0x2bb8ff, roughness: 0.62 }));
	birdHead.position.set(0.85, 2.24, 0.94);
	g.add(birdHead);

	const birdBeak = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0xf2b63d, roughness: 0.58 }));
	birdBeak.position.set(0.96, 2.22, 0.95);
	birdBeak.rotation.z = -Math.PI / 2;
	g.add(birdBeak);

	g.traverse((obj) => {
		if (obj.isMesh) {
			obj.castShadow = true;
			obj.receiveShadow = true;
		}
	});

	return g;
}

export function buildNote() {
	const g = new THREE.Group();
	const mat = new THREE.MeshStandardMaterial({ color: 0xffde4f, emissive: 0x4c3a00, roughness: 0.33, metalness: 0.35 });
	const orb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 12), mat);
	orb.position.set(0, 0.5, 0);
	g.add(orb);
	const stem = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.3, 0.18), mat);
	stem.position.set(0.28, 1.05, 0);
	g.add(stem);
	const flag = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 0.22), mat);
	flag.position.set(0.63, 1.58, 0);
	g.add(flag);
	g.traverse((obj) => { if (obj.isMesh) obj.castShadow = true; });
	return g;
}

export function buildJigToken() {
	const g = new THREE.Group();
	const mat = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0x4f2200, roughness: 0.35, metalness: 0.45 });
	for (let i = 0; i < 6; i += 1) {
		const ray = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.14), mat);
		ray.rotation.z = (i / 6) * Math.PI * 2;
		g.add(ray);
	}
	const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), mat);
	g.add(core);
	g.scale.set(1.35, 1.35, 1.35);
	g.traverse((obj) => { if (obj.isMesh) obj.castShadow = true; });
	return g;
}

export function buildEnemy() {
	const g = new THREE.Group();
	const shell = new THREE.Mesh(
		new THREE.SphereGeometry(0.95, 16, 12),
		new THREE.MeshStandardMaterial({ color: 0xc53f44, roughness: 0.62 })
	);
	shell.scale.y = 0.64;
	shell.position.y = 0.62;
	g.add(shell);
	const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), new THREE.MeshStandardMaterial({ color: 0xf4b1a5 }));
	const eyeR = eyeL.clone();
	eyeL.position.set(-0.35, 1.0, 0.52);
	eyeR.position.set(0.35, 1.0, 0.52);
	g.add(eyeL, eyeR);
	g.traverse((obj) => { if (obj.isMesh) obj.castShadow = true; });
	return g;
}

export function buildWitchCaster() {
	const g = new THREE.Group();
	const robe = new THREE.Mesh(
		new THREE.ConeGeometry(0.9, 2.4, 12),
		new THREE.MeshStandardMaterial({ color: 0x3563d4, roughness: 0.55, emissive: 0x061a4c, emissiveIntensity: 0.6 })
	);
	robe.position.y = 1.1;
	g.add(robe);
	const face = new THREE.Mesh(
		new THREE.SphereGeometry(0.38, 12, 10),
		new THREE.MeshStandardMaterial({ color: 0x8ec3ff, roughness: 0.78 })
	);
	face.position.y = 2.28;
	g.add(face);
	const hat = new THREE.Mesh(
		new THREE.ConeGeometry(0.52, 1.3, 12),
		new THREE.MeshStandardMaterial({ color: 0x1d3ea2, roughness: 0.5, emissive: 0x08183f })
	);
	hat.position.y = 3.02;
	g.add(hat);
	const aura = new THREE.Mesh(
		new THREE.RingGeometry(0.8, 1.05, 24),
		new THREE.MeshBasicMaterial({ color: 0x5bc6ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
	);
	aura.rotation.x = -Math.PI / 2;
	aura.position.y = 0.34;
	g.add(aura);
	g.traverse((obj) => { if (obj.isMesh) obj.castShadow = true; });
	return g;
}
