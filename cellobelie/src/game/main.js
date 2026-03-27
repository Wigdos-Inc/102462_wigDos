import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';
import { createRenderer } from '../engine/renderer.js';
import { createInput } from '../engine/input.js';
import { buildEnemy, buildJigToken, buildNote, buildPlayer, buildWitchCaster, randomPoint } from './models.js';
import { createBeachScene, createCliffScene, createHubScene } from './worlds.js';

const canvas = document.getElementById('game');
const stage = document.querySelector('.stage');

const ui = {
	level: document.getElementById('levelChip').querySelector('strong'),
	objective: document.getElementById('objectiveChip').querySelector('strong'),
	score: document.getElementById('scoreChip').querySelector('strong'),
	health: document.getElementById('healthChip').querySelector('strong'),
	time: document.getElementById('timeChip').querySelector('strong'),
	startOverlay: document.getElementById('startOverlay'),
	endOverlay: document.getElementById('endOverlay'),
	pauseOverlay: document.getElementById('pauseOverlay'),
	pauseTotalsPanel: document.getElementById('pauseTotalsPanel'),
	endTitle: document.getElementById('endTitle'),
	endText: document.getElementById('endText'),
	restartBtn: document.getElementById('restartBtn'),
	pauseResumeBtn: document.getElementById('pauseResumeBtn'),
	pauseTotalsBtn: document.getElementById('pauseTotalsBtn'),
	pauseQuitBtn: document.getElementById('pauseQuitBtn'),
	pauseNotes: document.getElementById('pauseNotes'),
	pauseEnergy: document.getElementById('pauseEnergy'),
	pauseTime: document.getElementById('pauseTime'),
	pauseClears: document.getElementById('pauseClears'),
	pauseTotalNotes: document.getElementById('pauseTotalNotes'),
	pauseHits: document.getElementById('pauseHits'),
	pausePlaytime: document.getElementById('pausePlaytime')
};

const state = {
	started: false,
	ended: false,
	paused: false,
	currentScene: 'hub',
	worldNotes: 0,
	worldTarget: 20,
	health: 6,
	timer: 120,
	hitCooldown: 0,
	hasWorldJig: false,
	canExitWorld: false,
	jigs: 0,
	portalCliffUnlocked: false,
	worldCompleted: { beach: false, cliff: false },
	totals: { notes: 0, hitsTaken: 0, playtime: 0, worldClears: 0 },
	t: 0
};

const worldDefs = {
	beach: { label: 'Beach Bay', targetNotes: 20, time: 120, enemies: 4, bounds: 26, spawn: new THREE.Vector3(0, 3.7, 10) },
	cliff: { label: 'Cliff Cavern', targetNotes: 25, time: 135, enemies: 6, bounds: 29, spawn: new THREE.Vector3(7, 3.7, 9) }
};

const { scene, camera, renderer } = createRenderer(canvas, stage);
const input = createInput(canvas);

const hub = createHubScene();
const beach = createBeachScene();
const cliff = createCliffScene();
scene.add(hub.group, beach.group, cliff.group);

const player = buildPlayer();
player.position.set(0, 3.7, 11);
scene.add(player);

const witch = { mesh: buildWitchCaster(), cooldown: 1.8, orbit: 0 };
beach.group.add(witch.mesh);

const notes = [];
const enemies = [];
const projectiles = [];
let jig = null;

const cameraTarget = new THREE.Vector3();
const cameraDesired = new THREE.Vector3();

function activeBounds() {
	if (state.currentScene === 'hub') return hub.bounds;
	if (state.currentScene === 'beach') return beach.bounds;
	return cliff.bounds;
}

function distanceXZ(a, b) {
	return Math.hypot(a.x - b.x, a.z - b.z);
}

function clampXZ(position, margin = 1.1) {
	const limit = activeBounds() - margin;
	const d = Math.hypot(position.x, position.z);
	if (d <= limit) return;
	const s = limit / d;
	position.x *= s;
	position.z *= s;
}

