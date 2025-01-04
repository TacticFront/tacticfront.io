import { AllPlayers, Cell, Game, Player, PlayerType, Tick } from "../../../core/game/Game"
import { PseudoRandom } from "../../../core/PseudoRandom"
import { calculateBoundingBox } from "../../../core/Util"
import { Theme } from "../../../core/configuration/Config"
import { Layer } from "./Layer"
import { placeName } from "../NameBoxCalculator"
import { TransformHandler } from "../TransformHandler"
import { renderTroops } from "../../Utils"
import traitorIcon from '../../../../resources/images/TraitorIcon.png';
import allianceIcon from '../../../../resources/images/AllianceIcon.png';
import crownIcon from '../../../../resources/images/CrownIcon.png';
import targetIcon from '../../../../resources/images/TargetIcon.png';
import { ClientID } from "../../../core/Schemas"
import { EventBus } from "../../../core/EventBus"
import { AlternateViewEvent } from "../../InputHandler"
import { GameView, PlayerView } from "../../../core/GameView"


class RenderInfo {
    public isVisible = true
    constructor(
        public player: Player,
        public lastRenderCalcTick: Tick,
        public lastBoundingCalculatedTick: Tick,
        public boundingBox: { min: Cell, max: Cell },
        public location: Cell,
        public fontSize: number
    ) { }
}

export class NameLayer implements Layer {

    private lastChecked = 0
    private refreshRate = 1000

    private rand = new PseudoRandom(10)
    private renders: RenderInfo[] = []
    private seenPlayers: Set<Player> = new Set()
    private traitorIconImage: HTMLImageElement;
    private allianceIconImage: HTMLImageElement;
    private targetIconImage: HTMLImageElement;
    private crownIconImage: HTMLImageElement;

    private myPlayer: Player | null = null

    private firstPlace: Player | null = null

    private alternateView = false

    constructor(
        private game: GameView,
        private eventBus: EventBus,
        private theme: Theme,
        private transformHandler: TransformHandler,
        private clientID: ClientID
    ) {
        this.eventBus.on(AlternateViewEvent, e => { this.alternateView = e.alternateView })

        this.traitorIconImage = new Image();
        this.traitorIconImage.src = traitorIcon;

        this.allianceIconImage = new Image()
        this.allianceIconImage.src = allianceIcon

        this.crownIconImage = new Image()
        this.crownIconImage.src = crownIcon

        this.targetIconImage = new Image()
        this.targetIconImage.src = targetIcon
    }

    shouldTransform(): boolean {
        return true
    }

    public init() {

    }

    // TODO: remove tick, move this to render
    public tick() {
        const now = Date.now()
        if (now - this.lastChecked > this.refreshRate) {
            this.lastChecked = now

            const sorted = this.game.players().sort((a, b) => b.numTilesOwned() - a.numTilesOwned())
            if (sorted.length > 0) {
                this.firstPlace = sorted[0]
            }

            this.renders = this.renders.filter(r => r.player.isAlive())
            for (const player of this.game.players()) {
                if (player.isAlive()) {
                    if (!this.seenPlayers.has(player)) {
                        this.seenPlayers.add(player)
                        this.renders.push(new RenderInfo(player, 0, 0, null, null, 0))
                    }
                } else {
                    this.seenPlayers.delete(player)
                }
            }
        }
        const currTick = this.game.ticks()
        const recalcRate = this.game.inSpawnPhase() ? 2 : 10
        for (const render of this.renders) {
            // const territoryUpdated = render.boundingBox == null || render.player.lastTileChange() > render.lastBoundingCalculatedTick
            // if (!territoryUpdated) {
            //     continue
            // }
            if (currTick - render.lastBoundingCalculatedTick > recalcRate) {
                render.lastBoundingCalculatedTick = currTick
                render.boundingBox = calculateBoundingBox(render.player.borderTiles());
            }
            if (render.isVisible && currTick - render.lastRenderCalcTick > recalcRate) {
                render.lastRenderCalcTick = currTick
                this.calculateRenderInfo(render)
            }
        }
    }

    public renderLayer(mainContex: CanvasRenderingContext2D) {
        const [upperLeft, bottomRight] = this.transformHandler.screenBoundingRect()
        for (const player of this.game.playerViews()) {
            if (player.isAlive()) {

                this.renderPlayerInfo(player, mainContex, this.transformHandler.scale, upperLeft, bottomRight)
            }
        }
    }

    calculateRenderInfo(render: RenderInfo) {
        if (render.player.numTilesOwned() == 0) {
            render.fontSize = 0
            return
        }
        // const [cell, size] = placeName(this.game, render.player)
        // render.location = cell
        // render.fontSize = Math.max(1, Math.floor(size))
    }

    renderPlayerInfo(player: PlayerView, context: CanvasRenderingContext2D, scale: number, uppperLeft: Cell, bottomRight: Cell) {
        if (this.alternateView) {
            return
        }
        const name = player.nameLocation()
        if (!name) {
            return
        }


        const nameCenterX = Math.floor(name.x - this.game.width() / 2)
        const nameCenterY = Math.floor(name.y - this.game.height() / 2)

        const iconSize = name.size * 2; // Adjust size as needed
        // const iconX = nameCenterX + render.fontSize * 2; // Position to the right of the name
        // const iconY = nameCenterY - render.fontSize / 2;

        if (player == this.firstPlace) {
            context.drawImage(
                this.crownIconImage,
                nameCenterX - iconSize / 2,
                nameCenterY - iconSize / 2,
                iconSize,
                iconSize
            );
        }


        if (player.isTraitor() && this.traitorIconImage.complete) {
            context.drawImage(
                this.traitorIconImage,
                nameCenterX - iconSize / 2,
                nameCenterY - iconSize / 2,
                iconSize,
                iconSize
            );
        }

        const myPlayer = this.getPlayer()
        if (myPlayer != null && myPlayer.isAlliedWith(player)) {
            context.drawImage(
                this.allianceIconImage,
                nameCenterX - iconSize / 2,
                nameCenterY - iconSize / 2,
                iconSize,
                iconSize
            );
        }

        if (myPlayer != null && new Set(myPlayer.transitiveTargets()).has(player)) {
            context.drawImage(
                this.targetIconImage,
                nameCenterX - iconSize / 2,
                nameCenterY - iconSize / 2,
                iconSize,
                iconSize
            );
        }


        context.textRendering = "optimizeSpeed";

        context.font = `${name.size}px ${this.theme.font()}`;
        context.fillStyle = this.theme.playerInfoColor(player.id()).toHex();
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        context.fillText(player.name(), nameCenterX, nameCenterY - name.size / 2);
        context.font = `bold ${name.size}px ${this.theme.font()}`;

        context.fillText(renderTroops(player.troops()), nameCenterX, nameCenterY + name.size);


        if (myPlayer != null) {
            const emojis = player.outgoingEmojis().filter(e => e.recipient == AllPlayers || e.recipient == myPlayer)
            if (emojis.length > 0) {
                context.font = `${name.size * 4}px ${this.theme.font()}`;
                context.fillStyle = this.theme.playerInfoColor(player.id()).toHex();
                context.textAlign = 'center';
                context.textBaseline = 'middle';

                context.fillText(emojis[0].emoji, nameCenterX, nameCenterY + name.size / 2);
            }
        }
    }

    private getPlayer(): Player | null {
        if (this.myPlayer != null) {
            return this.myPlayer
        }
        this.myPlayer = this.game.players().find(p => p.clientID() == this.clientID)
        return this.myPlayer
    }
}
