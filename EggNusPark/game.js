import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.getElementById("game");
const coinsEl = document.getElementById("coins");
const happinessEl = document.getElementById("happiness");
const visitorsEl = document.getElementById("visitors");
const incomeEl = document.getElementById("income");
const rageEl = document.getElementById("rage");
const messageEl = document.getElementById("message");
const tasksEl = document.getElementById("tasks");
const modeLabelEl = document.getElementById("modeLabel");
const buildButtons = [...document.querySelectorAll("[data-build]")];
const resetCameraButton = document.getElementById("cameraReset");
const viewModeButton = document.getElementById("viewMode");
const destroyModeButton = document.getElementById("destroyMode");
const editCoasterButton = document.getElementById("editCoaster");
const reseedButton = document.getElementById("reseed");
const copyShareButton = document.getElementById("copyShare");
const loadShareButton = document.getElementById("loadShare");

const buildTypes = {
  burger: { label: "Burger Stall", cost: 80, income: 2.4, happiness: 4, color: 0xffc84d },
  photo: { label: "Photo Booth", cost: 120, income: 3.8, happiness: 6, color: 0x71e6d7 },
  cafe: { label: "Aeter Cafe", cost: 150, income: 4.7, happiness: 8, color: 0xff8b7f },
  arcade: { label: "Zero-G Arcade", cost: 220, income: 6.4, happiness: 10, color: 0xbc7cff },
  wheel: { label: "Sky Wheel", cost: 300, income: 8.8, happiness: 15, color: 0xf2d14f },
};

const objectivePool = [
  { template: "Buy %d plots", check: (state, target) => state.ownedPlots >= target, range: [3, 15] },
  { template: "Place %d attractions", check: (state, target) => state.buildCount >= target, range: [2, 20] },
  { template: "Reach %d happiness", check: (state, target) => state.happiness >= target, range: [20, 150] },
  { template: "Earn %d coins", check: (state, target) => state.coins >= target, range: [500, 5000] },
  { template: "Get %d visitors", check: (state, target) => state.visitors >= target, range: [15, 100] },
];

function generateNewObjective() {
  const pool = objectivePool[Math.floor(Math.random() * objectivePool.length)];
  const [min, max] = pool.range;
  const target = min + Math.floor(Math.random() * (max - min + 1));
  return {
    id: `objective-${Date.now()}-${Math.random()}`,
    text: pool.template.replace("%d", target),
    target,
    template: pool.template,
    check: (s) => pool.check(s, target),
    done: false,
  };
}

let taskDefinitions = [
  generateNewObjective(),
  generateNewObjective(),
];

const sharedClock = new THREE.Clock();
const canvasRect = () => canvas.getBoundingClientRect();
const clamp = THREE.MathUtils.clamp;
const roomId = new URLSearchParams(window.location.search).get("room") || randomCode(8);
const clientId = randomCode(10);
const broadcastChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`eggnus-park-${roomId}`) : null;

const state = {
  coins: 650,
  happiness: 0,
  visitors: 0,
  income: 0,
  buildCount: 0,
  ownedPlots: 0,
  trackEdits: 0,
  rage: 0,
  rageEvents: 0,
  selectedBuild: "burger",
  tool: "build",
  viewMode: "orbit",
  seed: Math.random(),
  messageTimer: 0,
  bossLine: 0,
  elapsed: 0,
  dirty: false,
  lastNetworkPush: 0,
  plots: [],
  structures: [],
  ambientVisitors: [],
  npcVisitors: [],
  networkRevision: 0,
  lastAppliedRevision: 0,
  buildCounts: { burger: 0, photo: 0, cafe: 0, arcade: 0, wheel: 0 },
  targetNpcVisitors: 0,
  lastNpcSpawn: 0,
  walk: {
    position: new THREE.Vector3(0, 2.4, 122),
    yaw: Math.PI,
    pitch: 0,
    keys: new Set(),
    active: false,
  },
  track: {
    curve: null,
    points: [
      new THREE.Vector3(-24, 3.8, -30),
      new THREE.Vector3(-8, 5.2, -40),
      new THREE.Vector3(20, 7.6, -35),
      new THREE.Vector3(38, 11.2, -8),
      new THREE.Vector3(30, 13.2, 22),
      new THREE.Vector3(4, 11.2, 40),
      new THREE.Vector3(-28, 8.4, 28),
      new THREE.Vector3(-40, 5.4, -2),
    ],
    handles: [],
    root: null,
    handleRoot: null,
    eggnus: null,
    eggnusProgress: 0,
  },
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb8efe7);
scene.fog = new THREE.Fog(0xb8efe7, 100, 600);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(68, 48, 72);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 10, 0);
controls.minDistance = 28;
controls.maxDistance = 340;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minPolarAngle = 0.18;
controls.enablePan = false;
controls.update();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const dragHit = new THREE.Vector3();
let draggedHandle = null;
const gltfLoader = new GLTFLoader();
const music = new Audio("./Eggnus Park.mp3");
music.loop = true;
music.preload = "auto";
music.volume = 0.42;
let musicStarted = false;
let activeWalkPointerId = null;
let lastWalkPointer = null;

const world = {
  radius: 320,
  plotSpacing: 16,
  plotGrid: 20,
  plotBaseY: 0.15,
};

const parkRoot = new THREE.Group();
scene.add(parkRoot);

const structuresRoot = new THREE.Group();
parkRoot.add(structuresRoot);

const plotsRoot = new THREE.Group();
parkRoot.add(plotsRoot);

const decorRoot = new THREE.Group();
parkRoot.add(decorRoot);

const trackRoot = new THREE.Group();
parkRoot.add(trackRoot);

const trackHandleRoot = new THREE.Group();
parkRoot.add(trackHandleRoot);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.55);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xfff2cc, 2.15);
sun.position.set(-35, 70, 30);
scene.add(sun);

const rim = new THREE.DirectionalLight(0x7ee6d7, 1.1);
rim.position.set(40, 30, -40);
scene.add(rim);

const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(700, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xb8efe7, side: THREE.BackSide })
);
scene.add(skyDome);

const networkState = {
  roomId,
  clientId,
  channel: broadcastChannel,
  autosaveKey: `EggNusPark:${roomId}:autosave`,
};