function clearWorldActors() {
	notes.forEach((n) => n.parent.remove(n.mesh));
	notes.length = 0;
	enemies.forEach((e) => e.parent.remove(e.mesh));
	enemies.length = 0;
	projectiles.forEach((p) => p.parent.remove(p.mesh));
	projectiles.length = 0;
	if (jig) {
		jig.parent.remove(jig.mesh);
		jig = null;
	}
}

function setScene(name) {
	state.currentScene = name;
	hub.group.visible = name === 'hub';
	beach.group.visible = name === 'beach';
	cliff.group.visible = name === 'cliff';

	if (name === 'hub') {
		scene.background = new THREE.Color(0x2140a0);
		scene.fog = new THREE.Fog(0x2140a0, 35, 120);
		ui.level.textContent = 'Hub: Witch Lair Grounds';
		ui.time.textContent = '--';
		player.position.set(0, 3.7, 11);
		state.worldNotes = 0;
		state.hasWorldJig = false;
		state.canExitWorld = false;
		state.hitCooldown = 0;
		clearWorldActors();
		refreshObjective();
		refreshHud();
		return;
	}

	scene.background = new THREE.Color(name === 'beach' ? 0x1a74cf : 0x17426f);
	scene.fog = new THREE.Fog(name === 'beach' ? 0x1a74cf : 0x17426f, 22, 90);
	clearWorldActors();
	state.worldNotes = 0;
	state.hasWorldJig = false;
	state.canExitWorld = false;
	state.hitCooldown = 0;
	state.health = 6;
	state.worldTarget = worldDefs[name].targetNotes;
	state.timer = worldDefs[name].time;
	player.position.copy(worldDefs[name].spawn);
	player.rotation.y = Math.PI;
	ui.level.textContent = worldDefs[name].label;

	spawnWorldActors(name);
	refreshObjective();
	refreshHud();
}

function spawnWorldActors(name) {
	const def = worldDefs[name];
	const root = name === 'beach' ? beach.group : cliff.group;

	for (let i = 0; i < def.targetNotes; i += 1) {
		const mesh = buildNote();
		const p = randomPoint(def.bounds - 3.4);
		mesh.position.set(p.x, 3.4, p.z);
		root.add(mesh);
		notes.push({ mesh, pulse: Math.random() * Math.PI * 2, radius: 1.12, parent: root });
	}

	const jigMesh = buildJigToken();
	const jp = randomPoint(def.bounds - 6.4);
	jigMesh.position.set(jp.x, 4.2, jp.z);
	root.add(jigMesh);
	jig = { mesh: jigMesh, pulse: 0, radius: 1.3, parent: root };

	for (let i = 0; i < def.enemies; i += 1) {
		const mesh = buildEnemy();
		const p = randomPoint(def.bounds - 5.2);
		mesh.position.set(p.x, 3.2, p.z);
		root.add(mesh);
		enemies.push({
			mesh,
			parent: root,
			radius: 1.08,
			speed: 3.5 + Math.random() * 1.8,
			dir: Math.random() * Math.PI * 2,
			turnTimer: 0.3 + Math.random() * 0.9
		});
	}

	if (name === 'beach') {
		witch.mesh.visible = true;
		witch.mesh.position.set(-16, 6.0, -12.8);
		witch.cooldown = 1.4;
		witch.orbit = 0;
	} else {
		witch.mesh.visible = false;
	}
}

function refreshObjective() {
	if (state.currentScene === 'hub') {
		if (!state.portalCliffUnlocked) {
			ui.objective.textContent = 'Enter Beach portal and earn 1 Jig to unlock Cliff portal';
		} else if (!state.worldCompleted.cliff) {
			ui.objective.textContent = 'Cliff portal unlocked. Clear Cliff Cavern';
		} else {
			ui.objective.textContent = 'All worlds cleared. Visit any portal to free play';
		}
		return;
	}

	if (!state.canExitWorld) {
		ui.objective.textContent = `Collect ${state.worldTarget} notes and the Jig`; 
	} else {
		ui.objective.textContent = 'Return to exit portal and press E';
	}
}

function refreshHud() {
	ui.score.textContent = String(state.worldNotes);
	ui.health.textContent = String(state.health);
	if (state.currentScene !== 'hub') {
		ui.time.textContent = String(Math.max(0, Math.ceil(state.timer)));
	}
}

