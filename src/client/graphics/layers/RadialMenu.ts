import {EventBus} from "../../../core/EventBus";
import {ContextMenuEvent} from "../../InputHandler";
import {Layer} from "./Layer";
import * as d3 from 'd3';

export class RadialMenu implements Layer {
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

    constructor(private eventBus: EventBus) { }

    init() {
        this.eventBus.on(ContextMenuEvent, e => this.onContextMenu(e))
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

        // Add center button
        svg.append('circle')
            .attr('r', this.centerButtonSize)
            .attr('fill', '#2c3e50')
            .on('click', () => this.handleCenterButtonClick())
            .on('touchstart', (event) => {
                event.preventDefault();
                this.handleCenterButtonClick();
            });

        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.3em')
            .attr('fill', 'white')
            .style('font-size', '14px')
            .text('Close');
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

        if (this.isVisible) {
            this.hideRadialMenu()
        } else {
            this.showRadialMenu(event.x, event.y);
        }
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
        this.hideRadialMenu();
    }
}