const messageQueue = [
  "Eggnus: Bigger land. Bigger revenue. Do the work.",
  "Eggnus: Buy plots first, then build attractions.",
  "Eggnus: Walk the park and keep an eye on every district.",
  "Eggnus: If someone shares the park code, they can inspect the same layout.",
];

const plotById = new Map();

function randomCode(length) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let output = "";
  for (let index = 0; index < length; index += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return output;
}

function seededRandom(index) {
  const x = Math.sin((state.seed + index) * 9999) * 43758.5453123;
  return x - Math.floor(x);
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(code) {
  let normalized = code.replace(/-/g, "+").replace(/_/g, "/");
  while (normalized.length % 4 !== 0) {
    normalized += "=";
  }
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function parseStateCode(input) {
  if (!input) {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  let code = trimmed;
  try {
    if (trimmed.includes("#")) {
      const url = new URL(trimmed, window.location.href);
      code = url.hash.startsWith("#state=") ? url.hash.slice(7) : code;
    } else if (trimmed.startsWith("state=")) {
      code = trimmed.slice(6);
    }
    const json = fromBase64Url(code);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function readInitialSnapshot() {
  const hash = window.location.hash;
  if (hash.startsWith("#state=")) {
    return parseStateCode(hash.slice(7));
  }

  try {
    const autosave = window.localStorage.getItem(networkState.autosaveKey);
    if (autosave) {
      return JSON.parse(autosave);
    }
  } catch {
    return null;
  }

  return null;
}

function shortBuildLabel(type) {
  return {
    burger: "Burger",
    photo: "Photo",
    cafe: "Cafe",
    arcade: "Arcade",
    wheel: "Wheel",
  }[type] || type;
}

function makeLabel(text, foreground, background, scale = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = background;
  roundRect(context, 20, 20, canvas.width - 40, canvas.height - 40, 34);
  context.fill();
  context.font = "bold 56px Trebuchet MS, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = foreground;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(10 * scale, 5 * scale, 1);
  return sprite;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function setMessage(text, duration = 5) {
  messageEl.textContent = text;
  state.messageTimer = duration;
}

function updateTaskList() {
  tasksEl.innerHTML = "";
  taskDefinitions.forEach((task) => {
    const item = document.createElement("li");
    item.textContent = task.text;
    if (task.done) {
      item.classList.add("done");
    }
    tasksEl.appendChild(item);
  });
}

function refreshHud() {
  coinsEl.textContent = Math.floor(state.coins).toString();
  happinessEl.textContent = Math.floor(state.happiness).toString();
  visitorsEl.textContent = Math.floor(state.visitors).toString();
  incomeEl.textContent = `${state.income.toFixed(1)}/s`;
  rageEl.textContent = `${Math.min(100, Math.floor(state.rage))}%`;
  modeLabelEl.textContent = `Mode: ${state.viewMode === "orbit" ? "Orbit" : "Walk"} / Tool: ${state.tool}`;

  viewModeButton.classList.toggle("active", state.viewMode === "walk");
  destroyModeButton.classList.toggle("active", state.tool === "destroy");
  editCoasterButton.classList.toggle("active", state.tool === "track");

  buildButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.build === state.selectedBuild && state.tool === "build");
  });
}

function saveAutosave() {
  try {
    window.localStorage.setItem(networkState.autosaveKey, JSON.stringify(serializeState()));
  } catch {
    return;
  }
}

function serializeState() {
  return {
    version: 2,
    seed: state.seed,
    coins: state.coins,
    rage: state.rage,
    rageEvents: state.rageEvents,
    selectedBuild: state.selectedBuild,
    tool: state.tool,
    viewMode: state.viewMode,
    buildCounts: state.buildCounts,
    plotStates: state.plots.map((plot) => ({
      id: plot.userData.id,
      owned: plot.userData.owned,
      destroyed: plot.userData.destroyed,
      structureType: plot.userData.structureType,
    })),
    trackPoints: state.track.points.map((point) => [point.x, point.y, point.z]),
    walk: {
      position: [state.walk.position.x, state.walk.position.y, state.walk.position.z],
      yaw: state.walk.yaw,
      pitch: state.walk.pitch,
    },
  };
}

function applyState(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return false;
  }

  state.seed = typeof snapshot.seed === "number" ? snapshot.seed : state.seed;
  state.coins = typeof snapshot.coins === "number" ? snapshot.coins : state.coins;
  state.rage = typeof snapshot.rage === "number" ? snapshot.rage : state.rage;
  state.rageEvents = typeof snapshot.rageEvents === "number" ? snapshot.rageEvents : state.rageEvents;
  state.selectedBuild = buildTypes[snapshot.selectedBuild] ? snapshot.selectedBuild : state.selectedBuild;
  state.tool = ["build", "destroy", "track"].includes(snapshot.tool) ? snapshot.tool : state.tool;
  state.viewMode = snapshot.viewMode === "walk" ? "walk" : "orbit";
  state.buildCounts = {
    burger: 0,
    photo: 0,
    cafe: 0,
    arcade: 0,
    wheel: 0,
    ...(snapshot.buildCounts || {}),
  };

  if (Array.isArray(snapshot.trackPoints) && snapshot.trackPoints.length >= 4) {
    state.track.points = snapshot.trackPoints.map((entry) => new THREE.Vector3(entry[0], entry[1], entry[2]));
    state.trackEdits += 1;
  }

  if (snapshot.walk && Array.isArray(snapshot.walk.position)) {
    state.walk.position.set(snapshot.walk.position[0], snapshot.walk.position[1], snapshot.walk.position[2]);
    state.walk.yaw = typeof snapshot.walk.yaw === "number" ? snapshot.walk.yaw : state.walk.yaw;
    state.walk.pitch = typeof snapshot.walk.pitch === "number" ? snapshot.walk.pitch : state.walk.pitch;
  }

  rebuildPlots(snapshot.plotStates || []);
  rebuildTrack();
  rebuildEconomy();
  setInteractionMode(state.tool, { silent: true });
  setViewMode(state.viewMode, { silent: true });
  refreshHud();
  updateTaskList();
  return true;
}

function broadcastState() {
  state.networkRevision += 1;
  const snapshot = serializeState();
  const payload = { type: "state", sender: clientId, revision: state.networkRevision, snapshot };

  if (networkState.channel) {
    networkState.channel.postMessage(payload);
  }

  saveAutosave();
  state.lastNetworkPush = state.elapsed;
}

function syncShareUrl() {
  const snapshot = serializeState();
  const code = toBase64Url(JSON.stringify(snapshot));
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  url.hash = `state=${code}`;
  return url.toString();
}

function copyShareCode() {
  const url = syncShareUrl();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      setMessage("Eggnus: Share code copied. Another player can load the same park.");
    });
    return;
  }
  window.prompt("Copy this park link", url);
}

