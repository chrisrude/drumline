import express from 'express';
import http from 'http';

export { app, server };

const app = express();

const server = http.createServer(app);

app.get('/barf', function (req, res) {
    console.log(`ehrmygherd`);
    res.send({ result: 'OK', message: 'clean your shoes' });
});

server.listen(8080, function () {
    console.log('Listening on http://localhost:8080');
});