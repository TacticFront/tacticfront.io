import { EventBus } from "../../../../core/EventBus";
import { AllPlayers, Cell, Game, Player, UnitType } from "../../../../core/game/Game";
import { ClientID } from "../../../../core/Schemas";
import { and, bfs, dist, manhattanDist, manhattanDistWrapped, sourceDstOceanShore, targetTransportTile } from "../../../../core/Util";
import { ContextMenuEvent, MouseUpEvent, ShowBuildMenuEvent } from "../../../InputHandler";
import { SendAllianceRequestIntentEvent, SendAttackIntentEvent, SendBoatAttackIntentEvent, SendBreakAllianceIntentEvent, SendDonateIntentEvent, SendEmojiIntentEvent, SendSpawnIntentEvent, SendTargetPlayerIntentEvent } from "../../../Transport";
import { TransformHandler } from "../../TransformHandler";
import { Layer } from "../Layer";
import * as d3 from 'd3';
import traitorIcon from '../../../../../resources/images/TraitorIconWhite.png';
import allianceIcon from '../../../../../resources/images/AllianceIconWhite.png';
import boatIcon from '../../../../../resources/images/BoatIconWhite.png';
import swordIcon from '../../../../../resources/images/SwordIconWhite.png';
import targetIcon from '../../../../../resources/images/TargetIconWhite.png';
import emojiIcon from '../../../../../resources/images/EmojiIconWhite.png';
import disabledIcon from '../../../../../resources/images/DisabledIcon.png';
import donateIcon from '../../../../../resources/images/DonateIconWhite.png';
import buildIcon from '../../../../../resources/images/BuildIconWhite.svg';
import { EmojiTable } from "./EmojiTable";
import { UIState } from "../../UIState";
import { BuildMenu } from "./BuildMenu";
import { consolex } from "../../../../core/Consolex";
import { GameView } from "../../../../core/GameView";


enum Slot {
    Alliance,
    Boat,
    Target,
    Emoji,
    Build,
}

export class RadialMenu implements Layer {
    private clickedCell: Cell | null = null

    private menuElement: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private isVisible: boolean = false;
    private readonly menuItems = new Map([
        [Slot.Alliance, { name: "alliance", disabled: true, action: () => { }, color: null, icon: null }],
        [Slot.Boat, { name: "boat", disabled: true, action: () => { }, color: null, icon: null }],
        [Slot.Target, { name: "target", disabled: true, action: () => { } }],
        [Slot.Emoji, { name: "emoji", disabled: true, action: () => { } }],
        [Slot.Build, { name: "build", disabled: true, action: () => { } }],
    ]);

    private readonly menuSize = 190;
    private readonly centerButtonSize = 30;
    private readonly iconSize = 32;
    private readonly centerIconSize = 48;
    private readonly disabledColor = d3.rgb(128, 128, 128).toString();

    private isCenterButtonEnabled = false

    constructor(
        private eventBus: EventBus,
        private game: GameView,
        private transformHandler: TransformHandler,
        private clientID: ClientID,
        private emojiTable: EmojiTable,
        private buildMenu: BuildMenu,
        private uiState: UIState
    ) { }

    init() {
        this.eventBus.on(ContextMenuEvent, e => this.onContextMenu(e))
        this.eventBus.on(MouseUpEvent, e => this.onPointerUp(e))
        this.eventBus.on(ShowBuildMenuEvent, e => {
            const clickedCell = this.transformHandler.screenToWorldCoordinates(e.x, e.y)
            if (clickedCell == null) {
                return
            }
            if (!this.game.isOnMap(clickedCell)) {
                return
            }
            const p = this.game.playerByClientID(this.clientID)
            if (p == null) {
                return
            }
            this.buildMenu.showMenu(p, clickedCell)
        })
        this.createMenuElement();
    }

