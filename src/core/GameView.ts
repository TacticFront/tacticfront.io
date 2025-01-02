import { Cell, PlayerID } from "./game/Game";
import { GameUpdate } from "./GameRunner";

export class TileView {

}

export class PlayerView {

}

export class GameView {

    public update(gu: GameUpdate) {

    }

    tile(cell: Cell): TileView {
        return null
    }

    player(id: PlayerID): PlayerView {
        return null
    }

}