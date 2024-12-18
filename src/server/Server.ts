import express, { json } from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameManager } from './GameManager';
import { ClientMessage, ClientMessageSchema, GameRecord, GameRecordSchema, LogSeverity } from '../core/Schemas';
import { getConfig } from '../core/configuration/Config';
import { slog } from './StructuredLog';
import { Client } from './Client';
import { GamePhase, GameServer } from './GameServer';
import { archive } from './Archive';
import { DiscordBot } from './DiscordBot';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve static files from the 'out' directory
app.use(express.static(path.join(__dirname, '../../out')));
app.use(express.json())

const gm = new GameManager(getConfig())

const bot = new DiscordBot();
try {
    await bot.start();
} catch (error) {
    console.error('Failed to start bot:', error);
}

// New GET endpoint to list lobbies
app.get('/lobbies', (req, res) => {
    const now = Date.now()
    res.json({
        lobbies: gm.gamesByPhase(GamePhase.Lobby)
            .filter(g => g.isPublic)
            .map(g => ({ id: g.id, msUntilStart: g.startTime() - now, numClients: g.numClients() }))
            .sort((a, b) => a.msUntilStart - b.msUntilStart),
    });
});

app.post('/private_lobby', (req, res) => {
    const id = gm.createPrivateGame()
    console.logx('creating private lobby with id ${id}')
    res.json({
        id: id
    });
});

app.post('/archive_singleplayer_game', (req, res) => {
    try {
        const gameRecord: GameRecord = req.body
        const clientIP = req.ip || req.socket.remoteAddress || 'unknown';  // Added this line


        if (!gameRecord) {
            console.log('game record not found in request')
            res.status(404).json({ error: 'Game record not found' });
            return;
        }
        gameRecord.players.forEach(p => p.ip = clientIP)
        GameRecordSchema.parse(gameRecord);
        archive(gameRecord)
        res.json({
            success: true,
        });
    } catch (error) {
        slog({
            logKey: 'complete_single_player_game_record',
            msg: `Failed to complete game record: ${error}`,
            severity: LogSeverity.Error,
        });
        res.status(400).json({ error: 'Invalid game record format' });
    }
})

app.post('/start_private_lobby/:id', (req, res) => {
    console.logx(`starting private lobby with id ${req.params.id}`)
    gm.startPrivateGame(req.params.id)
});

app.put('/private_lobby/:id', (req, res) => {
    const lobbyID = req.params.id
    gm.updateGameConfig(lobbyID, { gameMap: req.body.gameMap, difficulty: req.body.difficulty })
});

app.get('/lobby/:id/exists', (req, res) => {
    const lobbyId = req.params.id;
    console.log(`checking lobby ${lobbyId} exists`)
    const lobbyExists = gm.hasActiveGame(lobbyId);

    res.json({
        exists: lobbyExists
    });
});


app.get('/private_lobby/:id', (req, res) => {
    res.json({
        hi: '5'
    });
});

wss.on('connection', (ws, req) => {
    ws.on('message', (message: string) => {
        const clientMsg: ClientMessage = ClientMessageSchema.parse(JSON.parse(message))
        slog({
            logKey: 'websocket_msg',
            msg: 'server received websocket message',
            data: clientMsg,
            severity: LogSeverity.Debug
        })
        if (clientMsg.type == "join") {
            const forwarded = req.headers['x-forwarded-for']
            const ip = Array.isArray(forwarded)
                ? forwarded[0]  // Get the first IP if it's an array
                : forwarded || req.socket.remoteAddress;

            gm.addClient(
                new Client(
                    clientMsg.clientID,
                    clientMsg.persistentID,
                    ip,
                    clientMsg.username,
                    ws
                ),
                clientMsg.gameID,
                clientMsg.lastTurn
            )
        }
        if (clientMsg.type == "log") {
            slog({
                logKey: "client_console_log",
                msg: clientMsg.log,
                severity: clientMsg.severity,
                clientID: clientMsg.clientID,
                gameID: clientMsg.gameID,
                persistentID: clientMsg.persistentID,
            })
        }
    })
});

function runGame() {
    setInterval(() => tick(), 1000);
}

function tick() {
    gm.tick()
}

const PORT = process.env.PORT || 3000;
console.log(`Server will try to run on http://localhost:${PORT}`);

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

runGame()
