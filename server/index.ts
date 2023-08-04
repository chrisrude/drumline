import process from 'node:process';

import cookieSession from 'cookie-session';
import express from 'express';
import http from 'http';
import { SECRET_COOKIE_SALT } from './secrets';
import { EchoServer } from './websockets/';

function onSocketError(err: Error) {
    console.error(err);
}

const app = express();

// todo: connect to redis
// const redis_client = new PuzzleRedisClient(
//     SECRET_REDIS_URL,
//     SECRET_REDIS_USERNAME,
//     SECRET_REDIS_PASSWORD,
// );
// await redis_client.connect();

app.use(
    cookieSession({
        name: 'drumline-session',
        secret: SECRET_COOKIE_SALT
    })
);

const http_server = http.createServer(app);
const ws_server = new EchoServer({ port: 8080 });

http_server.on('upgrade', function upgrade(request, socket, head) {
    socket.on('error', onSocketError);
    ws_server.handleUpgrade(request, socket, head, function done(ws) {
        ws_server.emit('connection', ws, request);
    });
});

process.on('exit', async () => {
    ws_server.close();
    // await redis_client.disconnect();
});
