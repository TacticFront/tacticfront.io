import { AllPlayers, Cell, Game, Player, PlayerType } from "../../../core/game/Game"
import { PseudoRandom } from "../../../core/PseudoRandom"
import { calculateBoundingBox } from "../../../core/Util"
import { Theme } from "../../../core/configuration/Config"
import { Layer } from "./Layer"
import { TransformHandler } from "../TransformHandler"
import traitorIcon from '../../../../resources/images/TraitorIcon.png';
import allianceIcon from '../../../../resources/images/AllianceIcon.png';
import crownIcon from '../../../../resources/images/CrownIcon.png';
import targetIcon from '../../../../resources/images/TargetIcon.png';
import { ClientID } from "../../../core/Schemas"
import { GameView, PlayerView } from "../../../core/GameView"
import { createCanvas, renderTroops } from "../../Utils"


class RenderInfo {
    public icons: Map<string, HTMLImageElement> = new Map() // Track icon elements

    constructor(
        public player: PlayerView,
        public lastRenderCalc: number,
        public location: Cell,
        public fontSize: number,
        public element: HTMLElement
    ) { }
}

export class NameLayer implements Layer {

    private canvas: HTMLCanvasElement
    private context: CanvasRenderingContext2D

    private lastChecked = 0

    private renderCheckRate = 100
    private renderRefreshRate = 500

    private rand = new PseudoRandom(10)
    private renders: RenderInfo[] = []
    private seenPlayers: Set<Player> = new Set()
    private traitorIconImage: HTMLImageElement;
    private allianceIconImage: HTMLImageElement;
    private targetIconImage: HTMLImageElement;
    private crownIconImage: HTMLImageElement;

    private container: HTMLDivElement


    private myPlayer: Player | null = null

    private firstPlace: Player | null = null

    private lastUpdate = 0
    private updateFrequency = 250

    private lastRect = null;

    constructor(private game: GameView, private theme: Theme, private transformHandler: TransformHandler, private clientID: ClientID) {
        this.traitorIconImage = new Image();
        this.traitorIconImage.src = traitorIcon;

        this.allianceIconImage = new Image()
        this.allianceIconImage.src = allianceIcon

        this.crownIconImage = new Image()
        this.crownIconImage.src = crownIcon

        this.targetIconImage = new Image()
        this.targetIconImage.src = targetIcon
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        //this.redraw()
    }


    shouldTransform(): boolean {
        return false
    }

    public init() {
        // this.canvas = document.createElement('canvas');
        this.canvas = createCanvas()
        this.context = this.canvas.getContext("2d")



        window.addEventListener('resize', () => this.resizeCanvas());
        this.resizeCanvas();

        this.container = document.createElement('div')
        this.container.style.position = 'fixed'
        this.container.style.left = '50%'
        this.container.style.top = '50%'
        this.container.style.pointerEvents = 'none' // Don't interfere with game interaction
        this.container.style.zIndex = '1000' // Add this line
        document.body.appendChild(this.container)
    }

    public tick() {
        if (this.game.ticks() % 10 != 0) {
            return
        }
        const sorted = this.game.players().sort((a, b) => b.numTilesOwned() - a.numTilesOwned())
        if (sorted.length > 0) {
            this.firstPlace = sorted[0]
        }

        for (const player of this.game.playerViews()) {
            if (player.isAlive()) {
                if (!this.seenPlayers.has(player)) {
                    this.seenPlayers.add(player)
                    this.renders.push(new RenderInfo(player, 0, null, 0, this.createPlayerElement(player)))
                }
            }
        }
    }

    public renderLayer(mainContex: CanvasRenderingContext2D) {
        const screenPosOld = this.transformHandler.worldToScreenCoordinates(new Cell(0, 0))
        const screenPos = new Cell(screenPosOld.x - window.innerWidth / 2, screenPosOld.y - window.innerHeight / 2)

        // render.element.style.fontSize = `${render.fontSize}px`
        this.container.style.transform = `translate(${screenPos.x}px, ${screenPos.y}px) scale(${this.transformHandler.scale})`

        const now = Date.now()
        if (now > this.lastChecked + this.renderCheckRate) {
            this.lastChecked = now
            for (const render of this.renders) {
                this.renderPlayerInfo(render)
            }
        }

        mainContex.drawImage(
            this.canvas,
            0,
            0,
            mainContex.canvas.width,
            mainContex.canvas.height
        )
    }