function loadSharedCode() {
  const input = window.prompt("Paste a park link or share code");
  if (!input) {
    return;
  }
  const parsed = parseStateCode(input);
  if (!parsed) {
    setMessage("Eggnus: That code did not decode into a park.");
    return;
  }
  applyState(parsed);
  broadcastState();
  setMessage("Eggnus: Shared park loaded.");
}

function setInteractionMode(mode, options = {}) {
  state.tool = mode;
  if (mode === "track") {
    state.viewMode = "orbit";
    controls.enabled = true;
    state.walk.active = false;
    document.exitPointerLock?.();
  }
  if (!options.silent) {
    if (mode === "destroy") {
      setMessage("Eggnus: Destroy mode active. Click a building to remove it.", 4);
    } else if (mode === "track") {
      setMessage("Eggnus: Coaster edit mode active. Drag the glowing handles.", 4);
    }
  }
  refreshHud();
}

function setViewMode(mode, options = {}) {
  state.viewMode = mode === "walk" ? "walk" : "orbit";
  controls.enabled = state.viewMode === "orbit" && state.tool !== "track";
  state.walk.active = state.viewMode === "walk";
  if (state.viewMode === "orbit") {
    document.exitPointerLock?.();
  }
  if (!options.silent) {
    setMessage(state.viewMode === "walk" ? "Eggnus: Walk view enabled." : "Eggnus: Orbit view enabled.", 3.5);
  }
  refreshHud();
}

function resetCamera() {
  state.viewMode = "orbit";
  state.walk.position.set(0, 2.4, 122);
  state.walk.yaw = Math.PI;
  state.walk.pitch = 0;
  camera.position.set(68, 48, 72);
  controls.target.set(0, 10, 0);
  controls.update();
  setViewMode("orbit", { silent: true });
  setMessage("Eggnus: Camera reset.", 3);
}

function rebuildEconomy() {
  let totalIncome = 0;
  let totalHappiness = 0;
  let ownedPlots = 0;
  let buildCount = 0;

  state.plots.forEach((plot) => {
    if (plot.userData.owned) {
      ownedPlots += 1;
    }
    if (plot.userData.structureType && plot.userData.structureMesh) {
      const config = buildTypes[plot.userData.structureType];
      totalIncome += config.income;
      totalHappiness += config.happiness;
      buildCount += 1;
    }
  });

  state.ownedPlots = ownedPlots;
  state.buildCount = buildCount;
  state.income = totalIncome;
  state.happiness = totalHappiness + ownedPlots * 0.7;
  state.visitors = Math.round(12 + state.happiness * 1.4 + state.ownedPlots * 0.5);
}

function updateTaskProgress() {
  let changed = false;
  let completedCount = 0;
  taskDefinitions.forEach((task) => {
    if (!task.done && task.check(state)) {
      task.done = true;
      changed = true;
      completedCount += 1;
    }
  });
  if (changed) {
    state.rage = Math.max(0, state.rage - 24);
    for (let i = 0; i < completedCount; i += 1) {
      taskDefinitions.push(generateNewObjective());
    }
    taskDefinitions = taskDefinitions.filter((task) => !task.done || taskDefinitions.indexOf(task) < 8);
    updateTaskList();
    setMessage("Eggnus: Task progress noted. Keep expanding.");
  }
}

function triggerRageEvent() {
  const destructiblePlots = state.plots.filter((plot) => plot.userData.structureMesh || plot.userData.owned);
  const attackCount = Math.min(2 + state.rageEvents, destructiblePlots.length);

  for (let index = 0; index < attackCount; index += 1) {
    const targetIndex = Math.floor(Math.random() * destructiblePlots.length);
    const target = destructiblePlots.splice(targetIndex, 1)[0];
    if (!target) {
      continue;
    }
    if (target.userData.structureMesh) {
      destroyStructure(target, true);
    } else {
      target.userData.owned = false;
      target.userData.destroyed = true;
      updatePlotVisual(target);
    }
  }

  state.coins = Math.max(0, state.coins * 0.82);
  state.rage = 34;
  state.rageEvents += 1;
  rebuildEconomy();
  refreshHud();
  setMessage(`Eggnus: You ignored me. I am WRECKING the park! (Rampage #${state.rageEvents})`, 6);
  broadcastState();
}

function updateRage(delta) {
  const incompleteTasks = taskDefinitions.filter((task) => !task.done).length;
  const rageAcceleration = 1 + state.rageEvents * 0.35;
  if (incompleteTasks > 0) {
    state.rage += delta * (0.65 + incompleteTasks * 0.85) * rageAcceleration;
  } else {
    state.rage = Math.max(0, state.rage - delta * 10);
  }

  if (state.rage >= 100) {
    triggerRageEvent();
  }
}

