import { getConfig } from "./configuration/Config";
import { EventBus } from "./EventBus";
import { Executor } from "./execution/ExecutionManager";
import { Game } from "./game/Game";
import { createGame } from "./game/GameImpl";
import { loadTerrainMap } from "./game/TerrainMapLoader";
import { GameConfig, Turn } from "./Schemas";

export interface GameUpdate {
    players: PlayerUpdate[]
    units: UnitUpdate[]

}

export interface PlayerUpdate {

}

export interface UnitUpdate {

}

export interface TileUpdate {
    x: number
    y: number
    isBorder: boolean

}

export async function createGameRunner(gameID: string, gameConfig: GameConfig): Promise<GameRunner> {
    const config = getConfig(gameConfig)
    const terrainMap = await loadTerrainMap(gameConfig.gameMap);
    const eventBus = new EventBus()
    const game = createGame(terrainMap.map, terrainMap.miniMap, eventBus, config)
    return new GameRunner(game, eventBus, new Executor(game, gameID))
}

export class GameRunner {

    constructor(private game: Game, private eventBus: EventBus, private execManager: Executor) {

    }

    public executeNextTick(turn: Turn): GameUpdate {

        this.game.executeNextTick()
        return null
    }

}