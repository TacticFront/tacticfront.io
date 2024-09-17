import {TransformHandler} from "../TransformHandler"

export interface Layer {
    init()
    tick()
    render(context: CanvasRenderingContext2D)
    shouldTransform(): boolean
}