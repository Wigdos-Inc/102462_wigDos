const urlParams = new URLSearchParams(window.location.search);
const engineMode = urlParams.get("engine") === "v1" ? "v1" : "legacy";

// if (engineMode === "v1") {
//     await import("./main_engine_v1.js");
// } else {
//     await import("./main.js");
// }

import { StartEngine } from 'https://cdn.jsdelivr.net/gh/Wigdos-Inc/SloppyCarlGames@main/engine/v1/Bootup.js';
StartEngine();

window.addEventListener("UI_REQUEST", (event) => {
    console.log("UI_REQUEST event received:", event);
});

//await import("./main_engine_v1.js");
