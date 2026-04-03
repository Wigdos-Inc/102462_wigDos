import { clamp, vec3 } from './math3d.js';
import { createRobloxLikeWorld } from './world.js';
import { getAvatarRenderData } from './customization.js';
import { LegoPlayer } from './player.js';
import { SimpleRenderer } from './render.js';

export class BloxGame {
    constructor(canvas, userId, options = {}) {
        this.canvas = canvas;
        this.userId = userId;
        this.renderer = new SimpleRenderer(canvas);
        this.worldBlocks = createRobloxLikeWorld();
        this.player = new LegoPlayer(getAvatarRenderData(userId));
        this.p2pManager = options.p2pManager || null;
        this.clientId = this.p2pManager ? this.p2pManager.clientId : null;
        this.remotePlayers = new Map();
        this.publishInterval = 0.1;
        this.refreshInterval = 0.1;
        this.publishAccumulator = 0;
        this.refreshAccumulator = 0;

        this.camera = {
            position: vec3(0, 10, -18),
            yaw: 0,
            pitch: 0.28,
            fovScale: 700
        };

        this.orbitYaw = 0;
        this.orbitPitch = 0.28;
        this.debugPivot = false;

        this.input = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };

        this.running = false;
        this.lastTime = 0;

        this.keyDownHandler = (e) => this.onKeyDown(e);
        this.keyUpHandler = (e) => this.onKeyUp(e);
        this.mouseMoveHandler = (e) => this.onMouseMove(e);
        this.canvasClickHandler = () => this.onCanvasClick();
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();

        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('keyup', this.keyUpHandler);
        document.addEventListener('mousemove', this.mouseMoveHandler);
        this.canvas.addEventListener('click', this.canvasClickHandler);

        requestAnimationFrame((t) => this.loop(t));
    }

    stop() {
        this.running = false;
        document.removeEventListener('keydown', this.keyDownHandler);
        document.removeEventListener('keyup', this.keyUpHandler);
        document.removeEventListener('mousemove', this.mouseMoveHandler);
        this.canvas.removeEventListener('click', this.canvasClickHandler);

        if (document.pointerLockElement === this.canvas) {
            document.exitPointerLock();
        }
    }

    onKeyDown(e) {
        const k = e.key.toLowerCase();

        if (k === 'w') this.input.forward = true;
        if (k === 's') this.input.backward = true;
        if (k === 'a') this.input.left = true;
        if (k === 'd') this.input.right = true;
        if (k === ' ') this.input.jump = true;
    }

    onKeyUp(e) {
        const k = e.key.toLowerCase();

        if (k === 'w') this.input.forward = false;
        if (k === 's') this.input.backward = false;
        if (k === 'a') this.input.left = false;
        if (k === 'd') this.input.right = false;
        if (k === ' ') this.input.jump = false;
    }

    onCanvasClick() {
        if (document.pointerLockElement !== this.canvas) {
            this.canvas.requestPointerLock();
        }
    }

    onMouseMove(e) {
        if (document.pointerLockElement !== this.canvas) {
            return;
        }

        const sensitivity = 0.0025;
        this.orbitYaw += e.movementX * sensitivity;
        this.orbitPitch -= e.movementY * sensitivity;
        this.orbitPitch = clamp(this.orbitPitch, -0.25, 1.0);
    }

    loop(now) {
        if (!this.running) return;

        const dt = Math.min(0.033, (now - this.lastTime) / 1000);
        this.lastTime = now;

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        this.player.update(dt, this.input, this.worldBlocks, this.orbitYaw);

        if (this.p2pManager) {
            this.publishAccumulator += dt;
            this.refreshAccumulator += dt;

            if (this.publishAccumulator >= this.publishInterval) {
                this.publishAccumulator = 0;
                this.publishLocalState();
            }

            if (this.refreshAccumulator >= this.refreshInterval) {
                this.refreshAccumulator = 0;
                this.refreshRemotePlayers();
            }
        }

        const pivot = this.player.getCameraPivot();
        const followDistance = 14;
        const horizontal = Math.cos(this.orbitPitch) * followDistance;
        const vertical = Math.sin(this.orbitPitch) * followDistance;

        // Keep the camera exactly on an orbit around the pivot.
        this.camera.position.x = pivot.x - Math.sin(this.orbitYaw) * horizontal;
        this.camera.position.y = pivot.y + vertical;
        this.camera.position.z = pivot.z - Math.cos(this.orbitYaw) * horizontal;

        // Force camera orientation to always look at pivot center.
        const dx = pivot.x - this.camera.position.x;
        const dy = pivot.y - this.camera.position.y;
        const dz = pivot.z - this.camera.position.z;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);

        // Match projection convention in math3d.projectPoint (rotateY then rotateX).
        this.camera.yaw = Math.atan2(-dx, dz);
        this.camera.pitch = Math.atan2(-dy, horizontalDist);
    }

    draw() {
        const playerParts = this.player.getRenderParts();

        for (const remote of this.remotePlayers.values()) {
            if (remote.hasState) {
                playerParts.push(...remote.model.getRenderParts());
            }
        }

        if (this.debugPivot) {
            playerParts.push({
                type: 'box',
                center: this.player.getCameraPivot(),
                size: vec3(0.18, 0.18, 0.18),
                color: '#ff00ff',
                rotationY: 0,
                solid: false
            });
        }

        this.renderer.drawScene(this.camera, this.worldBlocks, playerParts);
    }

    publishLocalState() {
        if (!this.p2pManager) {
            return;
        }

        this.p2pManager.setAvatarLook(this.player.avatarLook);
        this.p2pManager.updateMyState({
            position: {
                x: this.player.position.x,
                y: this.player.position.y,
                z: this.player.position.z
            },
            velocity: {
                x: this.player.velocity.x,
                y: this.player.velocity.y,
                z: this.player.velocity.z
            },
            facingYaw: this.player.facingYaw,
            walkTime: this.player.walkTime,
            grounded: this.player.grounded
        });
    }

    refreshRemotePlayers() {
        if (!this.p2pManager) {
            return;
        }

        const peers = this.p2pManager.getConnectedPeers();
        const activeIds = new Set();

        for (let i = 0; i < peers.length; i += 1) {
            const peer = peers[i];
            const peerClientId = peer.clientId || `legacy-${peer.userId || i}`;

            if (peerClientId === this.clientId) {
                continue;
            }

            activeIds.add(peerClientId);

            const avatarLook = peer.avatarLook || (peer.userId ? getAvatarRenderData(peer.userId) : this.player.avatarLook);
            let remote = this.remotePlayers.get(peerClientId);
            if (!remote) {
                remote = {
                    model: new LegoPlayer(avatarLook),
                    hasState: false
                };
                this.remotePlayers.set(peerClientId, remote);
            } else {
                remote.model.avatarLook = avatarLook;
            }

            if (peer.state && peer.state.position) {
                remote.model.position.x = peer.state.position.x;
                remote.model.position.y = peer.state.position.y;
                remote.model.position.z = peer.state.position.z;

                if (peer.state.velocity) {
                    remote.model.velocity.x = peer.state.velocity.x;
                    remote.model.velocity.y = peer.state.velocity.y;
                    remote.model.velocity.z = peer.state.velocity.z;
                }

                remote.model.facingYaw = peer.state.facingYaw || 0;
                remote.model.walkTime = peer.state.walkTime || 0;
                remote.model.grounded = peer.state.grounded !== false;
                remote.hasState = true;
            }
        }

        for (const id of this.remotePlayers.keys()) {
            if (!activeIds.has(id)) {
                this.remotePlayers.delete(id);
            }
        }
    }
}
