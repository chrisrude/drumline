import process from 'node:process';

import { EchoServer } from './websockets/';

const server = new EchoServer({ port: 8080 });

process.on('exit', function exit() {
    server.close();
});
