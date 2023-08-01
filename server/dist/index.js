'use strict';
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, '__esModule', { value: true });
const node_process_1 = __importDefault(require('node:process'));
const websockets_1 = require('./websockets/');
const server = new websockets_1.EchoServer({ port: 8080 });
node_process_1.default.on('exit', function exit() {
    server.close();
});
//# sourceMappingURL=index.js.map
