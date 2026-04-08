// Public "engine" facade exposing only the methods the game code should
// interact with.  Internally this wraps the lower-level helpers defined in
// window.js and other engine modules.  The goal is to hide WebGL details and
// keep game.js focused on high-level setup / loop logic.

import * as collision from './collision.js';

// collision helpers
export const {
    supportHeightAtXZ,
    resolveSphereCollisions,
    resolveSphereMotion
} = collision;
