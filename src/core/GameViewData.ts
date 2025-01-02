export interface ViewSerialiable {
    toViewData(): ViewData
}

export interface ViewData {

}

export interface TileViewData extends ViewData {
    x: number
    y: number
}

export interface UnitViewData extends ViewData {

}

export interface PlayerViewData extends ViewData {

}

export interface GameUpdateViewData extends ViewData {
    units: UnitViewData[]
    players: PlayerViewData[]
    tileUpdates: TileViewData[]
}