import {Cell, Game, PlayerType, Tile, TileEvent} from "../game/Game";
import {PseudoRandom} from "../PseudoRandom";
import {SpawnIntent} from "../Schemas";
import {bfs, dist as dist, manhattanDist} from "../Util";


export class BotSpawner {
    private random = new PseudoRandom(123);
    private bots: SpawnIntent[] = [];

    constructor(private gs: Game) { }

    spawnBots(numBots: number): SpawnIntent[] {
        let tries = 0
        while (this.bots.length < numBots) {
            if (tries > 10000) {
                console.log('too many retries while spawning bots, giving up')
                return this.bots
            }
            const spawn = this.spawnBot("Bot" + this.bots.length)
            if (spawn != null) {
                this.bots.push(spawn);
            } else {
                tries++
            }
        }
        return this.bots;
    }

    spawnBot(botName: string): SpawnIntent | null {
        const tile = this.randTile()
        if (!tile.isLand()) {
            return null
        }
        for (const spawn of this.bots) {
            if (manhattanDist(new Cell(spawn.x, spawn.y), tile.cell()) < 30) {
                return null
            }
        }
        return {
            type: 'spawn',
            playerID: this.random.nextID(),
            name: botName,
            playerType: PlayerType.Bot,
            x: tile.cell().x,
            y: tile.cell().y
        };
    }

    private randTile(): Tile {
        return this.gs.tile(new Cell(
            this.random.nextInt(0, this.gs.width()),
            this.random.nextInt(0, this.gs.height())
        ))
    }
}