function updatePauseStats() {
	ui.pauseNotes.textContent = String(state.worldNotes);
	ui.pauseEnergy.textContent = String(state.health);
	ui.pauseTime.textContent = state.currentScene === 'hub' ? '--' : String(Math.max(0, Math.ceil(state.timer)));
	ui.pauseClears.textContent = String(state.totals.worldClears);
	ui.pauseTotalNotes.textContent = String(state.totals.notes);
	ui.pauseHits.textContent = String(state.totals.hitsTaken);
	ui.pausePlaytime.textContent = `${Math.floor(state.totals.playtime)}s`;
}

function openPause() {
	if (!state.started || state.ended || state.paused) return;
	state.paused = true;
	input.clearMovement();
	updatePauseStats();
	ui.pauseOverlay.classList.remove('hidden');
}

function closePause() {
	if (!state.paused) return;
	state.paused = false;
	ui.pauseOverlay.classList.add('hidden');
}

function startAdventure() {
	state.started = true;
	state.ended = false;
	state.paused = false;
	state.jigs = 0;
	state.portalCliffUnlocked = false;
	state.worldCompleted.beach = false;
	state.worldCompleted.cliff = false;
	state.totals.notes = 0;
	state.totals.hitsTaken = 0;
	state.totals.playtime = 0;
	state.totals.worldClears = 0;
	ui.startOverlay.classList.add('hidden');
	ui.endOverlay.classList.add('hidden');
	setScene('hub');
}

function finishRun(victory) {
	state.started = false;
	state.ended = true;
	state.paused = false;
	ui.pauseOverlay.classList.add('hidden');
	ui.endTitle.textContent = victory ? 'Grand Harmony Complete' : 'Adventure Failed';
	ui.endText.textContent = victory
		? 'You finished the hub-world loop: Beach and Cliff are both restored.'
		: 'Try again from the hub and collect faster.';
	ui.restartBtn.textContent = victory ? 'Play Again' : 'Retry Adventure';
	ui.endOverlay.classList.remove('hidden');
}

function onWorldCompleted(name) {
	if (!state.worldCompleted[name]) {
		state.worldCompleted[name] = true;
		state.jigs += 1;
		state.totals.worldClears += 1;
	}
	if (state.jigs >= 1) state.portalCliffUnlocked = true;

	const allDone = state.worldCompleted.beach && state.worldCompleted.cliff;
	setScene('hub');
	if (allDone) finishRun(true);
}

function takeDamage(amount = 1) {
	if (state.hitCooldown > 0) return;
	state.health -= amount;
	state.totals.hitsTaken += amount;
	state.hitCooldown = 1.2;
	if (state.health <= 0) {
		finishRun(false);
	}
}

function movePlayer(dt) {
	const move = input.movementVector();
	if (!move.x && !move.z) return;
	const len = Math.hypot(move.x, move.z) || 1;
	const ix = move.x / len;
	const iz = move.z / len;
	const yaw = input.cameraControl.yaw;
	const worldX = Math.cos(yaw) * ix + Math.sin(yaw) * iz;
	const worldZ = Math.cos(yaw) * iz - Math.sin(yaw) * ix;
	const speed = state.currentScene === 'hub' ? 8.8 : 10.3;
	player.position.x += worldX * speed * dt;
	player.position.z += worldZ * speed * dt;
	player.rotation.y = Math.atan2(worldX, worldZ);
}

function updateHub(dt) {
	hub.portalBeachRing.rotation.z += dt * 1.4;
	hub.portalCliffRing.rotation.z += dt * 1.2;
	if (!state.portalCliffUnlocked) {
		hub.portalCliffRing.material.color.setHex(0x6b6b7a);
		hub.portalCliffRing.material.emissive.setHex(0x202030);
	} else {
		hub.portalCliffRing.material.color.setHex(0x99d5ff);
		hub.portalCliffRing.material.emissive.setHex(0x1a5a99);
	}

	movePlayer(dt);
	clampXZ(player.position, 1.4);

	const nearBeach = distanceXZ(player.position, hub.portalBeach.position) < 2.6;
	const nearCliff = distanceXZ(player.position, hub.portalCliff.position) < 2.6;

	if (nearBeach) ui.objective.textContent = input.isTouch ? 'Entering BEACH...' : 'Press E to enter BEACH';
	if (nearCliff && !state.portalCliffUnlocked) ui.objective.textContent = 'Need 1 Jig to unlock this portal';
	if (nearCliff && state.portalCliffUnlocked) ui.objective.textContent = input.isTouch ? 'Entering CLIFF...' : 'Press E to enter CLIFF';

	const interact = input.wantsInteract();
	if (nearBeach && interact) setScene('beach');
	if (nearCliff && interact && state.portalCliffUnlocked) setScene('cliff');
}

