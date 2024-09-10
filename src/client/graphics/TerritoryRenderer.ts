import {PriorityQueue} from "@datastructures-js/priority-queue";
import {Boat, BoatEvent, Cell, Game, Tile, TileEvent} from "../../core/Game";
import {PseudoRandom} from "../../core/PseudoRandom";
import {Colord} from "colord";
import {bfs, dist} from "../../core/Util";
import {Theme} from "../../core/configuration/Config";

export class TerritoryRenderer {
    private canvas: HTMLCanvasElement
    private context: CanvasRenderingContext2D
    private imageData: ImageData

    private tileToRenderQueue: PriorityQueue<{tileEvent: TileEvent, lastUpdate: number}> = new PriorityQueue((a, b) => {return a.lastUpdate - b.lastUpdate})
    private random = new PseudoRandom(123)
    private theme: Theme = null

    private boatToTrail = new Map<Boat, Set<Tile>>()


    constructor(private game: Game) {
        this.theme = game.config().theme()
    }

    init() {
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext("2d")

        this.imageData = this.context.getImageData(0, 0, this.game.width(), this.game.height())
        this.initImageData()
        this.canvas.width = this.game.width();
        this.canvas.height = this.game.height();
        this.context.putImageData(this.imageData, 0, 0);
    }

    initImageData() {
        this.game.forEachTile((tile) => {
            const index = (tile.cell().y * this.game.width()) + tile.cell().x
            const offset = index * 4
            this.imageData.data[offset + 3] = 0
        })
    }

    draw(context: CanvasRenderingContext2D) {
        this.renderTerritory()
        this.context.putImageData(this.imageData, 0, 0);
        context.drawImage(
            this.canvas,
            -this.game.width() / 2,
            -this.game.height() / 2,
            this.game.width(),
            this.game.height()
        )
    }

    boatEvent(event: BoatEvent) {
        if (!this.boatToTrail.has(event.boat)) {
            this.boatToTrail.set(event.boat, new Set<Tile>())
        }
        const trail = this.boatToTrail.get(event.boat)
        trail.add(event.oldTile)
        bfs(event.oldTile, dist(event.oldTile, 3)).forEach(t => {
            this.paintTerritory(t)
        })
        if (event.boat.isActive()) {
            bfs(event.boat.tile(), dist(event.boat.tile(), 4)).forEach(
                t => {
                    if (trail.has(t)) {
                        this.paintCell(t.cell(), this.theme.territoryColor(event.boat.owner().id()), 150)
                    }
                }
            )
            bfs(event.boat.tile(), dist(event.boat.tile(), 2)).forEach(t => this.paintCell(t.cell(), this.theme.borderColor(event.boat.owner().id()), 180))
            bfs(event.boat.tile(), dist(event.boat.tile(), 1)).forEach(t => this.paintCell(t.cell(), this.theme.territoryColor(event.boat.owner().id()), 150))
        } else {
            trail.forEach(t => this.paintTerritory(t))
            this.boatToTrail.delete(event.boat)
        }
    }

    renderTerritory() {
        let numToRender = Math.floor(this.tileToRenderQueue.size() / 10)
        if (numToRender == 0) {
            numToRender = this.tileToRenderQueue.size()
        }

        while (numToRender > 0) {
            numToRender--
            const event = this.tileToRenderQueue.pop().tileEvent
            this.paintTerritory(event.tile)
            event.tile.neighbors().forEach(t => this.paintTerritory(t))
        }
    }

    paintTerritory(tile: Tile) {
        if (!tile.hasOwner()) {
            this.clearCell(tile.cell())
            return
        }
        if (tile.isBorder()) {
            this.paintCell(
                tile.cell(),
                this.theme.borderColor(tile.owner().id()),
                255
            )
        } else {
            this.paintCell(
                tile.cell(),
                this.theme.territoryColor(tile.owner().id()),
                70
            )
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

    tileUpdate(event: TileEvent) {
        this.tileToRenderQueue.push({tileEvent: event, lastUpdate: this.game.ticks() + this.random.nextFloat(0, .5)})
    }
}