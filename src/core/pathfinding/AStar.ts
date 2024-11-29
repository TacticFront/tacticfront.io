import { Cell, Tile } from "../game/Game";

export interface AStar {
    compute(): PathFindResultType
    reconstructPath(): SearchNode[]
}

export enum PathFindResultType {
    NextTile,
    Pending,
    Completed,
    PathNotFound
} export type TileResult = {
    type: PathFindResultType.NextTile;
    tile: Tile;
} | {
    type: PathFindResultType.Pending;
} | {
    type: PathFindResultType.Completed;
    tile: Tile;
} | {
    type: PathFindResultType.PathNotFound;
};

export interface SearchNode {
    cost(): number
    cell(): Cell
}

