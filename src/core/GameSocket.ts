import {LocalServer} from "./LocalServer";

export interface SocketFactory {
    createSocket(): WebSocket;
}

export interface Socket {
    onopen: ((event: Event) => void) | null;
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    onclose: ((event: CloseEvent) => void) | null;
    readyState: number;

    connect(url: string): void;
    send(data: string): void;
    close(code?: number, reason?: string): void;
}

export const WebSocketReadyState = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3
};

export class WebsocketFactory implements SocketFactory {

    constructor(private url: string) { }

    createSocket(): WebSocket {
        return new WebSocket(this.url)
    }
}

export class LocalSocketFactory implements SocketFactory {
    constructor(private localServer: LocalServer) { }

    createSocket(): WebSocket {
        return new LocalSocket(this.localServer)
    }
}

export class LocalSocket implements WebSocket {


    constructor(private server: LocalServer) {
        server.localSocket = this
    }

    binaryType: BinaryType;
    bufferedAmount: number;
    extensions: string;
    onclose: (this: WebSocket, ev: CloseEvent) => any;
    onerror: (this: WebSocket, ev: Event) => any;
    onmessage: (this: WebSocket, ev: MessageEvent) => any;
    onopen: (this: WebSocket, ev: Event) => any;
    protocol: string;
    readyState: number;
    url: string;
    close(code?: number, reason?: string): void {
        // this.server.onclose(new GameCloseEvent())
    }
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        this.server.onMessage(data as string)
    }
    CONNECTING: 0;
    OPEN: 1;
    CLOSING: 2;
    CLOSED: 3;
    addEventListener(type: unknown, listener: unknown, options?: unknown): void {
        throw new Error("Method not implemented.");
    }
    removeEventListener(type: unknown, listener: unknown, options?: unknown): void {
        throw new Error("Method not implemented.");
    }
    dispatchEvent(event: Event): boolean {
        throw new Error("Method not implemented.");
    }

}

export class GameMessageEvent implements MessageEvent {

    readonly data: any;
    readonly origin: string;
    readonly lastEventId: string;
    readonly source: WindowProxy | null;
    readonly ports: ReadonlyArray<MessagePort>;

    constructor(data: any) {
        this.data = data;
    }
    returnValue: boolean;
    srcElement: EventTarget;
    initEvent(type: string, bubbles?: boolean, cancelable?: boolean): void {
        throw new Error("Method not implemented.");
    }
    NONE: 0;
    CAPTURING_PHASE: 1;
    AT_TARGET: 2;
    BUBBLING_PHASE: 3;

    // MessageEvent interface methods
    initMessageEvent(type: string, bubbles?: boolean, cancelable?: boolean, data?: any, origin?: string, lastEventId?: string, source?: WindowProxy | null, ports?: MessagePort[]): void {
        // This method is deprecated, so we'll leave it as a no-op
        console.warn('initMessageEvent is deprecated');
    }

    // Event interface properties and methods
    readonly bubbles: boolean = false;
    readonly cancelBubble: boolean = false;
    readonly cancelable: boolean = false;
    readonly composed: boolean = false;
    readonly currentTarget: EventTarget | null = null;
    readonly defaultPrevented: boolean = false;
    readonly eventPhase: number = Event.NONE;
    readonly isTrusted: boolean = false;
    readonly target: EventTarget | null = null;
    readonly timeStamp: number = Date.now();
    readonly type: string = 'message';

    // Event interface methods
    composedPath(): EventTarget[] {
        return [];
    }

    preventDefault(): void {
        // No-op for this example
    }

    stopImmediatePropagation(): void {
        // No-op for this example
    }

    stopPropagation(): void {
        // No-op for this example
    }
}