function addGround() {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(world.radius, 96),
    new THREE.MeshStandardMaterial({ color: 0x6f9d75, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  parkRoot.add(ground);

  const plaza = new THREE.Mesh(
    new THREE.RingGeometry(18, 68, 96),
    new THREE.MeshStandardMaterial({ color: 0xd6c49c, roughness: 1 })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.01;
  parkRoot.add(plaza);

  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(6, 16, 96),
    new THREE.MeshStandardMaterial({ color: 0xb39061, roughness: 1 })
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.03;
  parkRoot.add(innerRing);

  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(74, 132, 96),
    new THREE.MeshStandardMaterial({ color: 0x61886d, roughness: 1 })
  );
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.005;
  parkRoot.add(outerRing);
}

function addBuildings() {
  const colors = [0xff8b7f, 0xf2d14f, 0x71e6d7, 0xb98aff, 0xf4c5a0, 0x85c7ff];
  for (let index = 0; index < 58; index += 1) {
    const angle = (index / 58) * Math.PI * 2;
    const radius = 92 + seededRandom(index) * 56;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const color = colors[index % colors.length];
    const height = 8 + seededRandom(index + 11) * 30;

    const tower = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4 + seededRandom(index + 1), 3.2 + seededRandom(index + 5), height, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.04 })
    );
    body.position.y = height / 2;
    tower.add(body);

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(1.9 + seededRandom(index + 7), 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xfff0cf, roughness: 0.45, metalness: 0.06 })
    );
    cap.position.y = height + 1.1;
    tower.add(cap);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(2.8 + seededRandom(index + 17), 16, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.76 })
    );
    dome.scale.y = 0.65;
    dome.position.y = height + 0.4;
    tower.add(dome);

    const balcony = new THREE.Mesh(
      new THREE.TorusGeometry(3.4 + seededRandom(index + 21), 0.34, 8, 18),
      new THREE.MeshStandardMaterial({ color: 0x5d6a68, roughness: 0.7 })
    );
    balcony.rotation.x = Math.PI / 2;
    balcony.position.y = height * 0.68;
    tower.add(balcony);

    tower.position.set(x, 0, z);
    tower.rotation.y = seededRandom(index + 44) * Math.PI;
    parkRoot.add(tower);
  }
}

function addDecorOrbs() {
  const colors = [0xffd58a, 0x99f3ea, 0xffa88c];
  for (let index = 0; index < 18; index += 1) {
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(1.2 + (index % 4) * 0.23, 16, 12),
      new THREE.MeshStandardMaterial({
        color: colors[index % colors.length],
        emissive: colors[index % colors.length],
        emissiveIntensity: 0.45,
        roughness: 0.35,
      })
    );
    const angle = (index / 18) * Math.PI * 2;
    orb.position.set(Math.cos(angle) * (26 + index * 3.1), 22 + (index % 5) * 3, Math.sin(angle) * (26 + index * 3.1));
    decorRoot.add(orb);
    state.ambientVisitors.push({ mesh: orb, angle, speed: 0.08 + index * 0.004, float: 1 + seededRandom(index) });
  }
}

function addVisitors() {
  for (let index = 0; index < 12; index += 1) {
    const visitor = new THREE.Mesh(
      new THREE.SphereGeometry(0.38 + Math.random() * 0.08, 12, 10),
      new THREE.MeshStandardMaterial({ color: [0xffd26a, 0x6adecf, 0xff8b7f][Math.floor(Math.random() * 3)] })
    );
    const angle = Math.random() * Math.PI * 2;
    const radius = 18 + Math.random() * 16;
    visitor.position.set(Math.cos(angle) * radius, 0.62, Math.sin(angle) * radius);
    visitor.userData = { angle, radius, speed: 0.25 + Math.random() * 0.16, wander: Math.random() * Math.PI * 2 };
    decorRoot.add(visitor);
    state.ambientVisitors.push({ mesh: visitor });
  }
}

function createNpcVisitor() {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.35 + Math.random() * 0.06, 10, 8),
    new THREE.MeshStandardMaterial({ color: [0xffd26a, 0x6adecf, 0xff8b7f, 0xb5f7ff][Math.floor(Math.random() * 4)] })
  );
  const angle = Math.random() * Math.PI * 2;
  const radius = 25 + Math.random() * 100;
  mesh.position.set(Math.cos(angle) * radius, 0.55, Math.sin(angle) * radius);
  mesh.userData = {
    angle: angle,
    radius: radius,
    speed: 0.15 + Math.random() * 0.25,
    wander: Math.random() * Math.PI * 2,
    wanderSpeed: Math.random() * 2 - 1,
    lifespan: 60 + Math.random() * 120,
    age: 0,
  };
  structuresRoot.add(mesh);
  state.npcVisitors.push(mesh);
  return mesh;
}

function updateNpcVisitors(delta) {
  const parkQuality = state.happiness + state.buildCount * 2 - state.rage * 0.5;
  const targetVisitors = Math.max(0, Math.min(15, Math.floor(parkQuality / 15)));
  state.targetNpcVisitors = targetVisitors;
  state.lastNpcSpawn += delta;

  while (state.npcVisitors.length < targetVisitors && state.lastNpcSpawn > 1.5) {
    createNpcVisitor();
    state.lastNpcSpawn -= 1.5;
  }

  state.npcVisitors.forEach((visitor, index) => {
    if (!visitor || !visitor.userData) return;
    visitor.userData.age += delta;
    visitor.userData.angle += visitor.userData.speed * delta;
    visitor.userData.wander += visitor.userData.wanderSpeed * delta;
    const radiusDrift = Math.sin(visitor.userData.wander * 0.4) * 8;
    const worldRadius = world.radius - 15;
    const radius = Math.max(18, Math.min(worldRadius, visitor.userData.radius + radiusDrift));
    visitor.position.set(Math.cos(visitor.userData.angle) * radius, 0.55 + Math.sin(visitor.userData.wander * 2) * 0.08, Math.sin(visitor.userData.angle) * radius);

    if (visitor.userData.age > visitor.userData.lifespan) {
      structuresRoot.remove(visitor);
      state.npcVisitors.splice(index, 1);
    }
  });
}

function createPlot(plotIndex, x, z) {
  const group = new THREE.Group();
  const distance = Math.sqrt(x * x + z * z);
  const cost = Math.max(45, Math.round(30 + distance * 1.7));

  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(3.35, 3.6, 0.35, 18),
    new THREE.MeshStandardMaterial({ color: 0x315359, roughness: 0.9 })
  );
  pad.position.y = world.plotBaseY;
  group.add(pad);

  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(3.8, 0.12, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0x7ee6d7, emissive: 0x7ee6d7, emissiveIntensity: 1.5 })
  );
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.49;
  group.add(glow);

  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.52, 1.45, 10),
    new THREE.MeshStandardMaterial({ color: 0xffefc1, emissive: 0xf6cf59, emissiveIntensity: 0.48 })
  );
  marker.position.y = 1.46;
  group.add(marker);

  const label = makeLabel(`$${cost}`, "#173338", "#effde9", 0.55);
  label.position.set(0, 3.35, 0);
  group.add(label);

  group.position.set(x, 0, z);
  group.userData = {
    id: `plot-${plotIndex}`,
    cost,
    owned: false,
    destroyed: false,
    structureType: null,
    structureMesh: null,
    glow,
    marker,
    label,
    pad,
  };
  plotsRoot.add(group);
  state.plots.push(group);
  plotById.set(group.userData.id, group);
  return group;
}

