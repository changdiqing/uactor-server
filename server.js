"use strict";

const http = require('http');

const api = require('./src/api');
const config = require('./src/config');

api.set('port', config.port)

const server = http.createServer(api);

server.listen(config.port);

server.on('listening', () => {
    console.log('API is running in port ' +config.port);
});

server.on('error', (err) => {
    console.log('Error in the server', err.message);
    process.exit(err.statusCode);
});
