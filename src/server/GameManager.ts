import {Config} from "../core/configuration/Config";
import {PseudoRandom} from "../core/PseudoRandom";
import WebSocket from 'ws';
import {ClientID, GameID} from "../core/Schemas";
import {v4 as uuidv4} from 'uuid';
import {Client} from "./Client";
import {GamePhase, GameServer} from "./GameServer";



export class GameManager {

    private lastNewLobby: number = 0

    private games: GameServer[] = []

    private random = new PseudoRandom(123)

    constructor(private config: Config) { }

    gamesByPhase(phase: GamePhase): GameServer[] {
        return this.games.filter(g => g.phase() == phase)
    }

    addClient(client: Client, gameID: GameID, lastTurn: number) {
        const game = this.games.find(g => g.id == gameID)
        if (!game) {
            console.log(`game id ${gameID} not found`)
            return
        }
        game.addClient(client, lastTurn)
    }

    tick() {
        const lobbies = this.gamesByPhase(GamePhase.Lobby)
        const active = this.gamesByPhase(GamePhase.Active)
        const finished = this.gamesByPhase(GamePhase.Finished)

        const now = Date.now()
        if (now > this.lastNewLobby + this.config.gameCreationRate()) {
            this.lastNewLobby = now
            const id = uuidv4()
            lobbies.push(new GameServer(id, now, this.config))
        }

        active.filter(g => !g.hasStarted()).forEach(g => {
            g.start()
        })
        finished.forEach(g => {
            g.endGame()
        })
        this.games = [...lobbies, ...active]
    }
}