function addPlots() {
  const half = Math.floor(world.plotGrid / 2);
  const plots = [];
  let index = 0;
  for (let gx = -half; gx <= half; gx += 1) {
    for (let gz = -half; gz <= half; gz += 1) {
      const x = gx * world.plotSpacing + (seededRandom(index + 1) - 0.5) * 2.2;
      const z = gz * world.plotSpacing + (seededRandom(index + 2) - 0.5) * 2.2;
      const distance = Math.sqrt(x * x + z * z);
      if (distance < 142) {
        plots.push(createPlot(index, x, z));
      }
      index += 1;
    }
  }
  return plots;
}

function rebuildPlots(snapshotPlotStates) {
  state.plots.forEach((plot) => {
    if (plot.userData.structureMesh) {
      plotsRoot.remove(plot.userData.structureMesh);
      plot.userData.structureMesh = null;
    }
    if (plot.userData.label) {
      plot.remove(plot.userData.label);
    }
  });

  state.plots = [];
  plotById.clear();
  plotsRoot.clear();
  addPlots();

  const plotStateMap = new Map(snapshotPlotStates.map((entry) => [entry.id, entry]));
  state.plots.forEach((plot) => {
    const plotState = plotStateMap.get(plot.userData.id);
    if (plotState) {
      plot.userData.owned = !!plotState.owned;
      plot.userData.destroyed = !!plotState.destroyed;
      plot.userData.structureType = plotState.structureType || null;
    }
    updatePlotVisual(plot);
    if (plot.userData.structureType) {
      const structure = createAttraction(plot.userData.structureType, plot);
      plot.userData.structureMesh = structure;
      structuresRoot.add(structure);
    }
  });
}

function updatePlotVisual(plot) {
  const data = plot.userData;
  const labelText = data.structureType
    ? shortBuildLabel(data.structureType)
    : data.owned
    ? data.destroyed
      ? "REBUILD"
      : "OWNED"
    : `$${data.cost}`;
  const labelColor = data.structureType ? "#fff0cb" : data.destroyed ? "#ffd3d1" : "#173338";
  const labelBg = data.structureType ? "#1f2f33" : data.destroyed ? "#53222a" : data.owned ? "#304c3d" : "#effde9";

  if (data.label) {
    plot.remove(data.label);
  }
  data.label = makeLabel(labelText, labelColor, labelBg, 0.55);
  data.label.position.set(0, 3.35, 0);
  plot.add(data.label);

  if (data.glow) {
    if (data.structureType) {
      data.glow.material.color.setHex(buildTypes[data.structureType].color);
      data.glow.material.emissive.setHex(buildTypes[data.structureType].color);
      data.glow.material.emissiveIntensity = 1.8;
    } else if (data.destroyed) {
      data.glow.material.color.setHex(0xff7a7a);
      data.glow.material.emissive.setHex(0xff7a7a);
      data.glow.material.emissiveIntensity = 1.5;
    } else if (data.owned) {
      data.glow.material.color.setHex(0xf2d14f);
      data.glow.material.emissive.setHex(0xf2d14f);
      data.glow.material.emissiveIntensity = 1.25;
    } else {
      data.glow.material.color.setHex(0x7ee6d7);
      data.glow.material.emissive.setHex(0x7ee6d7);
      data.glow.material.emissiveIntensity = 1.5;
    }
  }

  if (data.marker) {
    data.marker.visible = !data.owned || !!data.structureType;
    data.marker.material.emissiveIntensity = data.owned ? 0.25 : 0.48;
  }
}

function createAttraction(type, plot) {
  const config = buildTypes[type];
  const group = new THREE.Group();
  group.position.copy(plot.position);
  group.position.y = 0.82;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 3.1, 1.2, 16),
    new THREE.MeshStandardMaterial({ color: 0x605147, roughness: 0.95 })
  );
  base.position.y = 0.6;
  group.add(base);

  if (type === "burger") {
    const bun = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 20, 16),
      new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.82 })
    );
    bun.scale.set(1.05, 0.58, 1.05);
    bun.position.y = 2.25;
    group.add(bun);

    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.7, 0.35, 18),
      new THREE.MeshStandardMaterial({ color: 0x8d5031 })
    );
    stripe.position.y = 1.48;
    group.add(stripe);
  } else if (type === "photo") {
    const booth = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 4, 3.8),
      new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.8 })
    );
    booth.position.y = 2.3;
    group.add(booth);

    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 18, 14),
      new THREE.MeshStandardMaterial({ color: 0x2a3640, emissive: 0x1b4350, emissiveIntensity: 0.7 })
    );
    lens.position.set(0, 2.5, 1.96);
    group.add(lens);
  } else if (type === "cafe") {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.8, 3.2, 12),
      new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.82 })
    );
    body.position.y = 2;
    group.add(body);

    const awning = new THREE.Mesh(
      new THREE.CylinderGeometry(2.9, 2.9, 0.6, 12, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xfaf2d2, roughness: 0.9 })
    );
    awning.rotation.z = Math.PI / 2;
    awning.position.y = 3.1;
    group.add(awning);
  } else if (type === "arcade") {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 5, 3.6),
      new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.75, emissive: 0x20112f, emissiveIntensity: 0.28 })
    );
    body.position.y = 2.7;
    group.add(body);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 1.7),
      new THREE.MeshStandardMaterial({ color: 0x11161b, emissive: 0x5cf0e2, emissiveIntensity: 1.8 })
    );
    screen.position.set(0, 3.1, 1.86);
    group.add(screen);
  } else if (type === "wheel") {
    const frame = new THREE.Mesh(
      new THREE.TorusGeometry(4.6, 0.35, 10, 18),
      new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.55, metalness: 0.1 })
    );
    frame.rotation.z = Math.PI / 2;
    frame.position.y = 5.1;
    group.add(frame);

    const hub = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 16, 14),
      new THREE.MeshStandardMaterial({ color: 0xfff7e2 })
    );
    hub.position.y = 5.1;
    group.add(hub);

    for (let index = 0; index < 10; index += 1) {
      const t = (index / 10) * Math.PI * 2;
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.8, 0.65),
        new THREE.MeshStandardMaterial({ color: index % 2 === 0 ? 0xff8b7f : 0x71e6d7, roughness: 0.6 })
      );
      cabin.position.set(Math.cos(t) * 4.6, 5.1 + Math.sin(t) * 4.6, 0);
      group.add(cabin);
    }

    const supportA = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, 9.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x6b827f, roughness: 0.85 })
    );
    supportA.position.set(-3.5, 2.5, 0);
    supportA.rotation.z = -0.35;
    group.add(supportA);

    const supportB = supportA.clone();
    supportB.position.x = 3.5;
    supportB.rotation.z = 0.35;
    group.add(supportB);
  }

  const sign = makeLabel(config.label, "#fdf4d6", "#1f2f33", 0.75);
  sign.position.set(0, type === "wheel" ? 11.4 : 6.4, 0.4);
  group.add(sign);

  group.userData = {
    type,
    income: config.income,
    happiness: config.happiness,
    pulse: Math.random() * Math.PI * 2,
    spin: type === "wheel" ? 0.25 : 0.08,
  };

  return group;
}

