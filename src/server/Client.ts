import WebSocket from 'ws';
import { ClientID } from '../core/Schemas';


export class Client {

    public lastPing: number

    constructor(
        public readonly clientID: ClientID,
        public readonly persistentID: string,
        public readonly ip: string | null,
        public readonly ws: WebSocket,
    ) { }
}