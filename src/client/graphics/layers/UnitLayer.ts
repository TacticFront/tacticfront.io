import { Colord } from "colord";
import { Theme } from "../../../core/configuration/Config";
import { Unit, BoatEvent, Cell, Game, Tile } from "../../../core/game/Game";
import { bfs, dist } from "../../../core/Util";
import { Layer } from "./Layer";
import { EventBus } from "../../../core/EventBus";

export class UnitLayer implements Layer {
    private canvas: HTMLCanvasElement
    private context: CanvasRenderingContext2D
    private imageData: ImageData

    private boatToTrail = new Map<Unit, Set<Tile>>()

    private theme: Theme = null

    constructor(private game: Game, private eventBus: EventBus) {
        this.theme = game.config().theme()
    }

    shouldTransform(): boolean {
        return true
    }

    tick() {
    }

    init(game: Game) {
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext("2d")

        this.imageData = this.context.getImageData(0, 0, this.game.width(), this.game.height())
        this.canvas.width = this.game.width();
        this.canvas.height = this.game.height();
        this.context.putImageData(this.imageData, 0, 0);
        this.initImageData()

        this.eventBus.on(BoatEvent, e => this.onBoatEvent(e))
    }

    initImageData() {
        this.game.forEachTile((tile) => {
            const index = (tile.cell().y * this.game.width()) + tile.cell().x
            const offset = index * 4
            this.imageData.data[offset + 3] = 0
        })
    }

    renderLayer(context: CanvasRenderingContext2D) {
        this.context.putImageData(this.imageData, 0, 0);
        context.drawImage(
            this.canvas,
            -this.game.width() / 2,
            -this.game.height() / 2,
            this.game.width(),
            this.game.height()
        )
    }


    onBoatEvent(event: BoatEvent) {
        if (!this.boatToTrail.has(event.boat)) {
            this.boatToTrail.set(event.boat, new Set<Tile>())
        }
        const trail = this.boatToTrail.get(event.boat)
        trail.add(event.oldTile)
        bfs(event.oldTile, dist(event.oldTile, 3)).forEach(t => {
            this.clearCell(t.cell())
        })
        if (event.boat.isActive()) {
            bfs(event.boat.tile(), dist(event.boat.tile(), 4)).forEach(
                t => {
                    if (trail.has(t)) {
                        this.paintCell(t.cell(), this.theme.territoryColor(event.boat.owner().info()), 150)
                    }
                }
            )
            bfs(event.boat.tile(), dist(event.boat.tile(), 2)).forEach(t => this.paintCell(t.cell(), this.theme.borderColor(event.boat.owner().info()), 255))
            bfs(event.boat.tile(), dist(event.boat.tile(), 1)).forEach(t => this.paintCell(t.cell(), this.theme.territoryColor(event.boat.owner().info()), 180))
        } else {
            trail.forEach(t => this.clearCell(t.cell()))
            this.boatToTrail.delete(event.boat)
        }
    }


    paintCell(cell: Cell, color: Colord, alpha: number) {
        const index = (cell.y * this.game.width()) + cell.x
        const offset = index * 4
        this.imageData.data[offset] = color.rgba.r;
        this.imageData.data[offset + 1] = color.rgba.g;
        this.imageData.data[offset + 2] = color.rgba.b;
        this.imageData.data[offset + 3] = alpha
    }

    clearCell(cell: Cell) {
        const index = (cell.y * this.game.width()) + cell.x;
        const offset = index * 4;
        this.imageData.data[offset + 3] = 0; // Set alpha to 0 (fully transparent)
    }


}