function spawnWitchProjectile() {
	const bolt = new THREE.Mesh(
		new THREE.SphereGeometry(0.28, 10, 10),
		new THREE.MeshStandardMaterial({ color: 0x77d5ff, emissive: 0x0b3f9a, emissiveIntensity: 1.3, roughness: 0.35 })
	);
	bolt.position.copy(witch.mesh.position);
	bolt.position.y += 0.2;
	beach.group.add(bolt);
	const vel = new THREE.Vector3(player.position.x - bolt.position.x, 0, player.position.z - bolt.position.z).normalize().multiplyScalar(12.8);
	projectiles.push({ mesh: bolt, parent: beach.group, vel, radius: 0.5, life: 3.4 });
}

function updateWorld(dt) {
	state.timer -= dt;
	if (state.timer <= 0) {
		finishRun(false);
		return;
	}
	if (state.hitCooldown > 0) {
		state.hitCooldown -= dt;
		player.visible = Math.floor(state.hitCooldown * 12) % 2 === 0;
	} else {
		player.visible = true;
	}

	movePlayer(dt);
	clampXZ(player.position, 1.5);

	notes.forEach((n) => {
		n.pulse += dt * 4.2;
		n.mesh.position.y = 3.4 + Math.sin(n.pulse) * 0.26;
		n.mesh.rotation.y += dt * 1.9;
	});
	if (jig) {
		jig.pulse += dt * 2.8;
		jig.mesh.position.y = 4.2 + Math.sin(jig.pulse) * 0.35;
		jig.mesh.rotation.y += dt * 2.5;
	}

	for (let i = notes.length - 1; i >= 0; i -= 1) {
		const n = notes[i];
		if (n.mesh.position.distanceTo(player.position) < 2.0) {
			n.parent.remove(n.mesh);
			notes.splice(i, 1);
			state.worldNotes += 1;
			state.totals.notes += 1;
		}
	}

	if (jig && jig.mesh.position.distanceTo(player.position) < 2.1) {
		jig.parent.remove(jig.mesh);
		jig = null;
		state.hasWorldJig = true;
	}

	enemies.forEach((e) => {
		e.turnTimer -= dt;
		if (e.turnTimer <= 0) {
			e.turnTimer = 0.35 + Math.random() * 0.9;
			const toPlayer = Math.atan2(player.position.x - e.mesh.position.x, player.position.z - e.mesh.position.z);
			e.dir += (toPlayer - e.dir) * (0.14 + Math.random() * 0.18);
		}
		e.mesh.position.x += Math.sin(e.dir) * e.speed * dt;
		e.mesh.position.z += Math.cos(e.dir) * e.speed * dt;
		const limit = activeBounds() - 1.8;
		const d = Math.hypot(e.mesh.position.x, e.mesh.position.z);
		if (d > limit) {
			const s = limit / d;
			e.mesh.position.x *= s;
			e.mesh.position.z *= s;
			e.dir += Math.PI * 0.6;
		}
		e.mesh.rotation.y = e.dir;
		if (e.mesh.position.distanceTo(player.position) < 2.0) {
			takeDamage(1);
		}
	});

	if (state.currentScene === 'beach') {
		beach.sea.rotation.z += dt * 0.015;
		beach.sea.material.color.setHSL(0.57 + Math.sin(state.t * 0.32) * 0.015, 0.73, 0.43 + Math.sin(state.t) * 0.02);
		witch.orbit += dt;
		witch.mesh.position.x = -16 + Math.cos(witch.orbit * 0.7) * 1.4;
		witch.mesh.position.z = -12.8 + Math.sin(witch.orbit * 0.7) * 1.4;
		witch.mesh.position.y = 6.0 + Math.sin(state.t * 2.1) * 0.35;
		witch.mesh.rotation.y += dt * 1.6;
		witch.cooldown -= dt;
		if (witch.cooldown <= 0) {
			witch.cooldown = 1.5 + Math.random() * 0.8;
			spawnWitchProjectile();
		}
	}

	for (let i = projectiles.length - 1; i >= 0; i -= 1) {
		const p = projectiles[i];
		p.life -= dt;
		p.mesh.position.x += p.vel.x * dt;
		p.mesh.position.z += p.vel.z * dt;
		p.mesh.position.y = 4 + Math.sin(state.t * 8 + i) * 0.45;
		p.mesh.rotation.y += dt * 8;
		if (p.life <= 0 || Math.hypot(p.mesh.position.x, p.mesh.position.z) > activeBounds() + 6) {
			p.parent.remove(p.mesh);
			projectiles.splice(i, 1);
			continue;
		}
		if (p.mesh.position.distanceTo(player.position) < p.radius + 0.95) {
			takeDamage(1);
			p.parent.remove(p.mesh);
			projectiles.splice(i, 1);
		}
	}

	state.canExitWorld = state.worldNotes >= state.worldTarget && state.hasWorldJig;
	refreshObjective();

	const exitPortal = state.currentScene === 'beach' ? beach.exitPortal : cliff.exitPortal;
	exitPortal.rotation.z += dt * 1.4;
	const nearExit = distanceXZ(player.position, exitPortal.position) < 2.8;
	if (nearExit) {
		ui.objective.textContent = state.canExitWorld
			? (input.isTouch ? 'Returning to HUB...' : 'Press E to return HUB')
			: 'Collect notes + Jig before exiting';
		if (state.canExitWorld && input.wantsInteract()) {
			onWorldCompleted(state.currentScene);
			return;
		}
	}

	refreshHud();
}