function clearStructure(plot) {
  if (!plot.userData.structureMesh) {
    return;
  }
  structuresRoot.remove(plot.userData.structureMesh);
  plot.userData.structureMesh = null;
  plot.userData.structureType = null;
  plot.userData.destroyed = false;
  updatePlotVisual(plot);
}

function destroyStructure(plot, fromRemote = false) {
  if (!plot.userData.structureMesh) {
    setMessage("Eggnus: There is nothing here to destroy.", 3);
    return;
  }
  structuresRoot.remove(plot.userData.structureMesh);
  plot.userData.structureMesh = null;
  plot.userData.structureType = null;
  plot.userData.destroyed = true;
  updatePlotVisual(plot);
  rebuildEconomy();
  if (!fromRemote) {
    setMessage("Eggnus: Building removed. Advanced players can do this too.", 4);
    broadcastState();
  }
}

function buyPlot(plot) {
  if (plot.userData.owned) {
    return true;
  }
  if (state.coins < plot.userData.cost) {
    setMessage(`Eggnus: You need $${plot.userData.cost} to buy that plot.`);
    return false;
  }
  state.coins -= plot.userData.cost;
  plot.userData.owned = true;
  plot.userData.destroyed = false;
  updatePlotVisual(plot);
  rebuildEconomy();
  setMessage(`Eggnus: Plot purchased for $${plot.userData.cost}. Now build on it.`);
  return true;
}

function placeStructure(plot, type, fromRemote = false) {
  if (!plot.userData.owned && !buyPlot(plot)) {
    return false;
  }
  if (plot.userData.structureMesh) {
    setMessage("Eggnus: That plot already has a building.", 3);
    return false;
  }
  const config = buildTypes[type];
  if (!fromRemote && state.coins < config.cost) {
    setMessage(`Eggnus: Not enough coins for ${config.label}.`);
    return false;
  }
  if (!fromRemote) {
    state.coins -= config.cost;
  }
  const structure = createAttraction(type, plot);
  plot.userData.structureMesh = structure;
  plot.userData.structureType = type;
  plot.userData.destroyed = false;
  structuresRoot.add(structure);
  updatePlotVisual(plot);
  rebuildEconomy();
  if (!fromRemote) {
    setMessage(`Eggnus: ${config.label} placed.`);
    broadcastState();
  }
  return true;
}

function rebuildTrack() {
  if (!state.track.root) {
    state.track.root = new THREE.Group();
    trackRoot.add(state.track.root);
  }
  if (!state.track.handleRoot) {
    state.track.handleRoot = new THREE.Group();
    trackHandleRoot.add(state.track.handleRoot);
  }

  state.track.root.clear();
  state.track.handleRoot.clear();
  state.track.handles = [];

  const points = state.track.points.map((point) => point.clone());
  state.track.curve = new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.28);

  const trackTube = new THREE.Mesh(
    new THREE.TubeGeometry(state.track.curve, 240, 0.48, 10, true),
    new THREE.MeshStandardMaterial({ color: 0x327f78, roughness: 0.55, metalness: 0.18 })
  );
  state.track.root.add(trackTube);

  const rail = new THREE.Mesh(
    new THREE.TubeGeometry(state.track.curve, 240, 0.18, 8, true),
    new THREE.MeshStandardMaterial({ color: 0x9ad7d1, roughness: 0.4, metalness: 0.1 })
  );
  rail.position.y = 0.34;
  state.track.root.add(rail);

  for (let index = 0; index < 32; index += 1) {
    const t = index / 32;
    const point = state.track.curve.getPointAt(t);
    const supportHeight = Math.max(point.y - 0.5, 0.5);
    const support = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.22, supportHeight, 6),
      new THREE.MeshStandardMaterial({ color: 0x55797a, roughness: 0.8 })
    );
    support.position.set(point.x, supportHeight / 2, point.z);
    state.track.root.add(support);
  }

  state.track.points.forEach((point, index) => {
    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 16, 12),
      new THREE.MeshStandardMaterial({ color: index % 2 === 0 ? 0xffd36f : 0x71e6d7, emissive: 0xf7d36a, emissiveIntensity: 1.1 })
    );
    handle.position.copy(point);
    handle.visible = state.tool === "track";
    handle.userData = { index };
    state.track.handleRoot.add(handle);
    state.track.handles.push(handle);
  });
}

function createEggnusCart() {
  const group = new THREE.Group();

  const fallback = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0x7a5a12, emissiveIntensity: 0.25 })
  );
  fallback.position.y = 2.2;
  group.add(fallback);

  gltfLoader.load(
    "./Eggnus.glb",
    (gltf) => {
      const model = gltf.scene || gltf.scenes[0];
      model.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = false;
          object.receiveShadow = false;
          if (object.material && object.material.map) {
            object.material.map.colorSpace = THREE.SRGBColorSpace;
          }
        }
      });

      const bounds = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      bounds.getSize(size);
      bounds.getCenter(center);

      model.position.sub(center);
      const targetSize = 10;
      const scale = targetSize / Math.max(size.x, size.y, size.z, 0.001);
      model.scale.setScalar(scale);
      model.rotation.y = Math.PI;
      model.position.y += size.y * scale * 0.5;

      group.remove(fallback);
      group.add(model);
    },
    undefined,
    () => {
      setMessage("Eggnus: Eggnus.glb could not be loaded.", 4);
    }
  );

  group.scale.setScalar(1.2);
  return group;
}

