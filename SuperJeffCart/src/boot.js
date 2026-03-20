const urlParams = new URLSearchParams(window.location.search);
const engineMode = urlParams.get("engine") === "v1" ? "v1" : "legacy";

if (engineMode === "v1") {
    await import("./main_engine_v1.js");
} else {
    await import("./main.js");
}