function updateCamera(dt) {
	const cc = input.cameraControl;
	const offsetX = Math.sin(cc.yaw) * Math.cos(cc.pitch) * cc.distance;
	const offsetY = Math.sin(cc.pitch) * cc.distance + 2.4;
	const offsetZ = Math.cos(cc.yaw) * Math.cos(cc.pitch) * cc.distance;
	cameraDesired.set(player.position.x - offsetX, player.position.y + offsetY, player.position.z - offsetZ);
	camera.position.lerp(cameraDesired, 1 - Math.exp(-dt * 5.2));
	cameraTarget.set(player.position.x, player.position.y + 1.7, player.position.z);
	camera.lookAt(cameraTarget);
}

function update(dt) {
	state.t += dt;
	if (state.started && !state.ended && !state.paused) {
		state.totals.playtime += dt;
	}

	if (input.consumeEscape()) {
		if (state.paused) closePause();
		else openPause();
	}

	if (!state.started || state.ended || state.paused) {
		updateCamera(dt);
		return;
	}

	if (state.currentScene === 'hub') updateHub(dt);
	else updateWorld(dt);
	updateCamera(dt);
}

function animate() {
	const dt = Math.min(0.033, clock.getDelta());
	update(dt);
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}

const clock = new THREE.Clock();

document.getElementById('startBtn').addEventListener('click', startAdventure);
ui.restartBtn.addEventListener('click', () => {
	ui.endOverlay.classList.add('hidden');
	startAdventure();
});
ui.pauseResumeBtn.addEventListener('click', closePause);
ui.pauseTotalsBtn.addEventListener('click', () => {
	ui.pauseTotalsPanel.classList.toggle('hidden');
	ui.pauseTotalsBtn.classList.toggle('active', !ui.pauseTotalsPanel.classList.contains('hidden'));
	updatePauseStats();
});
ui.pauseQuitBtn.addEventListener('click', () => {
	ui.pauseOverlay.classList.add('hidden');
	ui.endOverlay.classList.add('hidden');
	ui.startOverlay.classList.remove('hidden');
	state.started = false;
	state.paused = false;
	setScene('hub');
});

setScene('hub');
animate();
