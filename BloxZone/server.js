const fs = require('fs');
const path = require('path');
const http = require('http');
const { randomUUID } = require('crypto');

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT || 8080);
const ROOT = path.resolve(__dirname);
const SERVER_TTL_MS = 120000;

const servers = [];

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml; charset=utf-8'
};

function now() {
    return Date.now();
}

function makeId() {
    return randomUUID();
}

function withCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
    withCors(res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
            if (body.length > 2 * 1024 * 1024) {
                reject(new Error('Body too large'));
            }
        });
        req.on('end', () => {
            if (!body) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

function cloneServer(server) {
    return {
        ...server,
        players: server.players.map((player) => ({ ...player }))
    };
}

function cleanupStaleServers() {
    const stamp = now();

    for (let i = servers.length - 1; i >= 0; i -= 1) {
        const server = servers[i];
        server.players = server.players.filter((player) => stamp - (player.lastSeenAt || 0) <= SERVER_TTL_MS);

        if (server.players.length === 0 || stamp - (server.updatedAt || 0) > SERVER_TTL_MS) {
            servers.splice(i, 1);
            continue;
        }

        const hostStillPresent = server.players.find((player) => player.clientId === server.hostClientId);
        if (!hostStillPresent) {
            const newHost = server.players[0];
            server.hostClientId = newHost.clientId;
            server.hostUserId = newHost.userId;
            server.hostUsername = newHost.username;
            server.updatedAt = stamp;
        }
    }
}

function listServers(gameId) {
    cleanupStaleServers();
    return servers
        .filter((server) => !gameId || server.gameId === gameId)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(cloneServer);
}

function ensurePlayer(server, payload) {
    let player = server.players.find((entry) => entry.clientId === payload.clientId);
    if (player) {
        player.userId = payload.userId || player.userId;
        player.username = payload.username || player.username;
        player.avatarLook = payload.avatarLook || player.avatarLook;
        player.lastSeenAt = now();
        return { player, created: false };
    }

    if (server.players.length >= server.maxPlayers) {
        return { player: null, created: false, full: true };
    }

    player = {
        clientId: payload.clientId,
        userId: payload.userId || null,
        username: payload.username || 'Guest',
        avatarLook: payload.avatarLook || null,
        state: null,
        joinedAt: now(),
        lastSeenAt: now()
    };
    server.players.push(player);
    return { player, created: true };
}

function createServer(payload) {
    const stamp = now();
    const maxPlayers = Number(payload.maxPlayers) > 0 ? Number(payload.maxPlayers) : 20;

    const server = {
        id: makeId(),
        roomName: payload.roomName || `${payload.username || 'Player'}'s Server`,
        gameId: payload.gameId || 'classic-world',
        maxPlayers,
        hostUserId: payload.userId || null,
        hostClientId: payload.clientId,
        hostUsername: payload.username || 'Guest',
        createdAt: stamp,
        updatedAt: stamp,
        players: [
            {
                clientId: payload.clientId,
                userId: payload.userId || null,
                username: payload.username || 'Guest',
                avatarLook: payload.avatarLook || null,
                state: payload.state || null,
                joinedAt: stamp,
                lastSeenAt: stamp
            }
        ]
    };

    servers.push(server);
    return server;
}

function joinServerById(payload) {
    cleanupStaleServers();

    const server = servers.find((entry) => entry.id === payload.serverId && entry.gameId === (payload.gameId || entry.gameId));
    if (!server) {
        return { success: false, message: 'Server not found.' };
    }

    const joinResult = ensurePlayer(server, payload);
    if (joinResult.full) {
        return { success: false, message: 'Server is full.' };
    }

    server.updatedAt = now();
    return { success: true, server: cloneServer(server), created: false };
}

function joinOrCreate(payload) {
    cleanupStaleServers();

    const gameId = payload.gameId || 'classic-world';
    const openServer = servers
        .filter((server) => server.gameId === gameId)
        .sort((a, b) => a.createdAt - b.createdAt)
        .find((server) => server.players.length < server.maxPlayers || server.players.some((p) => p.clientId === payload.clientId));

    if (openServer) {
        const joinResult = ensurePlayer(openServer, payload);
        if (!joinResult.full) {
            openServer.updatedAt = now();
            return { success: true, server: cloneServer(openServer), created: false };
        }
    }

    const created = createServer(payload);
    return { success: true, server: cloneServer(created), created: true };
}

function leaveServer(payload) {
    cleanupStaleServers();

    const server = servers.find((entry) => entry.id === payload.serverId);
    if (!server) {
        return { success: true };
    }

    server.players = server.players.filter((player) => player.clientId !== payload.clientId);

    if (server.players.length === 0) {
        const idx = servers.findIndex((entry) => entry.id === server.id);
        if (idx >= 0) {
            servers.splice(idx, 1);
        }
        return { success: true };
    }

    if (server.hostClientId === payload.clientId) {
        const newHost = server.players[0];
        server.hostClientId = newHost.clientId;
        server.hostUserId = newHost.userId;
        server.hostUsername = newHost.username;
    }

    server.updatedAt = now();
    return { success: true, server: cloneServer(server) };
}

function updatePlayerState(payload) {
    cleanupStaleServers();

    const server = servers.find((entry) => entry.id === payload.serverId);
    if (!server) {
        return { success: false, message: 'Server not found.' };
    }

    const player = server.players.find((entry) => entry.clientId === payload.clientId);
    if (!player) {
        return { success: false, message: 'Player not in server.' };
    }

    player.state = payload.state || null;
    player.avatarLook = payload.avatarLook || player.avatarLook;
    player.userId = payload.userId || player.userId;
    player.username = payload.username || player.username;
    player.lastSeenAt = now();

    server.updatedAt = now();
    return { success: true };
}

function serveStatic(req, res) {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(requestUrl.pathname);

    if (pathname === '/') {
        pathname = '/index.html';
    }

    const normalized = path.normalize(pathname).replace(/^([.]{2}[/\\])+/, '');
    const filePath = path.join(ROOT, normalized);

    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (statErr, stats) => {
        if (statErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
            return;
        }

        const targetFile = stats.isDirectory() ? path.join(filePath, 'index.html') : filePath;
        fs.readFile(targetFile, (readErr, data) => {
            if (readErr) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Not found');
                return;
            }

            const ext = path.extname(targetFile).toLowerCase();
            res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
            res.end(data);
        });
    });
}