    private createMenuElement() {
        this.menuElement = d3.select(document.body)
            .append('div')
            .style('position', 'fixed')
            .style('display', 'none')
            .style('z-index', '9999')
            .style('touch-action', 'none');

        const svg = this.menuElement.append('svg')
            .attr('width', this.menuSize)
            .attr('height', this.menuSize)
            .append('g')
            .attr('transform', `translate(${this.menuSize / 2},${this.menuSize / 2})`);

        const pie = d3.pie<any>()
            .value(() => 1)
            .padAngle(0.03);

        const arc = d3.arc<any>()
            .innerRadius(this.centerButtonSize + 5)
            .outerRadius(this.menuSize / 2 - 10);

        const arcs = svg.selectAll('path')
            .data(pie(Array.from(this.menuItems.values())))
            .enter()
            .append('g');

        arcs.append('path')
            .attr('d', arc)
            .attr('fill', d => d.data.disabled ? this.disabledColor : d.data.color)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', '2')
            .style('cursor', d => d.data.disabled ? 'not-allowed' : 'pointer')
            .style('opacity', d => d.data.disabled ? 0.5 : 1)
            .attr('data-name', d => d.data.name)
            .on('mouseover', function (event, d) {
                if (!d.data.disabled) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('transform', 'scale(1.05)')
                        .attr('filter', 'url(#glow)');
                }
            })
            .on('mouseout', function (event, d) {
                if (!d.data.disabled) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('transform', 'scale(1)')
                        .attr('filter', null);
                }
            })
            .on('click', (event, d) => {
                if (!d.data.disabled) {
                    d.data.action();
                    this.hideRadialMenu();
                }
            })
            .on('touchstart', (event, d) => {
                event.preventDefault();
                if (!d.data.disabled) {
                    d.data.action();
                    this.hideRadialMenu();
                }
            });
        arcs.append('image')
            .attr('xlink:href', d => d.data.icon)
            .attr('width', this.iconSize)
            .attr('height', this.iconSize)
            .attr('x', d => arc.centroid(d)[0] - this.iconSize / 2)
            .attr('y', d => arc.centroid(d)[1] - this.iconSize / 2)
            .style('pointer-events', 'none')
            .attr('data-name', d => d.data.name);

        // Add glow filter
        const defs = svg.append('defs');
        const filter = defs.append('filter')
            .attr('id', 'glow');
        filter.append('feGaussianBlur')
            .attr('stdDeviation', '3')
            .attr('result', 'coloredBlur');
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode')
            .attr('in', 'coloredBlur');
        feMerge.append('feMergeNode')
            .attr('in', 'SourceGraphic');

        const centerButton = svg.append('g')
            .attr('class', 'center-button');

        centerButton.append('circle')
            .attr('class', 'center-button-hitbox')
            .attr('r', this.centerButtonSize)
            .attr('fill', 'transparent')
            .style('cursor', 'pointer')
            .on('click', () => this.handleCenterButtonClick())
            .on('touchstart', (event: Event) => {
                event.preventDefault();
                this.handleCenterButtonClick();
            })
            .on('mouseover', () => this.onCenterButtonHover(true))
            .on('mouseout', () => this.onCenterButtonHover(false));

        centerButton.append('circle')
            .attr('class', 'center-button-visible')
            .attr('r', this.centerButtonSize)
            .attr('fill', '#2c3e50')
            .style('pointer-events', 'none');

        // Replace text with sword icon
        centerButton.append('image')
            .attr('class', 'center-button-icon')
            .attr('xlink:href', swordIcon)
            .attr('width', this.centerIconSize)
            .attr('height', this.centerIconSize)
            .attr('x', -this.centerIconSize / 2)
            .attr('y', -this.centerIconSize / 2)
            .style('pointer-events', 'none');
    }

    tick() {
        // Update logic if needed
    }

    renderLayer(context: CanvasRenderingContext2D) {
        // No need to render anything on the canvas
    }

    shouldTransform(): boolean {
        return false;
    }

    private onContextMenu(event: ContextMenuEvent) {
        if (this.buildMenu.isVisible) {
            this.buildMenu.hideMenu()
            return
        }
        if (this.isVisible) {
            this.hideRadialMenu()
            return
        } else {
            this.showRadialMenu(event.x, event.y);
        }
        this.enableCenterButton(false)
        for (const item of this.menuItems.values()) {
            item.disabled = true
            this.updateMenuItemState(item)
        }

        this.clickedCell = this.transformHandler.screenToWorldCoordinates(event.x, event.y)
        if (!this.game.isOnMap(this.clickedCell)) {
            return
        }
        const tile = this.game.tile(this.clickedCell)
        const other = tile.owner()

        if (this.game.inSpawnPhase()) {
            if (tile.terrain().isLand() && !tile.hasOwner()) {
                this.enableCenterButton(true)
            }
            return
        }

        const myPlayer = this.game.players().find(p => p.clientID() == this.clientID)
        if (!myPlayer) {
            consolex.warn('my player not found')
            return
        }

        this.activateMenuElement(Slot.Build, "#ebe250", buildIcon, () => {
            this.buildMenu.showMenu(myPlayer, this.clickedCell)
        })

        if (tile.hasOwner()) {
            const target = tile.owner() == myPlayer ? AllPlayers : (tile.owner() as Player)
            if (myPlayer.canSendEmoji(target)) {
                this.activateMenuElement(Slot.Emoji, "#00a6a4", emojiIcon, () => {
                    this.emojiTable.onEmojiClicked = (emoji: string) => {
                        this.emojiTable.hideTable()
                        this.eventBus.emit(new SendEmojiIntentEvent(target, emoji))
                    }
                    this.emojiTable.showTable()
                })
            }
        }

        if (tile.owner() != myPlayer && tile.terrain().isLand() && myPlayer.sharesBorderWith(other)) {
            if (other.isPlayer()) {
                if (!myPlayer.isAlliedWith(other)) {
                    this.enableCenterButton(true)
                }
            } else {
                outer_loop: for (const t of bfs(tile, and(t => !t.hasOwner() && t.terrain().isLand(), dist(tile, 200)))) {
                    for (const n of t.neighbors()) {
                        if (n.owner() == myPlayer) {
                            this.enableCenterButton(true)
                            break outer_loop
                        }
                    }
                }
            }
        }

        if (tile.hasOwner()) {
            const other = tile.owner() as Player
            if (other.clientID() == this.clientID) {
                return
            }

            if (myPlayer.canDonate(other)) {
                this.activateMenuElement(Slot.Target, "#53ac75", donateIcon, () => {
                    this.eventBus.emit(
                        new SendDonateIntentEvent(myPlayer, other, null)
                    )
                })
            }

            if (myPlayer.isAlliedWith(other)) {
                this.activateMenuElement(Slot.Alliance, "#c74848", traitorIcon, () => {
                    this.eventBus.emit(
                        new SendBreakAllianceIntentEvent(myPlayer, other)
                    )
                })
            } else if (!myPlayer.recentOrPendingAllianceRequestWith(other)) {
                this.activateMenuElement(Slot.Alliance, "#53ac75", allianceIcon, () => {
                    this.eventBus.emit(
                        new SendAllianceRequestIntentEvent(myPlayer, other)
                    )
                })
            }
            if (myPlayer.canTarget(other)) {
                this.activateMenuElement(Slot.Target, "#c74848", targetIcon, () => {
                    this.eventBus.emit(
                        new SendTargetPlayerIntentEvent(other.id())
                    )
                })
            }
        }

        if (!tile.terrain().isLand()) {
            return
        }
        if (myPlayer.units(UnitType.TransportShip).length >= this.game.config().boatMaxNumber()) {
            return
        }

        let myPlayerBordersOcean = false
        for (const bt of myPlayer.borderTiles()) {
            if (bt.terrain().isOceanShore()) {
                myPlayerBordersOcean = true
                break
            }
        }
        let otherPlayerBordersOcean = false
        if (!tile.hasOwner()) {
            otherPlayerBordersOcean = true
        } else {
            for (const bt of (other as Player).borderTiles()) {
                if (bt.terrain().isOceanShore()) {
                    otherPlayerBordersOcean = true
                    break
                }
            }
        }

        if (other.isPlayer() && myPlayer.allianceWith(other)) {
            return
        }

        let nearOcean = false
        for (const t of bfs(tile, and(t => t.owner() == tile.owner() && t.terrain().isLand(), dist(tile, 25)))) {
            if (t.terrain().isOceanShore()) {
                nearOcean = true
                break
            }
        }
        if (!nearOcean) {
            return
        }

        if (myPlayerBordersOcean && otherPlayerBordersOcean) {
            const dst = targetTransportTile(this.game.width(), tile)
            if (dst != null) {
                if (myPlayer.canBuild(UnitType.TransportShip, dst)) {
                    this.activateMenuElement(Slot.Boat, "#3f6ab1", boatIcon, () => {
                        this.eventBus.emit(
                            new SendBoatAttackIntentEvent(other.id(), this.clickedCell, this.uiState.attackRatio * myPlayer.troops())
                        )
                    })
                }
            }
        }
    }

    private onPointerUp(event: MouseUpEvent) {
        this.hideRadialMenu()
        this.emojiTable.hideTable()
        this.buildMenu.hideMenu()
    }

    private showRadialMenu(x: number, y: number) {
        // Delay so center button isn't clicked immediately on press.
        setTimeout(() => {
            this.menuElement
                .style('left', `${x - this.menuSize / 2}px`)
                .style('top', `${y - this.menuSize / 2}px`)
                .style('display', 'block');
            this.isVisible = true;
        }, 50)
    }

    private hideRadialMenu() {
        this.menuElement.style('display', 'none');
        this.isVisible = false;
    }

    private handleCenterButtonClick() {
        if (!this.isCenterButtonEnabled) {
            return
        }
        consolex.log('Center button clicked');
        const clicked = this.game.tile(this.clickedCell)
        if (this.game.inSpawnPhase()) {
            this.eventBus.emit(new SendSpawnIntentEvent(this.clickedCell))
        } else {
            if (clicked.owner().clientID() != this.clientID) {
                const myPlayer = this.game.players().find(p => p.clientID() == this.clientID)
                if (myPlayer != null) {
                    this.eventBus.emit(new SendAttackIntentEvent(clicked.owner().id(), this.uiState.attackRatio * myPlayer.troops()))
                }
            }
        }
        this.hideRadialMenu();
    }

    private activateMenuElement(slot: Slot, color: string, icon: string, action: () => void) {
        const menuItem = this.menuItems.get(slot)
        menuItem.action = action
        menuItem.disabled = false
        menuItem.color = color
        menuItem.icon = icon
        this.updateMenuItemState(menuItem)
    }

    private updateMenuItemState(item: any) {
        const menuItem = this.menuElement.select(`path[data-name="${item.name}"]`);
        menuItem
            .attr('fill', item.disabled ? this.disabledColor : item.color)
            .style('cursor', item.disabled ? 'not-allowed' : 'pointer')
            .style('opacity', item.disabled ? 0.5 : 1);

        this.menuElement.select(`image[data-name="${item.name}"]`)
            .attr('xlink:href', item.disabled ? disabledIcon : item.icon)
            .attr('fill', item.disabled ? '#999999' : 'white');
    }

    private onCenterButtonHover(isHovering: boolean) {
        if (!this.isCenterButtonEnabled) return;

        const scale = isHovering ? 1.2 : 1;
        const fontSize = isHovering ? '18px' : '16px';

        this.menuElement.select('.center-button-hitbox').transition().duration(200).attr('r', this.centerButtonSize * scale);
        this.menuElement.select('.center-button-visible').transition().duration(200).attr('r', this.centerButtonSize * scale);
        this.menuElement.select('.center-button-text').transition().duration(200).style('font-size', fontSize);
    }

    private enableCenterButton(enabled: boolean) {
        this.isCenterButtonEnabled = enabled
        const centerButton = this.menuElement.select('.center-button');

        centerButton.select('.center-button-hitbox')
            .style('cursor', enabled ? 'pointer' : 'not-allowed');

        centerButton.select('.center-button-visible')
            .attr('fill', enabled ? '#2c3e50' : '#999999');

        centerButton.select('.center-button-text')
            .attr('fill', enabled ? 'white' : '#cccccc');
    }
}