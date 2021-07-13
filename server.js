"use strict";

const api = require("./src/api.js");
const config = require("./src/config.js");
const http = require("http");
const server = http.createServer(api);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origins: ["*"],
        handlePreflightRequest: (req, res) => {
            res.writeHead(200, {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE",
                "Access-Control-Allow-Headers": "*",
            });
            res.end();
        },
    },
});

api.set("port", config.port);

io.on("connection", (socket) => {
    console.log("A user connected");
    socket.on("disconnect", () => {
        console.log("user disconnected");
    });
    socket.on("tail", (msg) => {
        io.to(socket.id).emit("tail", msg);
    });
});

server.listen(config.port, () => {
    console.log("listening on *:" + config.port);
});

server.on("error", (err) => {
    console.log("Error in the server", err.message);
    process.exit(err.statusCode);
});
