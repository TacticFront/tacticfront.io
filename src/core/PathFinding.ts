import { PriorityQueue } from "@datastructures-js/priority-queue";
import { Tile } from "./game/Game";
import { manhattanDist } from "./Util";


export class AStar {
    private openSet: PriorityQueue<{ tile: Tile; fScore: number; }>;
    private cameFrom: Map<Tile, Tile>;
    private gScore: Map<Tile, number>;
    private current: Tile | null;
    public completed: boolean;

    constructor(private src: Tile, private dst: Tile) {
        this.openSet = new PriorityQueue<{ tile: Tile; fScore: number; }>(
            (a, b) => a.fScore - b.fScore
        );
        this.cameFrom = new Map<Tile, Tile>();
        this.gScore = new Map<Tile, number>();
        this.current = null;
        this.completed = false;

        this.gScore.set(src, 0);
        this.openSet.enqueue({ tile: src, fScore: this.heuristic(src, dst) });
    }

    compute(iterations: number): boolean {
        if (this.completed) return true;

        while (!this.openSet.isEmpty()) {
            iterations--;
            this.current = this.openSet.dequeue()!.tile;
            if (iterations <= 0) {
                return false;
            }

            if (this.current === this.dst) {
                this.completed = true;
                return true;
            }

            for (const neighbor of this.current.neighborsWrapped()) {
                if (neighbor != this.dst && neighbor.isLand()) continue; // Skip non-water tiles

                const tentativeGScore = this.gScore.get(this.current)! + 3 - Math.max(1, Math.min(neighbor.magnitude() / 4, 2));

                if (!this.gScore.has(neighbor) || tentativeGScore < this.gScore.get(neighbor)!) {
                    this.cameFrom.set(neighbor, this.current);
                    this.gScore.set(neighbor, tentativeGScore);
                    const fScore = tentativeGScore + this.heuristic(neighbor, this.dst);

                    this.openSet.enqueue({ tile: neighbor, fScore: fScore });
                }
            }
        }

        return this.completed;
    }

    private heuristic(a: Tile, b: Tile): number {
        // Manhattan distance
        return Math.abs(a.cell().x - b.cell().x) + Math.abs(a.cell().y - b.cell().y);
    }

    public reconstructPath(): Tile[] {
        const path = [this.current!];
        while (this.cameFrom.has(this.current!)) {
            this.current = this.cameFrom.get(this.current!)!;
            path.unshift(this.current);
        }
        return path;
    }
}

export class PathFinder {

    private curr: Tile = null
    private dst: Tile = null
    private path: Tile[]
    private aStar: AStar

    constructor(private iterations: number) {

    }

    nextTile(curr: Tile, dst: Tile): Tile {
        if (this.shouldRecompute(curr, dst)) {
            this.curr = curr
            this.dst = dst
            this.path = null
            this.aStar = new AStar(curr, dst)
            if (this.aStar.compute(this.iterations)) {
                this.path = this.aStar.reconstructPath()
            } else {
                return null
            }
            if (this.path.length > 0) {
                this.path.shift()
            }
        }
        return this.path.shift()
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