function addEggnusToTrack() {
  state.track.eggnus = createEggnusCart();
  trackRoot.add(state.track.eggnus);
}

function updateTrackHandleVisibility() {
  state.track.handles.forEach((handle) => {
    handle.visible = state.tool === "track";
  });
}

function updateTrackPosition(delta, time) {
  if (!state.track.curve || !state.track.eggnus) {
    return;
  }
  state.track.eggnusProgress = (state.track.eggnusProgress + delta * 0.03) % 1;
  const point = state.track.curve.getPointAt(state.track.eggnusProgress);
  const tangent = state.track.curve.getTangentAt(state.track.eggnusProgress).normalize();
  state.track.eggnus.position.copy(point);
  state.track.eggnus.position.y += 0.25 + Math.sin(time * 2.4) * 0.12;
  state.track.eggnus.lookAt(point.clone().add(tangent));
  state.track.eggnus.rotation.z = Math.sin(time * 1.3) * 0.03;
}

function updateWalkCamera(delta) {
  if (!state.walk.active) {
    return;
  }

  const direction = new THREE.Vector3();
  const right = new THREE.Vector3();
  const forward = new THREE.Vector3(Math.sin(state.walk.yaw), 0, Math.cos(state.walk.yaw));
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).multiplyScalar(-1);

  if (state.walk.keys.has("KeyW")) {
    direction.add(forward);
  }
  if (state.walk.keys.has("KeyS")) {
    direction.sub(forward);
  }
  if (state.walk.keys.has("KeyA")) {
    direction.sub(right);
  }
  if (state.walk.keys.has("KeyD")) {
    direction.add(right);
  }
  if (state.walk.keys.has("Space")) {
    direction.y += 1;
  }
  if (state.walk.keys.has("ShiftLeft") || state.walk.keys.has("ShiftRight")) {
    direction.y -= 1;
  }

  if (direction.lengthSq() > 0) {
    direction.normalize();
    const speed = state.walk.keys.has("ControlLeft") ? 7 : 14;
    state.walk.position.addScaledVector(direction, speed * delta);
  }

  state.walk.position.x = clamp(state.walk.position.x, -world.radius + 4, world.radius - 4);
  state.walk.position.z = clamp(state.walk.position.z, -world.radius + 4, world.radius - 4);
  state.walk.position.y = clamp(state.walk.position.y, 2.1, 18);

  camera.position.copy(state.walk.position);
  camera.quaternion.setFromEuler(new THREE.Euler(state.walk.pitch, state.walk.yaw, 0, "YXZ"));
}

function updateOrbitCamera() {
  controls.enabled = state.viewMode === "orbit" && state.tool !== "track";
  if (controls.enabled) {
    controls.update();
  }
}

function updateDecorations(delta, time) {
  state.ambientVisitors.forEach((item) => {
    const visitor = item.mesh || item;
    if (visitor && visitor.userData && visitor.userData.speed) {
      visitor.userData.angle += visitor.userData.speed * delta;
      visitor.userData.wander += delta;
      const radius = visitor.userData.radius + Math.sin(visitor.userData.wander * 0.6) * 2.5;
      visitor.position.set(
        Math.cos(visitor.userData.angle) * radius,
        0.62 + Math.sin(visitor.userData.wander * 3) * 0.16,
        Math.sin(visitor.userData.angle) * radius
      );
    } else if (visitor && visitor.position) {
      visitor.position.y += Math.sin(time * 0.2) * 0.003;
    }
  });

  state.plots.forEach((plot) => {
    if (plot.userData.structureMesh) {
      plot.userData.structureMesh.rotation.y += delta * (plot.userData.structureMesh.userData.spin || 0.08);
      plot.userData.structureMesh.position.y = 0.82 + Math.sin(time * 2 + plot.userData.structureMesh.userData.pulse) * 0.05;
    }
  });

  updateNpcVisitors(delta);
}

function updateBossLine(delta) {
  state.messageTimer -= delta;
  if (state.messageTimer > 0) {
    return;
  }
  state.bossLine = (state.bossLine + 1) % messageQueue.length;
  setMessage(messageQueue[state.bossLine], 8);
}

function updateEconomyAndHud(delta) {
  state.coins += state.income * delta;
  refreshHud();
  updateTaskProgress();
}

function updateScene(delta, time) {
  updateWalkCamera(delta);
  updateOrbitCamera();
  updateTrackPosition(delta, time);
  updateDecorations(delta, time);
  updateRage(delta);
  updateBossLine(delta);
  updateEconomyAndHud(delta);
  parkRoot.rotation.y = Math.sin(time * 0.02) * 0.01;
  skyDome.rotation.y = time * 0.003;
}

function findPlotFromObject(object) {
  let current = object;
  while (current) {
    if (current.userData && current.userData.id && current.userData.cost) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function findHandleFromObject(object) {
  let current = object;
  while (current) {
    if (current.userData && typeof current.userData.index === "number") {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function handlePlotInteraction(plot) {
  if (state.tool === "destroy") {
    destroyStructure(plot);
    broadcastState();
    return;
  }

  if (state.tool === "track") {
    setMessage("Eggnus: That is coaster edit mode. Drag the handles instead.", 3);
    return;
  }

  if (!plot.userData.owned) {
    const bought = buyPlot(plot);
    if (!bought) {
      return;
    }
    broadcastState();
  }

  placeStructure(plot, state.selectedBuild);
  broadcastState();
}

function moveTrackHandle(handle, event) {
  if (!handle) {
    return;
  }
  const rect = canvasRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);
  dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), handle.position);
  if (raycaster.ray.intersectPlane(dragPlane, dragHit)) {
    handle.position.x = clamp(dragHit.x, -world.radius + 12, world.radius - 12);
    handle.position.z = clamp(dragHit.z, -world.radius + 12, world.radius - 12);
    state.track.points[handle.userData.index].copy(handle.position);
    rebuildTrack();
    updateTrackHandleVisibility();
    state.trackEdits += 1;
    broadcastState();
  }
}

function onPointerDown(event) {
  startMusic();
  if (state.viewMode === "walk") {
    activeWalkPointerId = event.pointerId;
    lastWalkPointer = { x: event.clientX, y: event.clientY };
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock?.();
    }
    return;
  }

  const rect = canvasRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);

  if (state.tool === "track") {
    const handleHits = raycaster.intersectObjects(state.track.handles, false);
    if (handleHits.length > 0) {
      draggedHandle = findHandleFromObject(handleHits[0].object);
      return;
    }
  }

  const plotHits = raycaster.intersectObjects(state.plots, true);
  if (plotHits.length > 0) {
    const plot = findPlotFromObject(plotHits[0].object);
    if (plot) {
      handlePlotInteraction(plot);
    }
  }
}