async function handleApi(req, res) {
    if (req.method === 'OPTIONS') {
        withCors(res);
        res.writeHead(204);
        res.end();
        return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = requestUrl.pathname;

    if (req.method === 'GET' && pathname === '/api/health') {
        sendJson(res, 200, { ok: true, time: now() });
        return;
    }

    if (req.method === 'GET' && pathname === '/api/servers') {
        const gameId = requestUrl.searchParams.get('gameId');
        sendJson(res, 200, { servers: listServers(gameId) });
        return;
    }

    const body = await readBody(req);

    if (req.method === 'POST' && pathname === '/api/servers/create') {
        if (!body.clientId) {
            sendJson(res, 400, { success: false, message: 'Missing clientId.' });
            return;
        }

        const created = createServer(body);
        sendJson(res, 200, { success: true, server: cloneServer(created), created: true });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/servers/join') {
        if (!body.clientId || !body.serverId) {
            sendJson(res, 400, { success: false, message: 'Missing serverId or clientId.' });
            return;
        }

        const result = joinServerById(body);
        sendJson(res, result.success ? 200 : 409, result);
        return;
    }

    if (req.method === 'POST' && pathname === '/api/servers/join-or-create') {
        if (!body.clientId) {
            sendJson(res, 400, { success: false, message: 'Missing clientId.' });
            return;
        }

        const result = joinOrCreate(body);
        sendJson(res, result.success ? 200 : 409, result);
        return;
    }

    if (req.method === 'POST' && pathname === '/api/servers/leave') {
        if (!body.clientId || !body.serverId) {
            sendJson(res, 400, { success: false, message: 'Missing serverId or clientId.' });
            return;
        }

        const result = leaveServer(body);
        sendJson(res, 200, result);
        return;
    }

    if (req.method === 'POST' && pathname === '/api/servers/state') {
        if (!body.clientId || !body.serverId) {
            sendJson(res, 400, { success: false, message: 'Missing serverId or clientId.' });
            return;
        }

        const result = updatePlayerState(body);
        sendJson(res, result.success ? 200 : 409, result);
        return;
    }

    sendJson(res, 404, { success: false, message: 'API route not found.' });
}

const server = http.createServer(async (req, res) => {
    try {
        if (req.url.startsWith('/api/')) {
            await handleApi(req, res);
            return;
        }

        serveStatic(req, res);
    } catch (error) {
        sendJson(res, 500, { success: false, message: error.message || 'Internal error' });
    }
});

server.listen(PORT, HOST, () => {
    console.log(`BloxZone server running on http://localhost:${PORT}`);
});
