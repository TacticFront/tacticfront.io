import express, { json } from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameManager } from './GameManager';
import { ClientMessage, ClientMessageSchema, GameRecord, GameRecordSchema, Turn, TurnSchema } from '../core/Schemas';
import { getConfig } from '../core/configuration/Config';
import { LogSeverity, slog } from './StructuredLog';
import { Client } from './Client';
import { GamePhase, GameServer } from './GameServer';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { ProcessGameRecord } from '../core/Util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve static files from the 'out' directory
app.use(express.static(path.join(__dirname, '../../out')));
app.use(express.json())

const gm = new GameManager(getConfig())
const privateGames = new Map<string, GameRecord>()

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
    console.log('creating private lobby with id ${id}')
    res.json({
        id: id
    });
});

app.post('/new_private_game_record', (req, res) => {
    try {
        // Validate the complete game record sent by client
        const gameRecord = GameRecordSchema.parse(req.body);
        privateGames.set(gameRecord.id, gameRecord);

        slog('new_private_game_record', 'Created new private game record', { id: gameRecord.id }, LogSeverity.DEBUG);
        res.json({ id: gameRecord.id });
    } catch (error) {
        slog('new_private_game_record', 'Failed to create new private game record', { error }, LogSeverity.ERROR);
        res.status(400).json({ error: 'Invalid game record format' });
    }
});

app.put('/add_single_player_game_turn', (req, res) => {
    const { gameId, turns } = req.body;

    try {
        const gameRecord = privateGames.get(gameId);
        if (!gameRecord) {
            res.status(404).json({ error: 'Game record not found' });
            return;
        }

        // Validate the array of turns
        const validatedTurns = z.array(TurnSchema).parse(turns);

        // Add the turns to the game record's turns
        gameRecord.turns.push(...validatedTurns);
        privateGames.set(gameId, gameRecord);

        res.json({ success: true, numTurns: validatedTurns.length });
    } catch (error) {
        slog('add_single_player_game_turn', 'Failed to add turns', { error, gameId }, LogSeverity.ERROR);
        res.status(400).json({ error: 'Invalid turns format' });
    }
});

app.put('/complete_single_player_game_record/:id', (req, res) => {
    const gameId = req.params.id;
    try {
        let gameRecord = privateGames.get(gameId);
        if (!gameRecord) {
            res.status(404).json({ error: 'Game record not found' });
            return;
        }

        gameRecord.endTimestampMS = Date.now();

        gameRecord = ProcessGameRecord(gameRecord)
        // TODO: send to gcs

        GameRecordSchema.parse(gameRecord);

        res.json({
            success: true,
            durationSeconds: gameRecord.durationSeconds
        });
    } catch (error) {
        slog('complete_single_player_game_record', 'Failed to complete game record', { error, gameId }, LogSeverity.ERROR);
        res.status(400).json({ error: 'Invalid game record format' });
    }
})

app.post('/start_private_lobby/:id', (req, res) => {
    console.log(`starting private lobby with id ${req.params.id}`)
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

wss.on('connection', (ws) => {

    ws.on('message', (message: string) => {
        const clientMsg: ClientMessage = ClientMessageSchema.parse(JSON.parse(message))
        slog('websocket_msg', 'server received websocket message', clientMsg, LogSeverity.DEBUG)
        if (clientMsg.type == "join") {
            gm.addClient(new Client(clientMsg.clientID, clientMsg.clientIP, ws), clientMsg.gameID, clientMsg.lastTurn)
        }
        // TODO: send error message
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
