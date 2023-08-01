'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.EchoServer = void 0;
const ws_1 = require('ws');
class EchoServer extends ws_1.WebSocketServer {
    constructor(options) {
        super(options);
        this.on('error', console.error);
        this.on('listening', function listening() {
            const addr = this.address();
            if (addr instanceof String) {
                console.log('Listening on %d', addr);
            } else {
                const addrInfo = addr;
                console.log('Listening on %s:%d', addrInfo.address, addrInfo.port);
            }
        });
        this.on('connection', function connection(ws) {
            console.log('Connected');
            ws.on('error', console.error);
            ws.on('message', (data, isBinary) => {
                console.log('Received %s', data);
                this.clients.forEach((client) => {
                    if (client === ws) {
                        return;
                    }
                    if (client.readyState === ws_1.WebSocket.OPEN) {
                        client.send(data, { binary: isBinary });
                    }
                });
            });
        });
        this.on('close', function close() {
            console.log('Closed');
        });
    }
}
exports.EchoServer = EchoServer;
//# sourceMappingURL=echo.js.map
