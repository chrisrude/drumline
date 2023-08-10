export { ReconnectWsClient };
export type {
    ConnectionInfo,
    WSClientEvent,
    WSClientEventCallback,
    WSClientEventType,
    WSClientStatus
};

interface ConnectionInfo {
    use_tls: boolean;
    host: string;
    port: number;
}

class ExponentialBackoffFactor {
    readonly c_min: number;
    readonly c_max: number;

    c: number;

    constructor(min: number, max: number) {
        this.c_min = min;
        this.c_max = max;
        this.c = min;
    }

    next(): number {
        const c = this._next_c();
        const exp_c = Math.pow(2, c);
        // return random number between 0 and exp_c
        return Math.floor(Math.random() * exp_c);
    }

    _next_c(): number {
        if (this.c === this.c_max) {
            return this.c;
        }
        this.c += 1;
        return this.c;
    }

    reset() {
        this.c = this.c_min;
    }
}
const RECONNECT_TIMEOUT_UNIT_MS: number = 100;

type WSClientStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

type WSClientEventType = WSClientStatus | 'data';

interface WSClientEvent {
    type: WSClientEventType;
    message?: string;
}

type WSClientEventCallback = (event: WSClientEvent) => void;

type SetTimeoutType = ReturnType<typeof setTimeout>;

// a websocket client that automatically reconnects
class ReconnectWsClient {
    callback: WSClientEventCallback | null;
    connection_state: WSClientStatus;
    readonly connection_info: ConnectionInfo;
    readonly factor: ExponentialBackoffFactor;

    close_forever: boolean;
    reconnect_timeout: SetTimeoutType | null;

    ws: WebSocket | null;

    constructor(connection_info: ConnectionInfo) {
        this.callback = null;
        this.connection_state = 'disconnected';
        this.connection_info = connection_info;
        this.factor = new ExponentialBackoffFactor(0, 10);
        this.close_forever = false;
        this.reconnect_timeout = null;
        this.ws = null;
    }

    set_callback = (callback: WSClientEventCallback) => {
        this.callback = callback;
    };

    _fire_callback = (event: WSClientEvent) => {
        if (this.callback === null) {
            return;
        }
        this.callback(event);
    };

    _set_status = (status: WSClientStatus) => {
        this.connection_state = status;
        this._fire_callback({
            type: status
        });
    };

    make_url = () => {
        const { use_tls, host, port } = this.connection_info;
        const protocol = use_tls ? 'wss' : 'ws';
        return `${protocol}://${host}:${port}/`;
    };

    schedule_reconnect = () => {
        this.clear_timeout();
        const total_timeout_ms = RECONNECT_TIMEOUT_UNIT_MS * this.factor.next();
        this.reconnect_timeout = setTimeout(this.connect, total_timeout_ms);
    };

    connect = () => {
        if (this.ws !== null) {
            return;
        }
        const url = this.make_url();
        this.ws = new WebSocket(url);

        this.ws.addEventListener('open', () => {
            this.clear_timeout();
            this.factor.reset();
            this._set_status('connected');
        });
        this.ws.addEventListener('message', (message: MessageEvent) => {
            this._fire_callback({
                type: 'data',
                message: message.data
            });
        });
        this.ws.addEventListener('close', () => {
            this._close_internal();
            if (this.close_forever) {
                this._set_status('disconnected');
                return;
            }
            this.schedule_reconnect();
            this._set_status('reconnecting');
        });
    };

    clear_timeout = () => {
        if (this.reconnect_timeout === null) {
            return;
        }
        clearTimeout(this.reconnect_timeout);
        this.reconnect_timeout = null;
    };

    close = () => {
        this.close_forever = true;
        this._close_internal();
    };

    _close_internal = () => {
        this.clear_timeout();
        if (this.ws === null) {
            return;
        }
        const ws = this.ws;
        this.ws = null;
        ws.close();
    };

    send = (message: string): boolean => {
        if (this.ws === null || this.ws.readyState !== WebSocket.OPEN) {
            console.log('Socket not connected');
            return false;
        }
        // if the socket is in OPEN, it will try to send the
        // message.
        // If the socket is in CONNECTING, it will throw an
        // InvalidStateError.
        // If the socket is in CLOSING or CLOSED, it will silently
        // drop the message.
        try {
            this.ws.send(message);
            return true;
        } catch (e) {
            console.log('Error sending message: ', e);
            return false;
        }
    };
}
