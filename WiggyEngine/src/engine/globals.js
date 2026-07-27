/* Global variables for Wiggy Editor */

// WGY-ED-V<editor version>-P<patch version>-E<Engine Type BC: BurtCore | CN: CarlNet>
const version_code = "WGY-ED-V002-P001";
const Name = "Wiggy";

const UIColorPal = {
    primary: "#000000",
    secondary: "#000000"
};

const BurtCorePath = "https://wigdos-inc.github.io/102462_wigDos/BurtEngine/BurtCore.min.js";
const CarlNetPath = "https://wigdos-inc.github.io/SloppyCarlGames/engine/v1/Bootup.js";

const EngineType = "BC";

function extractVersionString(string) {
    const str = string.split('-');
    const out = {};

    for (let i = 0; i < str.length; i++) {
        const match = str[i].match(/^([A-Z]+)(\d+)$/);

        if (match) out[match[1]] = match[2];
        else out[str[i]] = '';
    }

    out['WGY'] = Name;
    out['ED'] = 'Editor';

    out['V'] = parseInt(out['V']);
    out['P'] = parseInt(out['P']);

    if (out['BC']) out['BC'] = parseInt(out['BC']);
    if (out['CN']) out['CN'] = parseInt(out['CN']);

    return out;
}

const globalEditorVersion = extractVersionString(version_code);

function getCorePath() {
    switch(project.settings.buildSettings.engineCore) {
        case "BC": return BurtCorePath;
        case "CN": return CarlNetPath;
    }
}
