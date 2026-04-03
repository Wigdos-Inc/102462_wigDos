// Cross-browser room registry with cloud DB or backend API support.
// Falls back to local browser-only mode when no shared transport is available.
(function bootstrapP2P(global) {
    const STORAGE_KEY = 'bloxzoneServers';
    const CHANNEL_NAME = 'bloxzone-p2p';
    const DEFAULT_GAME_ID = 'classic-world';
    const DEFAULT_MAX_PLAYERS = 20;
    const SERVER_TTL_MS = 120000;
    const REMOTE_POLL_MS = 1000;

    class P2PManager {
        constructor(userId, username, options = {}) {
            const cloudConfig = global.BLOXZONE_CLOUD || {};

            this.userId = userId || null;
            this.username = username || 'Guest';
            this.gameId = options.gameId || DEFAULT_GAME_ID;
            this.maxPlayers = options.maxPlayers || DEFAULT_MAX_PLAYERS;
            this.avatarLook = options.avatarLook || null;
            this.clientId = options.clientId || makeId();
            this.apiBase = options.apiBase || defaultApiBase();
            this.cloudDbUrl = (options.cloudDbUrl || cloudConfig.dbUrl || '').replace(/\/$/, '');
            this.cloudAuthToken = options.cloudAuthToken || cloudConfig.authToken || '';
            this.cloudNamespace = options.cloudNamespace || cloudConfig.namespace || 'bloxzone';

            this.mode = 'local';
            this.initialized = false;
            this.roomId = null;
            this.currentServerSnapshot = null;
            this.cachedServers = [];
            this.lastCloudCleanupAt = 0;

            this.onListChangeCallbacks = [];
            this.boundStorageHandler = (event) => this.handleStorageEvent(event);
            this.channel = null;
            this.heartbeatTimer = null;
            this.remotePollTimer = null;

            this.pendingState = null;
            this.stateRequestInFlight = false;
        }

        async initialize() {
            if (this.initialized) {
                return this.userId;
            }
            this.initialized = true;

            if (this.hasCloudConfig() && await this.canUseCloud()) {
                this.mode = 'cloud';
                await this.refreshServerList();
                this.startRemotePolling();
                this.emitListChange();
                return this.userId;
            }

            if (await this.canUseRemote()) {
                this.mode = 'remote';
                await this.refreshServerList();
                this.startRemotePolling();
                this.emitListChange();
                return this.userId;
            }

            this.mode = 'local';
            this.cleanupStaleServers();
            window.addEventListener('storage', this.boundStorageHandler);

            if (typeof BroadcastChannel !== 'undefined') {
                this.channel = new BroadcastChannel(CHANNEL_NAME);
                this.channel.onmessage = () => this.emitListChange();
            }

            this.startHeartbeat();
            this.emitListChange();
            return this.userId;
        }

        hasCloudConfig() {
            return Boolean(this.cloudDbUrl);
        }

        async canUseCloud() {
            if (!this.hasCloudConfig()) {
                return false;
            }

            try {
                const response = await fetch(this.buildCloudUrl('servers'), {
                    method: 'GET',
                    cache: 'no-store'
                });
                return response.ok;
            } catch (error) {
                return false;
            }
        }

        async canUseRemote() {
            try {
                const response = await fetch(`${this.apiBase}/health`, {
                    method: 'GET',
                    cache: 'no-store'
                });
                return response.ok;
            } catch (error) {
                return false;
            }
        }

        async createRoom(roomName = 'Classic Room') {
            this.requireUser();
            if (this.mode !== 'local') {
                return this.remoteCreateRoom(roomName);
            }

            this.cleanupStaleServers();
            const servers = this.readServers();
            const now = Date.now();
            const server = {
                id: makeId(),
                roomName,
                gameId: this.gameId,
                maxPlayers: this.maxPlayers,
                hostUserId: this.userId,
                hostClientId: this.clientId,
                hostUsername: this.username,
                createdAt: now,
                updatedAt: now,
                players: [
                    {
                        clientId: this.clientId,
                        userId: this.userId,
                        username: this.username,
                        avatarLook: this.avatarLook,
                        state: null,
                        joinedAt: now,
                        lastSeenAt: now
                    }
                ]
            };

            this.roomId = server.id;
            this.currentServerSnapshot = server;
            servers.push(server);
            this.writeServers(servers);

            return {
                success: true,
                roomId: server.id,
                roomName: server.roomName,
                maxPlayers: server.maxPlayers,
                playerCount: server.players.length,
                created: true
            };
        }

        joinRoom(roomId) {
            return this.joinServer(roomId);
        }

        async joinServer(roomId) {
            this.requireUser();
            if (this.mode !== 'local') {
                return this.remoteJoinServer(roomId);
            }

            this.cleanupStaleServers();
            const servers = this.readServers();
            const server = servers.find((entry) => entry.id === roomId && entry.gameId === this.gameId);

            if (!server) {
                return { success: false, message: 'Server not found.' };
            }

            const existing = server.players.find((p) => p.clientId === this.clientId);
            if (existing) {
                existing.lastSeenAt = Date.now();
                existing.avatarLook = this.avatarLook;
                this.roomId = server.id;
                this.currentServerSnapshot = server;
                server.updatedAt = Date.now();
                this.writeServers(servers);
                return { success: true, roomId: server.id, created: false, rejoined: true };
            }

            if (server.players.length >= server.maxPlayers) {
                return { success: false, message: 'Server is full.' };
            }

            server.players.push({
                clientId: this.clientId,
                userId: this.userId,
                username: this.username,
                avatarLook: this.avatarLook,
                state: null,
                joinedAt: Date.now(),
                lastSeenAt: Date.now()
            });
            server.updatedAt = Date.now();

            this.roomId = server.id;
            this.currentServerSnapshot = server;
            this.writeServers(servers);

            return {
                success: true,
                roomId: server.id,
                roomName: server.roomName,
                playerCount: server.players.length,
                maxPlayers: server.maxPlayers,
                created: false
            };
        }

        async joinOrCreateServer() {
            this.requireUser();
            if (this.mode !== 'local') {
                return this.remoteJoinOrCreateServer();
            }

            this.cleanupStaleServers();
            const servers = this.getServerList(this.gameId);
            const openServer = servers.find((server) => server.players.length < server.maxPlayers);

            if (openServer) {
                const joined = await this.joinServer(openServer.id);
                if (joined.success) {
                    return joined;
                }
            }

            return this.createRoom(`${this.username}'s Server`);
        }

        async leaveCurrentServer() {
            if (!this.userId || !this.roomId) {
                return;
            }

            if (this.mode !== 'local') {
                const oldRoom = this.roomId;
                this.roomId = null;
                this.currentServerSnapshot = null;

                try {
                    await this.remoteRequest('/servers/leave', {
                        serverId: oldRoom,
                        clientId: this.clientId,
                        userId: this.userId
                    }, 'POST', { keepalive: true });
                } catch (error) {
                    // Ignore leave errors during unload.
                }

                this.refreshServerList();
                return;
            }

            const servers = this.readServers();
            const index = servers.findIndex((entry) => entry.id === this.roomId);

            if (index === -1) {
                this.roomId = null;
                this.currentServerSnapshot = null;
                return;
            }

            const server = servers[index];
            server.players = server.players.filter((p) => p.clientId !== this.clientId);

            if (server.players.length === 0) {
                servers.splice(index, 1);
            } else {
                if (server.hostClientId === this.clientId) {
                    const newHost = server.players[0];
                    server.hostClientId = newHost.clientId;
                    server.hostUserId = newHost.userId;
                    server.hostUsername = newHost.username;
                }
                server.updatedAt = Date.now();
            }

            this.roomId = null;
            this.currentServerSnapshot = null;
            this.writeServers(servers);
        }

        getCurrentServer() {
            if (!this.roomId) {
                return null;
            }

            if (this.mode !== 'local') {
                const found = this.cachedServers.find((entry) => entry.id === this.roomId) || null;
                return found || this.currentServerSnapshot;
            }

            const servers = this.readServers();
            return servers.find((entry) => entry.id === this.roomId) || null;
        }

        getServerList(gameId = this.gameId) {
            if (this.mode !== 'local') {
                return this.cachedServers
                    .filter((server) => server.gameId === gameId)
                    .sort((a, b) => a.createdAt - b.createdAt);
            }

            this.cleanupStaleServers();
            const servers = this.readServers();
            return servers
                .filter((server) => server.gameId === gameId)
                .sort((a, b) => a.createdAt - b.createdAt);
        }

        async refreshServerList() {
            if (this.mode !== 'local') {
                return this.fetchRemoteServers();
            }

            this.cleanupStaleServers();
            const list = this.getServerList(this.gameId);
            this.emitListChange();
            return list;
        }

        onServerListChanged(callback) {
            if (typeof callback === 'function') {
                this.onListChangeCallbacks.push(callback);
            }
        }

        broadcast() {}
        send() {}

        disconnect() {
            this.stopRemotePolling();
            this.stopHeartbeat();

            if (this.channel) {
                this.channel.close();
                this.channel = null;
            }
            window.removeEventListener('storage', this.boundStorageHandler);
        }

        getConnectedPeers() {
            const current = this.getCurrentServer();
            return current ? current.players.slice() : [];
        }

        setAvatarLook(avatarLook) {
            this.avatarLook = avatarLook || null;
        }

        updateMyState(state) {
            if (!this.roomId) {
                return false;
            }

            if (this.mode !== 'local') {
                this.pendingState = state || null;
                this.flushRemoteState();
                return true;
            }

            const servers = this.readServers();
            const server = servers.find((entry) => entry.id === this.roomId && entry.gameId === this.gameId);
            if (!server) {
                this.roomId = null;
                this.currentServerSnapshot = null;
                return false;
            }

            const me = server.players.find((player) => player.clientId === this.clientId);
            if (!me) {
                return false;
            }

            me.state = state || null;
            me.avatarLook = this.avatarLook;
            me.lastSeenAt = Date.now();
            server.updatedAt = Date.now();

            this.currentServerSnapshot = server;
            this.writeServers(servers, false);
            return true;
        }

        async flushRemoteState() {
            if (this.stateRequestInFlight || !this.pendingState || !this.roomId) {
                return;
            }

            this.stateRequestInFlight = true;
            const nextState = this.pendingState;
            this.pendingState = null;

            try {
                await this.remoteRequest('/servers/state', {
                    serverId: this.roomId,
                    clientId: this.clientId,
                    userId: this.userId,
                    username: this.username,
                    avatarLook: this.avatarLook,
                    state: nextState
                });
            } catch (error) {
                // Ignore transient network errors for state updates.
            } finally {
                this.stateRequestInFlight = false;
                if (this.pendingState) {
                    this.flushRemoteState();
                }
            }
        }

        async remoteCreateRoom(roomName) {
            const payload = await this.remoteRequest('/servers/create', {
                roomName,
                gameId: this.gameId,
                maxPlayers: this.maxPlayers,
                clientId: this.clientId,
                userId: this.userId,
                username: this.username,
                avatarLook: this.avatarLook
            });

            if (!payload.success || !payload.server) {
                return { success: false, message: payload.message || 'Could not create server.' };
            }

            this.roomId = payload.server.id;
            this.currentServerSnapshot = payload.server;
            await this.fetchRemoteServers();

            return {
                success: true,
                roomId: payload.server.id,
                roomName: payload.server.roomName,
                maxPlayers: payload.server.maxPlayers,
                playerCount: payload.server.players.length,
                created: true
            };
        }

        async remoteJoinServer(roomId) {
            const payload = await this.remoteRequest('/servers/join', {
                serverId: roomId,
                gameId: this.gameId,
                clientId: this.clientId,
                userId: this.userId,
                username: this.username,
                avatarLook: this.avatarLook
            });

            if (!payload.success || !payload.server) {
                return { success: false, message: payload.message || 'Could not join server.' };
            }

            this.roomId = payload.server.id;
            this.currentServerSnapshot = payload.server;
            await this.fetchRemoteServers();

            return {
                success: true,
                roomId: payload.server.id,
                roomName: payload.server.roomName,
                maxPlayers: payload.server.maxPlayers,
                playerCount: payload.server.players.length,
                created: false
            };
        }

        async remoteJoinOrCreateServer() {
            const payload = await this.remoteRequest('/servers/join-or-create', {
                gameId: this.gameId,
                maxPlayers: this.maxPlayers,
                clientId: this.clientId,
                userId: this.userId,
                username: this.username,
                avatarLook: this.avatarLook
            });

            if (!payload.success || !payload.server) {
                return { success: false, message: payload.message || 'Could not join or create server.' };
            }

            this.roomId = payload.server.id;
            this.currentServerSnapshot = payload.server;
            await this.fetchRemoteServers();

            return {
                success: true,
                roomId: payload.server.id,
                roomName: payload.server.roomName,
                maxPlayers: payload.server.maxPlayers,
                playerCount: payload.server.players.length,
                created: payload.created === true
            };
        }

        async fetchRemoteServers() {
            if (this.mode === 'cloud') {
                const serversPayload = await this.cloudGet('servers');
                let rawById = (serversPayload && typeof serversPayload === 'object') ? serversPayload : {};

                if (Date.now() - this.lastCloudCleanupAt > 10000) {
                    rawById = await this.cleanupCloudServers(rawById);
                    this.lastCloudCleanupAt = Date.now();
                }

                const nextList = [];
                const ids = Object.keys(rawById);
                for (let i = 0; i < ids.length; i += 1) {
                    const id = ids[i];
                    const raw = rawById[id];
                    if (!raw) {
                        continue;
                    }
                    nextList.push(this.normalizeServer({ id, ...raw }));
                }

                const before = JSON.stringify(this.cachedServers);
                this.cachedServers = nextList.sort((a, b) => a.createdAt - b.createdAt);

                if (this.roomId) {
                    this.currentServerSnapshot = this.cachedServers.find((entry) => entry.id === this.roomId) || null;
                    if (!this.currentServerSnapshot) {
                        this.roomId = null;
                    }
                }

                if (before !== JSON.stringify(this.cachedServers)) {
                    this.emitListChange();
                }

                return this.cachedServers;
            }

            const response = await fetch(`${this.apiBase}/servers?gameId=${encodeURIComponent(this.gameId)}`, {
                method: 'GET',
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch server list.');
            }

            const payload = await response.json();
            const nextList = Array.isArray(payload.servers) ? payload.servers : [];
            const before = JSON.stringify(this.cachedServers);
            this.cachedServers = nextList.sort((a, b) => a.createdAt - b.createdAt);

            if (this.roomId) {
                this.currentServerSnapshot = this.cachedServers.find((entry) => entry.id === this.roomId) || null;
                if (!this.currentServerSnapshot) {
                    this.roomId = null;
                }
            }

            if (before !== JSON.stringify(this.cachedServers)) {
                this.emitListChange();
            }

            return this.cachedServers;
        }

        startRemotePolling() {
            this.stopRemotePolling();
            this.remotePollTimer = window.setInterval(async () => {
                try {
                    await this.fetchRemoteServers();
                } catch (error) {
                    // Keep previous list when polling fails.
                }
            }, REMOTE_POLL_MS);
        }

        stopRemotePolling() {
            if (this.remotePollTimer) {
                window.clearInterval(this.remotePollTimer);
                this.remotePollTimer = null;
            }
        }

        async remoteRequest(path, body, method = 'POST', options = {}) {
            if (this.mode === 'cloud') {
                return this.cloudRequest(path, body, method, options);
            }

            const response = await fetch(`${this.apiBase}${path}`, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body || {}),
                keepalive: options.keepalive === true
            });

            let payload = {};
            try {
                payload = await response.json();
            } catch (error) {
                payload = {};
            }

            if (!response.ok) {
                throw new Error(payload.message || `Request failed: ${response.status}`);
            }

            return payload;
        }

        async cloudRequest(path, body, method = 'POST', options = {}) {
            const stamp = Date.now();

            if (method !== 'POST') {
                throw new Error('Cloud mode only supports POST for matchmaking mutations.');
            }

            if (path === '/servers/create') {
                const serverId = makeId();
                const maxPlayers = Number(body.maxPlayers) > 0 ? Number(body.maxPlayers) : this.maxPlayers;
                const server = {
                    roomName: body.roomName || `${this.username}'s Server`,
                    gameId: body.gameId || this.gameId,
                    maxPlayers,
                    hostUserId: body.userId || this.userId,
                    hostClientId: body.clientId || this.clientId,
                    hostUsername: body.username || this.username,
                    createdAt: stamp,
                    updatedAt: stamp,
                    players: {
                        [body.clientId || this.clientId]: {
                            clientId: body.clientId || this.clientId,
                            userId: body.userId || this.userId,
                            username: body.username || this.username,
                            avatarLook: body.avatarLook || this.avatarLook,
                            state: body.state || null,
                            joinedAt: stamp,
                            lastSeenAt: stamp
                        }
                    }
                };

                await this.cloudPut(`servers/${serverId}`, server, options);
                return { success: true, created: true, server: this.normalizeServer({ id: serverId, ...server }) };
            }

            if (path === '/servers/join') {
                const serverId = body.serverId;
                const raw = await this.cloudGet(`servers/${serverId}`);
                if (!raw || (body.gameId && raw.gameId !== body.gameId)) {
                    return { success: false, message: 'Server not found.' };
                }

                const players = this.toPlayerMap(raw.players);
                const existing = players[body.clientId || this.clientId];
                const playerCount = Object.keys(players).length;

                if (!existing && playerCount >= (raw.maxPlayers || this.maxPlayers)) {
                    return { success: false, message: 'Server is full.' };
                }

                players[body.clientId || this.clientId] = {
                    clientId: body.clientId || this.clientId,
                    userId: body.userId || this.userId,
                    username: body.username || this.username,
                    avatarLook: body.avatarLook || this.avatarLook,
                    state: existing ? existing.state || null : null,
                    joinedAt: existing ? existing.joinedAt || stamp : stamp,
                    lastSeenAt: stamp
                };

                raw.players = players;
                raw.updatedAt = stamp;
                if (!raw.hostClientId || !players[raw.hostClientId]) {
                    const firstPlayerId = Object.keys(players)[0];
                    raw.hostClientId = firstPlayerId;
                    raw.hostUserId = players[firstPlayerId].userId;
                    raw.hostUsername = players[firstPlayerId].username;
                }

                await this.cloudPut(`servers/${serverId}`, raw, options);
                return { success: true, created: false, server: this.normalizeServer({ id: serverId, ...raw }) };
            }

            if (path === '/servers/join-or-create') {
                const serversPayload = await this.cloudGet('servers');
                const rawById = (serversPayload && typeof serversPayload === 'object') ? serversPayload : {};

                const ids = Object.keys(rawById)
                    .filter((id) => rawById[id] && rawById[id].gameId === (body.gameId || this.gameId))
                    .sort((a, b) => (rawById[a].createdAt || 0) - (rawById[b].createdAt || 0));

                for (let i = 0; i < ids.length; i += 1) {
                    const id = ids[i];
                    const raw = rawById[id];
                    const players = this.toPlayerMap(raw.players);
                    const count = Object.keys(players).length;
                    const mineExists = Boolean(players[body.clientId || this.clientId]);
                    if (mineExists || count < (raw.maxPlayers || this.maxPlayers)) {
                        const joined = await this.cloudRequest('/servers/join', {
                            ...body,
                            serverId: id
                        }, 'POST', options);
                        if (joined.success) {
                            return joined;
                        }
                    }
                }

                return this.cloudRequest('/servers/create', {
                    ...body,
                    roomName: `${body.username || this.username}'s Server`
                }, 'POST', options);
            }

            if (path === '/servers/leave') {
                const serverId = body.serverId;
                const raw = await this.cloudGet(`servers/${serverId}`);
                if (!raw) {
                    return { success: true };
                }

                const players = this.toPlayerMap(raw.players);
                delete players[body.clientId || this.clientId];

                if (Object.keys(players).length === 0) {
                    await this.cloudDelete(`servers/${serverId}`, options);
                    return { success: true };
                }

                raw.players = players;
                raw.updatedAt = stamp;
                if (!players[raw.hostClientId]) {
                    const firstPlayerId = Object.keys(players)[0];
                    raw.hostClientId = firstPlayerId;
                    raw.hostUserId = players[firstPlayerId].userId;
                    raw.hostUsername = players[firstPlayerId].username;
                }

                await this.cloudPut(`servers/${serverId}`, raw, options);
                return { success: true, server: this.normalizeServer({ id: serverId, ...raw }) };
            }

            if (path === '/servers/state') {
                const serverId = body.serverId;
                const clientId = body.clientId || this.clientId;

                const raw = await this.cloudGet(`servers/${serverId}`);
                if (!raw || !raw.roomName) {
                    return { success: false, message: 'Server not found.' };
                }

                const players = this.toPlayerMap(raw.players);
                if (!players[clientId]) {
                    return { success: false, message: 'Player not in server.' };
                }

                players[clientId] = {
                    ...players[clientId],
                    clientId,
                    userId: body.userId || this.userId,
                    username: body.username || this.username,
                    avatarLook: body.avatarLook || this.avatarLook,
                    state: body.state || null,
                    lastSeenAt: stamp
                };

                raw.players = players;
                raw.updatedAt = stamp;
                await this.cloudPut(`servers/${serverId}`, raw, options);

                return { success: true };
            }

            throw new Error(`Unsupported cloud request path: ${path}`);
        }

        normalizeServer(server) {
            if (!server) {
                return null;
            }

            const normalized = { ...server };
            const players = normalized.players;

            if (Array.isArray(players)) {
                normalized.players = players.slice().sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
            } else if (players && typeof players === 'object') {
                const ids = Object.keys(players);
                normalized.players = ids
                    .map((id) => ({ clientId: id, ...players[id] }))
                    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
            } else {
                normalized.players = [];
            }

            return normalized;
        }

        toPlayerMap(players) {
            if (Array.isArray(players)) {
                const map = {};
                for (let i = 0; i < players.length; i += 1) {
                    const player = players[i];
                    if (player && player.clientId) {
                        map[player.clientId] = player;
                    }
                }
                return map;
            }

            if (players && typeof players === 'object') {
                return { ...players };
            }

            return {};
        }

        async cleanupCloudServers(rawById) {
            const cleaned = { ...rawById };
            const stamp = Date.now();
            const ids = Object.keys(cleaned);

            for (let i = 0; i < ids.length; i += 1) {
                const id = ids[i];
                const raw = cleaned[id];
                if (!raw) {
                    continue;
                }

                const players = this.toPlayerMap(raw.players);
                const playerIds = Object.keys(players);

                for (let j = 0; j < playerIds.length; j += 1) {
                    const playerId = playerIds[j];
                    const player = players[playerId];
                    if (!player || stamp - (player.lastSeenAt || 0) > SERVER_TTL_MS) {
                        delete players[playerId];
                    }
                }

                const remainingIds = Object.keys(players);
                if (remainingIds.length === 0 || stamp - (raw.updatedAt || 0) > SERVER_TTL_MS) {
                    await this.cloudDelete(`servers/${id}`);
                    delete cleaned[id];
                    continue;
                }

                let changed = false;
                if (remainingIds.length !== playerIds.length) {
                    changed = true;
                }

                if (!players[raw.hostClientId]) {
                    const firstId = remainingIds[0];
                    raw.hostClientId = firstId;
                    raw.hostUserId = players[firstId].userId;
                    raw.hostUsername = players[firstId].username;
                    changed = true;
                }

                if (changed) {
                    raw.players = players;
                    raw.updatedAt = stamp;
                    await this.cloudPut(`servers/${id}`, raw);
                    cleaned[id] = raw;
                }
            }

            return cleaned;
        }

        buildCloudUrl(path) {
            const params = new URLSearchParams();
            if (this.cloudAuthToken) {
                params.set('auth', this.cloudAuthToken);
            }

            const query = params.toString();
            const suffix = query ? `?${query}` : '';
            return `${this.cloudDbUrl}/${this.cloudNamespace}/${path}.json${suffix}`;
        }

        async cloudGet(path) {
            const response = await fetch(this.buildCloudUrl(path), {
                method: 'GET',
                cache: 'no-store'
            });
            if (!response.ok) {
                throw new Error(`Cloud GET failed (${response.status})`);
            }
            return response.json();
        }

        async cloudPut(path, value, options = {}) {
            const response = await fetch(this.buildCloudUrl(path), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(value),
                keepalive: options.keepalive === true
            });
            if (!response.ok) {
                throw new Error(`Cloud PUT failed (${response.status})`);
            }
            return response.json();
        }

        async cloudPatch(path, value, options = {}) {
            const response = await fetch(this.buildCloudUrl(path), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(value),
                keepalive: options.keepalive === true
            });
            if (!response.ok) {
                throw new Error(`Cloud PATCH failed (${response.status})`);
            }
            return response.json();
        }

        async cloudDelete(path, options = {}) {
            const response = await fetch(this.buildCloudUrl(path), {
                method: 'DELETE',
                keepalive: options.keepalive === true
            });
            if (!response.ok) {
                throw new Error(`Cloud DELETE failed (${response.status})`);
            }
            return response.json();
        }

        requireUser() {
            if (!this.userId) {
                throw new Error('P2PManager requires a logged-in user.');
            }
        }

        readServers() {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        }

        writeServers(servers, emitListChange = true) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
            this.notifyBroadcast();
            if (emitListChange) {
                this.emitListChange();
            }
        }

        notifyBroadcast() {
            if (this.channel) {
                this.channel.postMessage({ type: 'servers-updated', at: Date.now() });
            }
        }

        emitListChange() {
            const list = this.getServerList(this.gameId);
            for (let i = 0; i < this.onListChangeCallbacks.length; i += 1) {
                this.onListChangeCallbacks[i](list);
            }
        }

        handleStorageEvent(event) {
            if (event.key === STORAGE_KEY) {
                this.emitListChange();
            }
        }

        startHeartbeat() {
            this.stopHeartbeat();
            this.heartbeatTimer = window.setInterval(() => {
                if (!this.userId || !this.roomId) {
                    this.cleanupStaleServers();
                    return;
                }

                const servers = this.readServers();
                const server = servers.find((entry) => entry.id === this.roomId);
                if (!server) {
                    this.roomId = null;
                    this.currentServerSnapshot = null;
                    return;
                }

                const me = server.players.find((player) => player.clientId === this.clientId);
                if (me) {
                    me.lastSeenAt = Date.now();
                    me.avatarLook = this.avatarLook;
                    server.updatedAt = Date.now();
                    this.currentServerSnapshot = server;
                    this.writeServers(servers, false);
                }
            }, 10000);
        }

        stopHeartbeat() {
            if (this.heartbeatTimer) {
                window.clearInterval(this.heartbeatTimer);
                this.heartbeatTimer = null;
            }
        }

        cleanupStaleServers() {
            const before = this.readServers();
            const now = Date.now();
            let changed = false;

            for (let i = before.length - 1; i >= 0; i -= 1) {
                const server = before[i];
                const previousLength = server.players.length;

                server.players = server.players.filter((player) => now - (player.lastSeenAt || 0) <= SERVER_TTL_MS);
                if (server.players.length !== previousLength) {
                    changed = true;
                }

                if (server.players.length === 0 || now - (server.updatedAt || 0) > SERVER_TTL_MS) {
                    before.splice(i, 1);
                    changed = true;
                    continue;
                }

                const hostStillPresent = server.players.find((player) => player.clientId === server.hostClientId);
                if (!hostStillPresent && server.players.length > 0) {
                    server.hostClientId = server.players[0].clientId;
                    server.hostUserId = server.players[0].userId;
                    server.hostUsername = server.players[0].username;
                    server.updatedAt = now;
                    changed = true;
                }
            }

            if (changed) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(before));
                this.notifyBroadcast();
            }
        }
    }

    function defaultApiBase() {
        if (global.location && global.location.protocol === 'file:') {
            return 'http://localhost:8080/api';
        }
        if (global.location && global.location.origin) {
            return `${global.location.origin}/api`;
        }
        return '/api';
    }

    function makeId() {
        if (global.crypto && typeof global.crypto.randomUUID === 'function') {
            return global.crypto.randomUUID();
        }
        return `srv-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    }

    global.P2PManager = P2PManager;
})(window);
