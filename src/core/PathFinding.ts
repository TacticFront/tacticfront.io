import { PriorityQueue } from "@datastructures-js/priority-queue";
import { Tile } from "./game/Game";
import { manhattanDist } from "./Util";
import { colord } from "colord";
export class AStar {
    private fwdOpenSet: PriorityQueue<{ tile: Tile; fScore: number; }>;
    private bwdOpenSet: PriorityQueue<{ tile: Tile; fScore: number; }>;
    private fwdCameFrom: Map<Tile, Tile>;
    private bwdCameFrom: Map<Tile, Tile>;
    private fwdGScore: Map<Tile, number>;
    private bwdGScore: Map<Tile, number>;
    private meetingPoint: Tile | null;
    public completed: boolean;

    constructor(private src: Tile, private dst: Tile) {
        this.fwdOpenSet = new PriorityQueue<{ tile: Tile; fScore: number; }>(
            (a, b) => a.fScore - b.fScore
        );
        this.bwdOpenSet = new PriorityQueue<{ tile: Tile; fScore: number; }>(
            (a, b) => a.fScore - b.fScore
        );
        this.fwdCameFrom = new Map<Tile, Tile>();
        this.bwdCameFrom = new Map<Tile, Tile>();
        this.fwdGScore = new Map<Tile, number>();
        this.bwdGScore = new Map<Tile, number>();
        this.meetingPoint = null;
        this.completed = false;

        // Initialize forward search
        this.fwdGScore.set(src, 0);
        this.fwdOpenSet.enqueue({ tile: src, fScore: this.heuristic(src, dst) });

        // Initialize backward search
        this.bwdGScore.set(dst, 0);
        this.bwdOpenSet.enqueue({ tile: dst, fScore: this.heuristic(dst, src) });
    }

    compute(iterations: number): boolean {
        if (this.completed) return true;

        while (!this.fwdOpenSet.isEmpty() && !this.bwdOpenSet.isEmpty()) {
            iterations--;
            if (iterations <= 0) return false;

            // Process forward search
            const fwdCurrent = this.fwdOpenSet.dequeue()!.tile;
            if (this.bwdGScore.has(fwdCurrent)) {
                // We found a meeting point!
                this.meetingPoint = fwdCurrent;
                this.completed = true;
                return true;
            }

            this.expandNode(fwdCurrent, true);

            // Process backward search
            const bwdCurrent = this.bwdOpenSet.dequeue()!.tile;
            if (this.fwdGScore.has(bwdCurrent)) {
                // We found a meeting point!
                this.meetingPoint = bwdCurrent;
                this.completed = true;
                return true;
            }

            this.expandNode(bwdCurrent, false);
        }

        return this.completed;
    }

    private expandNode(current: Tile, isForward: boolean) {
        for (const neighbor of current.neighborsWrapped()) {
            if (neighbor !== (isForward ? this.dst : this.src) && neighbor.isLand()) continue;

            const gScore = isForward ? this.fwdGScore : this.bwdGScore;
            const openSet = isForward ? this.fwdOpenSet : this.bwdOpenSet;
            const cameFrom = isForward ? this.fwdCameFrom : this.bwdCameFrom;

            let tentativeGScore = gScore.get(current)! + 1;
            if (neighbor.magnitude() < 10) {
                tentativeGScore += 1;
            }

            if (!gScore.has(neighbor) || tentativeGScore < gScore.get(neighbor)!) {
                cameFrom.set(neighbor, current);
                gScore.set(neighbor, tentativeGScore);
                const fScore = tentativeGScore + this.heuristic(
                    neighbor,
                    isForward ? this.dst : this.src
                );
                openSet.enqueue({ tile: neighbor, fScore: fScore });
            }
        }
    }

    private heuristic(a: Tile, b: Tile): number {
        return 1.1 * Math.abs(a.cell().x - b.cell().x) + Math.abs(a.cell().y - b.cell().y);
    }

    public reconstructPath(): Tile[] {
        if (!this.meetingPoint) return [];

        // Reconstruct path from start to meeting point
        const fwdPath: Tile[] = [this.meetingPoint];
        let current = this.meetingPoint;
        while (this.fwdCameFrom.has(current)) {
            current = this.fwdCameFrom.get(current)!;
            fwdPath.unshift(current);
        }

        // Reconstruct path from meeting point to goal
        current = this.meetingPoint;
        while (this.bwdCameFrom.has(current)) {
            current = this.bwdCameFrom.get(current)!;
            fwdPath.push(current);
        }

        return fwdPath;
    }
}


export class PathFinder {

    private curr: Tile = null
    private dst: Tile = null
    private path: Tile[]
    private aStar: AStar
    private inProgress = false

    constructor(private iterations: number) {

    }

    nextTile(curr: Tile, dst: Tile): Tile {
        if (this.shouldRecompute(curr, dst)) {
            if (this.inProgress) {
                if (this.aStar.compute(this.iterations)) {
                    this.path = this.aStar.reconstructPath()
                    this.inProgress = false
                } else {
                    return null
                }
            } else {
                this.curr = curr
                this.dst = dst
                this.path = null
                this.aStar = new AStar(curr, dst)
                if (this.aStar.compute(this.iterations)) {
                    this.inProgress = false
                    this.path = this.aStar.reconstructPath()
                } else {
                    this.inProgress = true
                    return null
                }
                if (this.path.length > 0) {
                    this.path.shift()
                }
            }
        } else {
            return this.path.shift()
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
