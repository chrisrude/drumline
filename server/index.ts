import process from 'node:process';

import { EchoServer } from './websockets/';

const ws_server = new EchoServer({ port: 8080 });

process.on('exit', function exit() {
    ws_server.close();
});
