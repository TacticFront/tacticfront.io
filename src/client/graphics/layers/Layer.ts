import {Game} from "../../../core/game/Game"
import {TransformHandler} from "../TransformHandler"

export interface Layer {
    init(game: Game)
    tick()
    renderLayer(context: CanvasRenderingContext2D)
    shouldTransform(): boolean
}