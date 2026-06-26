import { buildSuperJeffCartLevelPayload } from "./levelPayload.js";

const characterConfig = {
    superjeff: {
        name: "SuperJeff",
        description: "The original champion with blue shirt and distinctive hair!",
        engineCharacter: "jeff",
    },
    carl: {
        name: "Carl",
        description: "A friendly purple octopus with 8 tentacles, big green eyes, and a cheeky smile!",
        engineCharacter: "carl",
    },
    wally: {
        name: "Wally",
        description: "A tough biker with a yellow helmet, big mustache, and muscular build. Ready to dominate!",
        engineCharacter: "wally",
    },
};

const state = {
    selectedCharacter: "superjeff",
    engine: null,
    raceStarted: false,
    hudIntervalId: null,
};

function byId(id) {
    return document.getElementById(id);
}

function setError(message) {
    let banner = byId("engine-error-banner");
    if (!banner) {
        banner = document.createElement("div");
        banner.id = "engine-error-banner";
        banner.style.position = "fixed";
        banner.style.left = "16px";
        banner.style.right = "16px";
        banner.style.bottom = "16px";
        banner.style.zIndex = "10001";
        banner.style.padding = "12px 16px";
        banner.style.background = "rgba(140, 12, 12, 0.95)";
        banner.style.border = "2px solid #ff8e8e";
        banner.style.borderRadius = "10px";
        banner.style.color = "#fff";
        banner.style.fontFamily = "Arial, sans-serif";
        banner.style.fontSize = "14px";
        document.body.appendChild(banner);
    }

    banner.textContent = message;
}

function clearError() {
    const banner = byId("engine-error-banner");
    if (banner) {
        banner.remove();
    }
}

// function selectCharacter(characterId) {
//     if (!characterConfig[characterId]) {
//         return;
//     }

//     state.selectedCharacter = characterId;

//     byId("btn-superjeff").classList.remove("selected");
//     byId("btn-carl").classList.remove("selected");
//     byId("btn-wally").classList.remove("selected");
//     byId(`btn-${characterId}`).classList.add("selected");

//     const data = characterConfig[characterId];
//     byId("character-desc").innerHTML = `<strong>${data.name}</strong><br>${data.description}`;
// }

function getPlayerSpeed(engine) {
    const playerState = engine.Level.Player.GetState();
    if (!playerState || !playerState.velocity) return 0;

    const vx = Number(playerState.velocity.x) || 0;
    const vz = Number(playerState.velocity.z) || 0;
    const speed = Math.sqrt((vx * vx) + (vz * vz));
    return Math.round(speed * 6);
}

function updateHud(engine) {
    const speedEl = byId("speed");
    if (speedEl) speedEl.textContent = String(getPlayerSpeed(engine));

    const lapEl = byId("current-lap");
    if (lapEl) lapEl.textContent = "1";

    const timeEl = byId("time");
    if (timeEl && !timeEl.dataset.startTimestamp) {
        timeEl.dataset.startTimestamp = String(Date.now());
    }

    if (timeEl) {
        const start = Number(timeEl.dataset.startTimestamp || Date.now());
        const elapsed = (Date.now() - start) / 1000;
        const minutes = Math.floor(elapsed / 60);
        const seconds = Math.floor(elapsed % 60);
        const deciseconds = Math.floor((elapsed % 1) * 10);
        timeEl.textContent = `${minutes}:${String(seconds).padStart(2, "0")}.${deciseconds}`;
    }

    const positionEl = byId("position");
    if (positionEl) positionEl.textContent = "1";

    const totalEl = byId("total-racers");
    if (totalEl) totalEl.textContent = "6";
}

function handlePlayerInput(payload) {
	if (!payload) return;
	const input = ENGINE.Level.Player.Input;
	if (!input) return;
	const code = payload.code || "";

	if (payload.type === "keydown") {
		if (code === "KeyW") { input.forward = 1; }
		if (code === "KeyS") { input.forward = -1; }
		if (code === "KeyA") { input.right = -1; }
		if (code === "KeyD") { input.right = 1; }
		if (code === "Space") { input.jump = true; }
		if (code === "ShiftLeft" || code === "ShiftRight") { input.boost = true; }
		return;
	}

	if (payload.type === "keyup") {
		if (code === "KeyW" && input.forward > 0) { input.forward = 0; }
		if (code === "KeyS" && input.forward < 0) { input.forward = 0; }
		if (code === "KeyA" && input.right < 0) { input.right = 0; }
		if (code === "KeyD" && input.right > 0) { input.right = 0; }
		if (code === "Space") { input.jump = false; }
		if (code === "ShiftLeft" || code === "ShiftRight") { input.boost = false; }
		return;
	}
}

async function requestLevelLoad(engine) {
    const selected = characterConfig[state.selectedCharacter];
    const payload = buildSuperJeffCartLevelPayload({ character: selected.engineCharacter });

    console.log(payload);

    if (engine.Log) {
        engine.Log("GAME", `Loading level with character='${selected.engineCharacter}'.`, "log", "Level");
    }

    const sceneGraph = await engine.Level.CreateLevel(payload, {
        source: "superjeffcart",
        renderOptions: {
            rootId: "engine-level-root",
        },
    });

    if (!sceneGraph) {
        throw new Error("Engine rejected level payload or scene creation failed.");
    }

    if (engine.Audio && typeof engine.Audio.PlayMusic === "function") {
        const src = new URL("../assets/sounds/2. Main Menu.mp3", import.meta.url).href;
        engine.Audio.PlayMusic("SUPER_JEFF_CART_THEME", src, { loop: true, volume: 0.5 });
    }
}

async function startRace() {
    if (state.raceStarted) return;

    state.raceStarted = true;
    clearError();

    const menu = byId("character-select");
    const ui = byId("ui");
    if (menu) menu.style.display = "none";
    if (ui) ui.style.display = "block";

    try {
        const engine = ENGINE;

        if (engine && engine.Config && engine.Config.DEBUG) {
            //engine.Config.DEBUG.SKIP.Splash = true;
            //engine.Config.DEBUG.SKIP.Intro = true;
        }

        //handlePlayerInput(engine);

        if (state.hudIntervalId) {
            window.clearInterval(state.hudIntervalId);
        }

        state.hudIntervalId = window.setInterval(() => {
            updateHud(engine);
        }, 100);

        updateHud(engine);

        await requestLevelLoad(engine);

        console.log(document.getElementById('engine-level-root-canvas'))
    } catch (error) {
        const reason = error && error.message ? error.message : String(error);
        setError(`Kon engine race niet starten. ${reason}`);
        state.raceStarted = false;

        if (menu) menu.style.display = "block";
        if (ui) ui.style.display = "none";
    }
}

function handleUserInput(event) {
    handlePlayerInput(event.detail);
}

const urlParams = new URLSearchParams(window.location.search);
const initialCharacter = urlParams.get("character") || "superjeff";

//if (Object.prototype.hasOwnProperty.call(characterConfig, initialCharacter)) selectCharacter(initialCharacter);
//else selectCharacter("superjeff");

window.addEventListener("USER_INPUT", handleUserInput);

void startRace();
