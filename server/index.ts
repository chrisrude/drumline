import process from 'node:process';

import cors from 'cors';
import express from 'express';
import http from 'http';
import { PuzzleCrudder } from './express';
import { EchoServer } from './websockets';

// todo: connect to redis
// const redis_client = new PuzzleRedisClient(
//     SECRET_REDIS_URL,
//     SECRET_REDIS_USERNAME,
//     SECRET_REDIS_PASSWORD,
// );
// await redis_client.connect();

const app = express();
app.use(cors());

const puzzle_crudder = new PuzzleCrudder(app);
const http_server = http.createServer(app);
const ws_server = new EchoServer();

process.on('exit', async () => {
    ws_server.close();
    http_server.close();
    // await redis_client.disconnect();
    console.log(puzzle_crudder._map_puzzle_id_to_puzzle.size);
});

http_server.listen(8080, function () {
    console.log('Listening on http://localhost:8080');
});