function onPointerMove(event) {
  if (state.viewMode === "walk" && document.pointerLockElement === canvas) {
    state.walk.yaw -= event.movementX * 0.0022;
    state.walk.pitch = clamp(state.walk.pitch - event.movementY * 0.0022, -1.2, 1.2);
    return;
  }

  if (state.viewMode === "walk" && activeWalkPointerId === event.pointerId && lastWalkPointer) {
    const deltaX = event.clientX - lastWalkPointer.x;
    const deltaY = event.clientY - lastWalkPointer.y;
    lastWalkPointer = { x: event.clientX, y: event.clientY };
    state.walk.yaw -= deltaX * 0.006;
    state.walk.pitch = clamp(state.walk.pitch - deltaY * 0.006, -1.2, 1.2);
    return;
  }

  if (state.tool === "track" && draggedHandle) {
    moveTrackHandle(draggedHandle, event);
  }
}

function onPointerUp() {
  draggedHandle = null;
  activeWalkPointerId = null;
  lastWalkPointer = null;
}

function onKeyDown(event) {
  startMusic();
  state.walk.keys.add(event.code);
  if (event.code === "KeyV") {
    setViewMode(state.viewMode === "walk" ? "orbit" : "walk");
  }
  if (event.code === "KeyB") {
    setInteractionMode("build");
  }
  if (event.code === "KeyX") {
    setInteractionMode(state.tool === "destroy" ? "build" : "destroy");
  }
  if (event.code === "KeyT") {
    setInteractionMode(state.tool === "track" ? "build" : "track");
  }
}

function onKeyUp(event) {
  state.walk.keys.delete(event.code);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}

function startMusic() {
  if (musicStarted) {
    return;
  }
  musicStarted = true;
  music.play().catch(() => {
    musicStarted = false;
  });
}

function onBroadcastMessage(event) {
  const payload = event.data;
  if (!payload || payload.sender === clientId || payload.type !== "state") {
    return;
  }
  if (typeof payload.revision === "number" && payload.revision <= state.lastAppliedRevision) {
    return;
  }
  state.lastAppliedRevision = payload.revision || state.lastAppliedRevision;
  applyState(payload.snapshot);
  refreshHud();
  setMessage("Eggnus: Another player updated the park state.", 4);
}

function rebuildAndApplySnapshot(snapshot) {
  if (!snapshot) {
    return;
  }
  applyState(snapshot);
}

function startFromSnapshot() {
  addGround();
  addBuildings();
  addDecorOrbs();
  addVisitors();
  addPlots();
  rebuildTrack();
  addEggnusToTrack();
  updateTrackHandleVisibility();
  rebuildEconomy();

  const initialSnapshot = readInitialSnapshot();
  if (initialSnapshot) {
    rebuildAndApplySnapshot(initialSnapshot);
  } else {
    state.plots.forEach((plot, index) => {
      if (index < 10) {
        plot.userData.owned = true;
        updatePlotVisual(plot);
      }
    });
    rebuildEconomy();
  }
}

function applyLiveLink(urlText) {
  const parsed = parseStateCode(urlText);
  if (parsed) {
    rebuildAndApplySnapshot(parsed);
    broadcastState();
    setMessage("Eggnus: Shared park imported.", 4);
    return true;
  }
  return false;
}

function updateShareUrlFromState() {
  const url = syncShareUrl();
  const current = new URL(window.location.href);
  current.searchParams.set("room", roomId);
  current.hash = url.split("#")[1] || "";
  window.history.replaceState({}, "", current.toString());
}

function openRoomLink() {
  updateShareUrlFromState();
  copyShareCode();
}

buildButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.selectedBuild = button.dataset.build;
    setInteractionMode("build", { silent: true });
    refreshHud();
    setMessage(`Eggnus: ${buildTypes[state.selectedBuild].label} selected.`, 3);
  });
});

resetCameraButton.addEventListener("click", resetCamera);
viewModeButton.addEventListener("click", () => setViewMode(state.viewMode === "walk" ? "orbit" : "walk"));
destroyModeButton.addEventListener("click", () => setInteractionMode(state.tool === "destroy" ? "build" : "destroy"));
editCoasterButton.addEventListener("click", () => setInteractionMode(state.tool === "track" ? "build" : "track"));
reseedButton.addEventListener("click", () => {
  state.seed = Math.random();
  window.location.reload();
});
copyShareButton.addEventListener("click", openRoomLink);
loadShareButton.addEventListener("click", loadSharedCode);
canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointerleave", onPointerUp);
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);
window.addEventListener("resize", onResize);

if (networkState.channel) {
  networkState.channel.addEventListener("message", onBroadcastMessage);
}

setInteractionMode("build", { silent: true });
setViewMode("orbit", { silent: true });
startFromSnapshot();
updateTaskList();
refreshHud();
setMessage("Eggnus: Welcome to EggNus Park. Buy plots, build bigger, and walk the park.", 6);
window.addEventListener("pointerdown", startMusic, { once: true });
window.addEventListener("keydown", startMusic, { once: true });
startMusic();

function animate() {
  const delta = Math.min(sharedClock.getDelta(), 0.033);
  const time = sharedClock.elapsedTime;
  updateScene(delta, time);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