    private createPlayerElement(player: Player): HTMLDivElement {
        const element = document.createElement('div')
        element.style.position = 'absolute'
        element.style.display = 'flex'
        element.style.flexDirection = 'column'
        element.style.alignItems = 'center'
        // Don't set initial transform, will be handled in renderPlayerInfo

        const nameDiv = document.createElement('div')
        nameDiv.innerHTML = player.name()
        nameDiv.style.color = this.theme.playerInfoColor(player.id()).toHex()
        nameDiv.style.fontFamily = this.theme.font()
        nameDiv.style.whiteSpace = 'nowrap'
        nameDiv.style.overflow = 'hidden'
        nameDiv.style.textOverflow = 'ellipsis'
        element.appendChild(nameDiv)

        const troopsDiv = document.createElement('div')
        troopsDiv.textContent = renderTroops(player.troops())
        troopsDiv.style.color = this.theme.playerInfoColor(player.id()).toHex()
        troopsDiv.style.fontFamily = this.theme.font()
        troopsDiv.style.fontWeight = 'bold'
        element.appendChild(troopsDiv)

        const iconsDiv = document.createElement('div')
        iconsDiv.style.position = 'absolute'
        iconsDiv.style.display = 'flex'
        element.appendChild(iconsDiv)

        this.container.appendChild(element)
        return element
    }

    renderPlayerInfo(render: RenderInfo) {
        if (!render.player.nameLocation() || !render.player.isAlive()) {
            console.log(`remove ${render.player.name()}`)
            this.renders = this.renders.filter(r => r != render)
            render.element.remove()
            return
        }
        const oldLocation = render.location
        render.location = new Cell(render.player.nameLocation().x, render.player.nameLocation().y)
        render.fontSize = Math.max(1, Math.floor(render.player.nameLocation().size))
        // console.log(`zoom ${this.transformHandler.scale}, size: ${render.player.nameLocation().size}`)
        const size = this.transformHandler.scale * render.player.nameLocation().size
        if (size < 10) {
            if (render.element.style.display != 'none') {
                render.element.style.display = 'none'
            }
            return
        }
        if (!this.transformHandler.isOnScreen(render.location)) {
            if (render.element.style.display != 'none') {
                render.element.style.display = 'none'
            }
            return
        }
        if (render.element.style.display != 'flex') {
            render.element.style.display = 'flex'
        }
        const now = Date.now()
        if (now - render.lastRenderCalc > this.renderRefreshRate) {
            render.lastRenderCalc = now + this.rand.nextInt(0, 100)
        } else {
            return
        }

        // Update troops count
        const troopsDiv = render.element.children[1] as HTMLDivElement
        troopsDiv.textContent = renderTroops(render.player.troops())

        // Get icons container
        const iconsDiv = render.element.children[2] as HTMLDivElement
        const iconSize = Math.floor(render.fontSize * 2)
        const myPlayer = this.getPlayer()

        // Handle crown icon
        const existingCrown = iconsDiv.querySelector('[data-icon="crown"]')
        if (render.player === this.firstPlace) {
            if (!existingCrown) {
                iconsDiv.appendChild(this.createIconElement(this.crownIconImage.src, iconSize, 'crown'))
            }
        } else if (existingCrown) {
            existingCrown.remove()
        }

        // Handle traitor icon
        const existingTraitor = iconsDiv.querySelector('[data-icon="traitor"]')
        if (render.player.isTraitor()) {
            if (!existingTraitor) {
                iconsDiv.appendChild(this.createIconElement(this.traitorIconImage.src, iconSize, 'traitor'))
            }
        } else if (existingTraitor) {
            existingTraitor.remove()
        }

        // Handle alliance icon
        const existingAlliance = iconsDiv.querySelector('[data-icon="alliance"]')
        if (myPlayer != null && myPlayer.isAlliedWith(render.player)) {
            if (!existingAlliance) {
                iconsDiv.appendChild(this.createIconElement(this.allianceIconImage.src, iconSize, 'alliance'))
            }
        } else if (existingAlliance) {
            existingAlliance.remove()
        }

        // Handle target icon
        const existingTarget = iconsDiv.querySelector('[data-icon="target"]')
        if (myPlayer != null && new Set(myPlayer.transitiveTargets()).has(render.player)) {
            if (!existingTarget) {
                iconsDiv.appendChild(this.createIconElement(this.targetIconImage.src, iconSize, 'target'))
            }
        } else if (existingTarget) {
            existingTarget.remove()
        }

        // Update icon sizes based on scale
        const icons = iconsDiv.getElementsByTagName('img')
        for (const icon of icons) {
            icon.style.width = `${iconSize}px`
            icon.style.height = `${iconSize}px`
            icon.style.transform = `translateY(${iconSize / 4}px)`
        }

        if (!render.location) {
            return
        }

        if (render.location != oldLocation) {
            // Handle all positioning in a single transform
            render.element.style.transform = `translate(${render.location.x}px, ${render.location.y}px) translate(-50%, -50%) scale(${render.fontSize * 0.07})`
        }
    }

    private createIconElement(src: string, size: number, id: string): HTMLImageElement {
        const icon = document.createElement('img')
        icon.src = src
        icon.style.width = `${size}px`
        icon.style.height = `${size}px`
        icon.setAttribute('data-icon', id)
        icon.style.transform = `translateY(${size / 4}px)`
        return icon
    }

    private getPlayer(): Player | null {
        if (this.myPlayer != null) {
            return this.myPlayer
        }
        this.myPlayer = this.game.players().find(p => p.clientID() == this.clientID)
        return this.myPlayer
    }
}