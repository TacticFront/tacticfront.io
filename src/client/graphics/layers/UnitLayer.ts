import { Colord } from "colord";
import { Theme } from "../../../core/configuration/Config";
import { Unit, UnitEvent, Cell, Game, Tile, UnitType } from "../../../core/game/Game";
import { bfs, dist, euclDist } from "../../../core/Util";
import { Layer } from "./Layer";
import { EventBus } from "../../../core/EventBus";

import anchorIcon from '../../../../resources/images/AnchorIcon.png';

export class UnitLayer implements Layer {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private imageData: ImageData;
    private anchorImage: HTMLImageElement;
    private anchorImageLoaded: boolean = false;

    private boatToTrail = new Map<Unit, Set<Tile>>();

    private theme: Theme = null;

    constructor(private game: Game, private eventBus: EventBus) {
        this.theme = game.config().theme();
        this.loadAnchorImage();
    }

    private loadAnchorImage() {
        this.anchorImage = new Image();
        this.anchorImage.onload = () => {
            this.anchorImageLoaded = true;
        };
        this.anchorImage.src = anchorIcon;
    }

    shouldTransform(): boolean {
        return true;
    }

    tick() {
    }

    init(game: Game) {
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext("2d");

        this.imageData = this.context.getImageData(0, 0, this.game.width(), this.game.height());
        this.canvas.width = this.game.width();
        this.canvas.height = this.game.height();
        this.context.putImageData(this.imageData, 0, 0);
        this.initImageData();

        this.eventBus.on(UnitEvent, e => this.onUnitEvent(e));
    }

    initImageData() {
        this.game.forEachTile((tile) => {
            const index = (tile.cell().y * this.game.width()) + tile.cell().x;
            const offset = index * 4;
            this.imageData.data[offset + 3] = 0;
        });
    }

    renderLayer(context: CanvasRenderingContext2D) {
        this.context.putImageData(this.imageData, 0, 0);
        context.drawImage(
            this.canvas,
            -this.game.width() / 2,
            -this.game.height() / 2,
            this.game.width(),
            this.game.height()
        );
    }

    onUnitEvent(event: UnitEvent) {
        switch (event.unit.type()) {
            case UnitType.TransportShip:
                this.handleBoatEvent(event);
                break;
            case UnitType.Destroyer:
                this.handleDestroyerEvent(event);
                break;
            case UnitType.TradeShip:
                this.handleTradeShipEvent(event)
        }
    }

    private handleDestroyerEvent(event: UnitEvent) {
        bfs(event.oldTile, euclDist(event.oldTile, 3)).forEach(t => {
            this.clearCell(t.cell());
        });
        bfs(event.unit.tile(), euclDist(event.unit.tile(), 3))
            .forEach(t => this.paintCell(t.cell(), this.theme.borderColor(event.unit.owner().info()), 255));
        bfs(event.unit.tile(), euclDist(event.unit.tile(), 2))
            .forEach(t => this.paintCell(t.cell(), this.theme.territoryColor(event.unit.owner().info()), 180));
    }

    private handleTradeShipEvent(event: UnitEvent) {
        bfs(event.oldTile, euclDist(event.oldTile, 1)).forEach(t => {
            this.clearCell(t.cell());
        });
        if (event.unit.isActive()) {
            bfs(event.unit.tile(), euclDist(event.unit.tile(), 1))
                .forEach(t => this.paintCell(t.cell(), this.theme.borderColor(event.unit.owner().info()), 255));
        }
    }

    private handleBoatEvent(event: UnitEvent) {
        if (!this.boatToTrail.has(event.unit)) {
            this.boatToTrail.set(event.unit, new Set<Tile>());
        }
        const trail = this.boatToTrail.get(event.unit);
        trail.add(event.oldTile);
        bfs(event.oldTile, dist(event.oldTile, 3)).forEach(t => {
            this.clearCell(t.cell());
        });
        if (event.unit.isActive()) {
            bfs(event.unit.tile(), dist(event.unit.tile(), 4)).forEach(
                t => {
                    if (trail.has(t)) {
                        this.paintCell(t.cell(), this.theme.territoryColor(event.unit.owner().info()), 150);
                    }
                }
            );
            bfs(event.unit.tile(), dist(event.unit.tile(), 2))
                .forEach(t => this.paintCell(t.cell(), this.theme.borderColor(event.unit.owner().info()), 255));
            bfs(event.unit.tile(), dist(event.unit.tile(), 1))
                .forEach(t => this.paintCell(t.cell(), this.theme.territoryColor(event.unit.owner().info()), 180));
        } else {
            trail.forEach(t => this.clearCell(t.cell()));
            this.boatToTrail.delete(event.unit);
        }
    }

    paintCell(cell: Cell, color: Colord, alpha: number) {
        const index = (cell.y * this.game.width()) + cell.x;
        const offset = index * 4;
        this.imageData.data[offset] = color.rgba.r;
        this.imageData.data[offset + 1] = color.rgba.g;
        this.imageData.data[offset + 2] = color.rgba.b;
        this.imageData.data[offset + 3] = alpha;
    }

    clearCell(cell: Cell) {
        const index = (cell.y * this.game.width()) + cell.x;
        const offset = index * 4;
        this.imageData.data[offset + 3] = 0; // Set alpha to 0 (fully transparent)
    }
}