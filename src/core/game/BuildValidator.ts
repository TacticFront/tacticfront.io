import { bfs, dist, manhattanDist } from "../Util";
import { BuildItem, BuildItems, Game, Player, Tile, UnitType } from "./Game";

export class BuildValidator {
    constructor(private game: Game) { }

    canBuild(player: Player, tile: Tile, item: BuildItem): boolean {
        if (!player.isAlive() || player.gold() < item.cost) {
            return false
        }
        switch (item) {
            case BuildItems.Nuke:
                return player.units(UnitType.MissileSilo).length > 0
            case BuildItems.Port:
                return this.canBuildPort(player, tile)
            case BuildItems.Destroyer:
                return this.canBuildDestroyer(player, tile)
            case BuildItems.MissileSilo:
                return tile.owner() == player
            default:
                throw Error(`item ${item.type} not supported`)
        }
    }

    canBuildPort(player: Player, tile: Tile): boolean {
        return Array.from(bfs(tile, dist(tile, 20)))
            .filter(t => t.owner() == player && t.isOceanShore()).length > 0

    }

    canBuildDestroyer(player: Player, tile: Tile): boolean {
        return player.units(UnitType.Port)
            .filter(u => manhattanDist(u.tile().cell(), tile.cell()) < this.game.config().boatMaxDistance()).length > 0
    }
}