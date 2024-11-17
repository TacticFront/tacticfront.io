import { bfs, dist, manhattanDist } from "../Util";
import { Game, Player, Tile, UnitType } from "./Game";

export class BuildValidator {
    constructor(private game: Game) { }

    canBuild(player: Player, tile: Tile, unitType: UnitType): boolean {
        const cost = this.game.unitInfo(unitType).cost
        if (!player.isAlive() || player.gold() < cost) {
            return false
        }
        switch (unitType) {
            case UnitType.Nuke:
                return player.units(UnitType.MissileSilo).length > 0
            case UnitType.Port:
                return this.canBuildPort(player, tile)
            case UnitType.Destroyer:
                return this.canBuildDestroyer(player, tile)
            case UnitType.MissileSilo:
                return tile.owner() == player
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