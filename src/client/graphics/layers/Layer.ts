import { Game } from "../../../core/game/Game"

export interface Layer {
    init(game: Game)
    tick()
    renderLayer(context: CanvasRenderingContext2D)
    shouldTransform(): boolean
    redraw?(): void
}