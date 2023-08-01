import process from 'node:process';

import { server } from './express';
import { EchoServer } from './websockets/';

function onSocketError(err: Error) {
    console.error(err);
}

const ws_server = new EchoServer({ noServer: true });

server.on('upgrade', function upgrade(request, socket, head) {
    socket.on('error', onSocketError);
    ws_server.handleUpgrade(request, socket, head, function done(ws) {
        ws_server.emit('connection', ws, request);
    });
});

process.on('exit', function exit() {
    ws_server.close();
});
