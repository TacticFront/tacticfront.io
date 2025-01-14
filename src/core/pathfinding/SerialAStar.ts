import { PriorityQueue } from "@datastructures-js/priority-queue";
import { AStar} from "./AStar";
import { PathFindResultType } from "./AStar";
import { Cell, TerrainTile, TerrainTileKey } from "../game/Game";
import { consolex } from "../Consolex";


export class SerialAStar implements AStar {
    private fwdOpenSet: PriorityQueue<{ tile: TerrainTile; fScore: number; }>;
    private bwdOpenSet: PriorityQueue<{ tile: TerrainTile; fScore: number; }>;
    private fwdCameFrom: Map<TerrainTileKey, TerrainTile>;
    private bwdCameFrom: Map<TerrainTileKey, TerrainTile>;
    private fwdGScore: Map<TerrainTileKey, number>;
    private bwdGScore: Map<TerrainTileKey, number>;
    private meetingPoint: TerrainTile | null;
    public completed: boolean;

    constructor(
        private src: TerrainTile,
        private dst: TerrainTile,
        private canMove: (t: TerrainTile) => boolean,
        private iterations: number,
        private maxTries: number
    ) {
        this.fwdOpenSet = new PriorityQueue<{ tile: TerrainTile; fScore: number; }>(
            (a, b) => a.fScore - b.fScore
        );
        this.bwdOpenSet = new PriorityQueue<{ tile: TerrainTile; fScore: number; }>(
            (a, b) => a.fScore - b.fScore
        );
        this.fwdCameFrom = new Map<TerrainTileKey, TerrainTile>();
        this.bwdCameFrom = new Map<TerrainTileKey, TerrainTile>();
        this.fwdGScore = new Map<TerrainTileKey, number>();
        this.bwdGScore = new Map<TerrainTileKey, number>();
        this.meetingPoint = null;
        this.completed = false;

        // Initialize forward search
        this.fwdGScore.set(src.key(), 0);
        this.fwdOpenSet.enqueue({ tile: src, fScore: this.heuristic(src, dst) });

        // Initialize backward search
        this.bwdGScore.set(dst.key(), 0);
        this.bwdOpenSet.enqueue({ tile: dst, fScore: this.heuristic(dst, src) });
    }

    compute(): PathFindResultType {
        if (this.completed) return PathFindResultType.Completed;

        this.maxTries -= 1;
        let iterations = this.iterations;

        while (!this.fwdOpenSet.isEmpty() && !this.bwdOpenSet.isEmpty()) {
            iterations--;
            if (iterations <= 0) {
                if (this.maxTries <= 0) {
                    return PathFindResultType.PathNotFound;
                }
                return PathFindResultType.Pending;
            }

            // Process forward search
            const fwdCurrent = this.fwdOpenSet.dequeue()!.tile;
            if (this.bwdGScore.has(fwdCurrent.key())) {
                // We found a meeting point!
                this.meetingPoint = fwdCurrent;
                this.completed = true;
                return PathFindResultType.Completed;
            }

            this.expandTerrainTile(fwdCurrent, true);

            // Process backward search
            const bwdCurrent = this.bwdOpenSet.dequeue()!.tile;
            if (this.fwdGScore.has(bwdCurrent.key())) {
                // We found a meeting point!
                this.meetingPoint = bwdCurrent;
                this.completed = true;
                return PathFindResultType.Completed;
            }

            this.expandTerrainTile(bwdCurrent, false);
        }

        return this.completed ? PathFindResultType.Completed : PathFindResultType.PathNotFound;
    }

    private expandTerrainTile(current: TerrainTile, isForward: boolean) {
        for (const neighbor of current.neighbors()) {
            if (!neighbor.equals(isForward ? this.dst : this.src) && !this.canMove(neighbor)) continue;

            const gScore = isForward ? this.fwdGScore : this.bwdGScore;
            const openSet = isForward ? this.fwdOpenSet : this.bwdOpenSet;
            const cameFrom = isForward ? this.fwdCameFrom : this.bwdCameFrom;

            let tentativeGScore = gScore.get(current.key())! + neighbor.cost();

            if (!gScore.has(neighbor.key()) || tentativeGScore < gScore.get(neighbor.key())!) {
                cameFrom.set(neighbor.key(), current);
                gScore.set(neighbor.key(), tentativeGScore);
                const fScore = tentativeGScore + this.heuristic(
                    neighbor,
                    isForward ? this.dst : this.src
                );
                openSet.enqueue({ tile: neighbor, fScore: fScore });
            }
        }
    }

    private heuristic(a: TerrainTile, b: TerrainTile): number {
        // TODO use wrapped
        try {
            return 1.1 * Math.abs(a.cell().x - b.cell().x) + Math.abs(a.cell().y - b.cell().y);
        } catch {
            consolex.log('uh oh')
        }
    }

    public reconstructPath(): Cell[] {
        if (!this.meetingPoint) return [];

        // Reconstruct path from start to meeting point
        const fwdPath: TerrainTile[] = [this.meetingPoint];
        let current = this.meetingPoint;
        while (this.fwdCameFrom.has(current.key())) {
            current = this.fwdCameFrom.get(current.key())!;
            fwdPath.unshift(current);
        }

        // Reconstruct path from meeting point to goal
        current = this.meetingPoint;
        while (this.bwdCameFrom.has(current.key())) {
            current = this.bwdCameFrom.get(current.key())!;
            fwdPath.push(current);
        }

        return fwdPath.map(sn => sn.cell());
    }
}
