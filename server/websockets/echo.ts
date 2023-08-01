import { GameActions, UserId, actionToString, areActionsEqual, stringToAction } from 'drumline-lib';
import { AddressInfo } from 'net';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { RawData, ServerOptions, WebSocket, WebSocketServer } from 'ws';
export { EchoServer };

class EchoServer extends WebSocketServer {
    actions: GameActions[];

    constructor(options: ServerOptions) {
        super(options);

        this.actions = [];

        this.on('error', console.error);

        this.on('listening', () => {
            const addr = this.address();
            if (addr instanceof String) {
                console.log('Listening on %d', addr);
            } else {
                const addrInfo = addr as AddressInfo;
                console.log('Listening on %s:%d', addrInfo.address, addrInfo.port);
            }
        });

        this.on('connection', this.on_connection);

        this.on('close', () => {
            console.log('Closed');
        });
    }

    on_connection = (ws: WebSocket) => {
        console.log('Connected');

        ws.on('error', console.error);
        ws.on('message', this.on_incoming_message);

        // send already known actions to the client
        for (const action of this.actions) {
            const strData = actionToString(action);
            ws.send(strData);
        }
    };

    on_incoming_message = (data: RawData, isBinary: boolean) => {
        if (isBinary) {
            console.error('Received binary data on websocket, ignoring');
            return;
        }
        const strData = data.toString('utf8');
        const action = stringToAction(strData);

        console.log('Received action: ', action);

        // change user_id from private to public
        // make sure uuid is valid and a v5 uuid
        if (!action.user_id || !uuidValidate(action.user_id) || uuidVersion(action.user_id) !== 4) {
            console.error('Action has invalid invalid user_id.');
            return;
        }

        const user_id: UserId = new UserId(action.user_id);
        action.user_id = user_id.public_uuid;

        // do we already know about this action?
        const already_known =
            action.change_count !== -1 &&
            action.change_count > 0 &&
            action.change_count < this.actions.length &&
            areActionsEqual(action, this.actions[action.change_count]);

        if (already_known) {
            // ignore it
            return;
        }

        action.change_count = this.actions.length;

        // save to list of actions
        this.actions.push(action);

        // since newData is a string, it will be encoded
        // as utf8
        const newData = actionToString(action);

        // echo back to all clients, including the one
        // that sent it
        this.clients.forEach((client: WebSocket) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(newData, { binary: false });
            }
        });
    };
}
