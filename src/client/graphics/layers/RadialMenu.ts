import {EventBus} from "../../../core/EventBus";
import {Cell, Game, Player, PlayerID} from "../../../core/game/Game";
import {ClientID} from "../../../core/Schemas";
import {ContextMenuEvent, MouseUpEvent} from "../../InputHandler";
import {SendAttackIntentEvent} from "../../Transport";
import {TransformHandler} from "../TransformHandler";
import {Layer} from "./Layer";
import * as d3 from 'd3';

export class RadialMenu implements Layer {
    private clickedCell: Cell | null = null

    private menuElement: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private isVisible: boolean = false;
    private readonly menuItems = [
        {name: "sub", color: "#3498db"},
        {name: "color", color: "#e74c3c"},
        {name: "shape", color: "#2ecc71"},
        {name: "font", color: "#f39c12"},
        {name: "stroke", color: "#9b59b6"}
    ];
    private readonly menuSize = 300; // Increased size
    private readonly centerButtonSize = 60;

    constructor(
        private eventBus: EventBus,
        private game: Game,
        private transformHandler: TransformHandler,
        private clientID: ClientID,
    ) { }

    init() {
        this.eventBus.on(ContextMenuEvent, e => this.onContextMenu(e))
        this.eventBus.on(MouseUpEvent, e => this.onPointerUp(e))
        this.createMenuElement();
    }

    private createMenuElement() {
        this.menuElement = d3.select(document.body)
            .append('div')
            .style('position', 'fixed')
            .style('display', 'none')
            .style('z-index', '9999')
            .style('touch-action', 'none'); // Prevent default touch actions

        const svg = this.menuElement.append('svg')
            .attr('width', this.menuSize)
            .attr('height', this.menuSize)
            .append('g')
            .attr('transform', `translate(${this.menuSize / 2},${this.menuSize / 2})`);

        const pie = d3.pie<any>()
            .value(() => 1)
            .padAngle(0.03);

        const arc = d3.arc<any>()
            .innerRadius(this.centerButtonSize + 10)
            .outerRadius(this.menuSize / 2 - 10);

        const arcs = svg.selectAll('path')
            .data(pie(this.menuItems))
            .enter()
            .append('g');

        arcs.append('path')
            .attr('d', arc)
            .attr('fill', d => d.data.color)
            .on('click', (event, d) => this.handleMenuSelection(d.data.name))
            .on('touchstart', (event, d) => {
                event.preventDefault();
                this.handleMenuSelection(d.data.name);
            });

        arcs.append('text')
            .attr('transform', d => `translate(${arc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .style('font-size', '14px')
            .text(d => d.data.name);

        // Create a larger, transparent circle for better click detection
        svg.append('circle')
            .attr('r', this.centerButtonSize)
            .attr('fill', 'transparent')
            .style('cursor', 'pointer')
            .on('click', () => this.handleCenterButtonClick())
            .on('touchstart', (event) => {
                this.handleCenterButtonClick();
            });

        // Add visible center button circle
        svg.append('circle')
            .attr('r', this.centerButtonSize - 10)
            .attr('fill', '#2c3e50')
            .style('pointer-events', 'none');

        // Add text to the center button
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.3em')
            .attr('fill', 'white')
            .style('font-size', '16px')
            .style('pointer-events', 'none')
            .text('Attack');
    }

    tick() {
        // Update logic if needed
    }

    render(context: CanvasRenderingContext2D) {
        // No need to render anything on the canvas
    }

    shouldTransform(): boolean {
        return false;
    }

    private onContextMenu(event: ContextMenuEvent) {
        console.log('on context menu')

        this.clickedCell = this.transformHandler.screenToWorldCoordinates(event.x, event.y)
        if (this.isVisible) {
            this.hideRadialMenu()
        } else {
            this.showRadialMenu(event.x, event.y);
        }
    }

    private onPointerUp(event: MouseUpEvent) {
        this.hideRadialMenu()
    }

    private showRadialMenu(x: number, y: number) {
        this.menuElement
            .style('left', `${x - this.menuSize / 2}px`)
            .style('top', `${y - this.menuSize / 2}px`)
            .style('display', 'block');
        this.isVisible = true;
    }

    private hideRadialMenu() {
        this.menuElement.style('display', 'none');
        this.isVisible = false;
    }

    private handleMenuSelection(action: string) {
        console.log(`Selected action: ${action}`);
        this.hideRadialMenu();
    }

    private handleCenterButtonClick() {
        console.log('Center button clicked');
        const clicked = this.game.tile(this.clickedCell)
        if (clicked.owner().clientID() != this.clientID) {
            this.eventBus.emit(new SendAttackIntentEvent(clicked.owner().id()))
        }
        this.hideRadialMenu();
    }
}