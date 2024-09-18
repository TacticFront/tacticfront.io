import {Game, Cell} from "../game/Game";


export function getSpawnCells(gs: Game, cell: Cell): Cell[] {
    let result: Cell[] = [];
    for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
            let c = new Cell(cell.x + dx, cell.y + dy);
            if (!gs.isOnMap(c)) {
                continue;
            }
            if (Math.abs(dx) === 2 && Math.abs(dy) === 2) {
                continue;
            }
            if (gs.tile(c).isWater()) {
                continue;
            }
            if (gs.tile(c).hasOwner()) {
                continue;
            }
            result.push(c);
        }
    }
    return result;
}
