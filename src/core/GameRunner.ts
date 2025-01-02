import { getConfig } from "./configuration/Config";
import { EventBus } from "./EventBus";
import { Executor } from "./execution/ExecutionManager";
import { Game, Tile, TileEvent } from "./game/Game";
import { createGame } from "./game/GameImpl";
import { loadTerrainMap } from "./game/TerrainMapLoader";
import { GameUpdateViewData } from "./GameViewData";
import { GameConfig, Turn } from "./Schemas";

export async function createGameRunner(gameID: string, gameConfig: GameConfig): Promise<GameRunner> {
    const config = getConfig(gameConfig)
    const terrainMap = await loadTerrainMap(gameConfig.gameMap);
    const eventBus = new EventBus()
    const game = createGame(terrainMap.map, terrainMap.miniMap, eventBus, config)
    return new GameRunner(game, eventBus, new Executor(game, gameID))
}

export class GameRunner {
    private updatedTiles: Tile[]

    constructor(private game: Game, private eventBus: EventBus, private execManager: Executor) {
        eventBus.on(TileEvent, (e) => { this.updatedTiles.push(e.tile) })
    }

    public executeNextTick(turn: Turn): GameUpdateViewData {
        this.updatedTiles = []
        this.game.executeNextTick()
        return null
    }

}