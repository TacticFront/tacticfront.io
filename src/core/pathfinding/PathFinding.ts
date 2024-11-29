import { Game, Tile } from "../game/Game";
import { manhattanDist } from "../Util";
import { AStar, PathFindResultType, TileResult } from "./AStar";
import { AsyncPathFinderCreator, ParallelAStar } from "./AsyncPathFinding";
import { SerialAStar } from "./SerialAStar";

export class PathFinder {

    private curr: Tile = null
    private dst: Tile = null
    private path: Tile[]
    private aStar: AStar
    private computeFinished = true

    private constructor(
        private newAStar: (curr: Tile, dst: Tile) => AStar
    ) { }

    public static Serial(iterations: number, canMove: (t: Tile) => boolean, maxTries: number = 20): PathFinder {
        return new PathFinder(
            (curr: Tile, dst: Tile) => {
                return new SerialAStar(
                    curr,
                    dst,
                    canMove,
                    sn => ((sn as Tile).neighbors()), iterations, maxTries
                )
            }
        )
    }

    public static Parallel(creator: AsyncPathFinderCreator, numTicks: number): PathFinder {
        return new PathFinder(
            (curr: Tile, dst: Tile) => {
                return creator.createParallelAStar(curr, dst, numTicks)
            }
        )
    }

    nextTile(curr: Tile, dst: Tile, dist: number = 1): TileResult {
        if (curr == null) {
            console.error('curr is null')
        }
        if (dst == null) {
            console.error('dst is null')
        }

        if (manhattanDist(curr.cell(), dst.cell()) < dist) {
            return { type: PathFindResultType.Completed, tile: curr }
        }

        if (this.computeFinished) {
            if (this.shouldRecompute(curr, dst)) {
                this.curr = curr
                this.dst = dst
                this.path = null
                this.aStar = this.newAStar(curr, dst)
                this.computeFinished = false
                return this.nextTile(curr, dst)
            } else {
                return { type: PathFindResultType.NextTile, tile: this.path.shift() }
            }
        }

        switch (this.aStar.compute()) {
            case PathFindResultType.Completed:
                this.computeFinished = true
                this.path = this.aStar.reconstructPath().map(sn => sn as Tile)
                // Remove the start tile
                this.path.shift()
                return this.nextTile(curr, dst)
            case PathFindResultType.Pending:
                return { type: PathFindResultType.Pending }
            case PathFindResultType.PathNotFound:
                return { type: PathFindResultType.PathNotFound }
        }
    }

    private shouldRecompute(curr: Tile, dst: Tile) {
        if (this.path == null || this.curr == null || this.dst == null) {
            return true
        }
        const dist = manhattanDist(curr.cell(), dst.cell())
        let tolerance = 10
        if (dist > 50) {
            tolerance = 10
        } else if (dist > 25) {
            tolerance = 5
        } else if (dist > 10) {
            tolerance = 3
        } else {
            tolerance = 0
        }
        if (manhattanDist(this.dst.cell(), dst.cell()) > tolerance) {
            return true
        }
        return false
    }
}
