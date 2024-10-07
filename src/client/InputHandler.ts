import {EventBus, GameEvent} from "../core/EventBus";


export class MouseUpEvent implements GameEvent {
    constructor(
        public readonly x: number,
        public readonly y: number,
    ) { }
}

export class MouseDownEvent implements GameEvent {
    constructor(
        public readonly x: number,
        public readonly y: number,
    ) { }
}

export class ContextMenuEvent implements GameEvent {
    constructor(
        public readonly x: number,
        public readonly y: number,
    ) { }
}

export class ZoomEvent implements GameEvent {
    constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly delta: number
    ) { }
}

export class DragEvent implements GameEvent {
    constructor(
        public readonly deltaX: number,
        public readonly deltaY: number,
    ) { }
}

export class InputHandler {

    private lastPointerX: number = 0;
    private lastPointerY: number = 0;

    private lastPointerDownX: number = 0;
    private lastPointerDownY: number = 0;

    private pointers: Map<number, PointerEvent> = new Map();

    private lastPinchDistance: number = 0;

    private pointerDown: boolean = false

    constructor(private canvas: HTMLCanvasElement, private eventBus: EventBus) { }

    initialize() {
        this.canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
        this.canvas.addEventListener("pointerup", (e) => this.onPointerUp(e));
        this.canvas.addEventListener("wheel", (e) => this.onScroll(e), {passive: false});
        this.canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
        this.canvas.addEventListener('contextmenu', (e: MouseEvent) => {
            this.onContextMenu(e);
        });
        this.pointers.clear()
    }

    private onPointerDown(event: PointerEvent) {

        if (event.button > 0) {
            return
        }

        this.pointerDown = true
        this.pointers.set(event.pointerId, event);

        if (this.pointers.size === 1) {
            this.lastPointerX = event.clientX;
            this.lastPointerY = event.clientY;

            this.lastPointerDownX = event.clientX
            this.lastPointerDownY = event.clientY

            this.eventBus.emit(new MouseDownEvent(event.clientX, event.clientY));
        } else if (this.pointers.size === 2) {
            this.lastPinchDistance = this.getPinchDistance();
        }
    }

    onPointerUp(event: PointerEvent) {
        if (event.button > 0) {
            return
        }
        this.pointerDown = false
        this.pointers.delete(event.pointerId);

        const dist = Math.abs(event.x - this.lastPointerDownX) + Math.abs(event.y - this.lastPointerDownY);
        if (dist < 10) {
            if (event.pointerType == "touch") {
                event.preventDefault()
                this.eventBus.emit(new ContextMenuEvent(event.clientX, event.clientY))
            } else {
                this.eventBus.emit(new MouseUpEvent(event.x, event.y))
            }
        }
    }

    private onScroll(event: WheelEvent) {
        this.eventBus.emit(new ZoomEvent(event.x, event.y, event.deltaY))
    }

    private onPointerMove(event: PointerEvent) {
        if (event.button > 0) {
            return
        }


        this.pointers.set(event.pointerId, event);

        if (!this.pointerDown) {
            return
        }

        if (this.pointers.size === 1) {
            const deltaX = event.clientX - this.lastPointerX;
            const deltaY = event.clientY - this.lastPointerY;

            this.eventBus.emit(new DragEvent(deltaX, deltaY));

            this.lastPointerX = event.clientX;
            this.lastPointerY = event.clientY;
        } else if (this.pointers.size === 2) {
            const currentPinchDistance = this.getPinchDistance();
            const pinchDelta = currentPinchDistance - this.lastPinchDistance;

            if (Math.abs(pinchDelta) > 1) {  // Threshold to avoid tiny zoom adjustments
                const zoomCenter = this.getPinchCenter();
                this.eventBus.emit(new ZoomEvent(zoomCenter.x, zoomCenter.y, -pinchDelta * 2));
                this.lastPinchDistance = currentPinchDistance;
            }
        }
    }

    private onContextMenu(event: MouseEvent) {
        event.preventDefault()
        this.eventBus.emit(new ContextMenuEvent(event.clientX, event.clientY))
    }

    private getPinchDistance(): number {
        const pointerEvents = Array.from(this.pointers.values());
        const dx = pointerEvents[0].clientX - pointerEvents[1].clientX;
        const dy = pointerEvents[0].clientY - pointerEvents[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private getPinchCenter(): {x: number, y: number} {
        const pointerEvents = Array.from(this.pointers.values());
        return {
            x: (pointerEvents[0].clientX + pointerEvents[1].clientX) / 2,
            y: (pointerEvents[0].clientY + pointerEvents[1].clientY) / 2
        };
    }

}