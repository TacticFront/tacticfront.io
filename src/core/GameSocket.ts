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