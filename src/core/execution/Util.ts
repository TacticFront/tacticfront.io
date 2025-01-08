import { Game, Cell, Tile } from "../game/Game";
import { and, bfs, euclDist } from "../Util";


export function getSpawnTiles(tile: Tile): Tile[] {
    return Array.from(bfs(tile, euclDist(tile, 4)))
        .filter(t => !t.hasOwner() && t.terrain().isLand())
}

export function closestTwoTiles(x: Iterable<Tile>, y: Iterable<Tile>): { x: Tile, y: Tile } {
    const xSorted = Array.from(x).sort((a, b) => a.cell().x - b.cell().x);
    const ySorted = Array.from(y).sort((a, b) => a.cell().x - b.cell().x);

    if (xSorted.length == 0 || ySorted.length == 0) {
        return null;
    }

    let i = 0;
    let j = 0;
    let minDistance = Infinity;
    let result = { x: xSorted[0], y: ySorted[0] };

    while (i < xSorted.length && j < ySorted.length) {
        const currentX = xSorted[i];
        const currentY = ySorted[j];

        const distance =
            Math.abs(currentX.cell().x - currentY.cell().x) +
            Math.abs(currentX.cell().y - currentY.cell().y);

        if (distance < minDistance) {
            minDistance = distance;
            result = { x: currentX, y: currentY };
        }

        // If we're at the end of X, must move Y forward
        if (i === xSorted.length - 1) {
            j++;
        }
        // If we're at the end of Y, must move X forward
        else if (j === ySorted.length - 1) {
            i++;
        }
        // Otherwise, move whichever pointer has smaller x value
        else if (currentX.cell().x < currentY.cell().x) {
            i++;
        } else {
            j++;
        }
    }

    return result;
}