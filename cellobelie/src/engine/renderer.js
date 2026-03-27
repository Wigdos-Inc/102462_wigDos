import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

export function createRenderer(canvas, stage) {
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 500);
	camera.position.set(0, 15, 24);

	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	const hemi = new THREE.HemisphereLight(0xa4dcff, 0x1f3344, 0.85);
	scene.add(hemi);

	const sun = new THREE.DirectionalLight(0xffefcc, 1.2);
	sun.position.set(26, 36, 10);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	sun.shadow.camera.left = -70;
	sun.shadow.camera.right = 70;
	sun.shadow.camera.top = 70;
	sun.shadow.camera.bottom = -70;
	scene.add(sun);

	function resize() {
		const w = Math.max(320, Math.floor(stage.clientWidth));
		const h = Math.max(180, Math.floor(stage.clientHeight));
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	}

	window.addEventListener('resize', resize);
	resize();

	return { THREE, scene, camera, renderer, resize };
}
