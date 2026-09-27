import process from 'node:process';

import cors, { CorsOptions } from 'cors';
import express from 'express';
import http from 'http';
import { RedisClientType, createClient } from 'redis';
import { PuzzleCrudder } from './express';
import { PuzzleRedisClient } from './redis';
import { CORS_ALLOW_URL, PORT, SECRET_REDIS_URL } from './secrets';
import { EchoServer } from './websockets';

// don't log the full url: it may contain credentials
console.log(`using redis host: `, new URL(SECRET_REDIS_URL).host);
const client: RedisClientType = createClient({
    url: SECRET_REDIS_URL,
    socket: {
        connectTimeout: 50000
    }
});

const redis_client = new PuzzleRedisClient(client);
await redis_client.connect();

const cors_options: CorsOptions = {
    origin: [CORS_ALLOW_URL, 'http://localhost:5173', 'http://localhost:4173']
};

const app = express();
app.use(cors(cors_options));
const puzzle_crudder = new PuzzleCrudder(app, redis_client);

const http_server = http.createServer(app);
const ws_server = new EchoServer(client);

http_server.on('upgrade', function upgrade(request, socket, head) {
    ws_server.handleUpgrade(request, socket, head, function done(ws) {
        ws_server.emit('connection', ws, request);
    });
});

http_server.listen(PORT, function () {
    console.log('Listening on http://localhost:%d', PORT);
});

// 'exit' handlers can't do async work, so shut down on the signals
// the deployer sends instead.
const shutdown = async (signal: string) => {
    console.log(`received ${signal}, exiting...`);
    ws_server.close();
    http_server.close();
    console.log('disconnecting from redis...');
    await redis_client.disconnect();
    process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

// this will cause our health check endpoint to return 200,
// indicating that we're ready to serve requests from this
// deployment.  The deployer will then shut down any other
// deployments that are still running.
puzzle_crudder.load_completed = true;
