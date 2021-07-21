"use strict";
const { exec } = require("child_process");
const spawn = require("child_process").spawn;
const constants = require("../constants.js");
const UActor = require("../models/UActor");
const { uActorCtl } = require("../services/UActorCtl");
const net = require("net");
const { encode } = require("@msgpack/msgpack");

const ps = require("ps-node");

const create = async (req, res) => {
    let actor = JSON.parse(req.query.uactor);
    if (!req.query.uactor) return res.status(400).json("Request must have the parameter uactor in the query!");
    let child = exec(`${constants.uActorBin}`); // TODO: Return success immediately?
    actor.pid = child.pid;
    return res.status(200).json(actor);
};

const read = async (req, res) => {
    exec("lsof -i -P | grep LISTEN", (err, stdout, stderr) => {
        if (err || stderr) {
            // node couldn't execute the command or something is wrong with the shell command
            let errMsg = err ? err : stderr;
            return res.status(500).json({ errMsg });
        }

        // the *entire* stdout and stderr (buffered)
        let uactors = [];
        let lines = stdout.split("\n");

        // parse the stdout line by line
        lines.forEach((line) => {
            let elements = line.trim().split(/\s+/);
            // If first element is uActorBin, it is our uActor: extract the 2nd element (pid) and 9th element (port)
            // TODO: use constructor
            if (elements[0] === "uActorBin") {
                uactors.push(UActor("Unknown Node", elements[1], elements[8], elements[8]));
                //uactors.push({ pid: elements[1], port: elements[8] });
            }
        });

        return res.status(200).json(uactors);
    });
};

const remove = async (req, res) => {
    // TODO: check if the process with the dedicated pid is a process created with uActorBin
    let pid = Number(req.query.pid);
    if (!pid) return res.status(400).json("Request must have the parameter pid in the query!");
    ps.kill(Number(pid), (err) => {
        if (err) {
            console.log(err);
        } else {
            console.log(`Process with pid ${pid} has been killed!`);
            return res.status(200).json(pid);
        }
    });
};

const deploy = async (req, res) => {
    let ctlArgument = JSON.parse(req.query.ctlArgument);
    if (!ctlArgument) return res.status(400).json("Request must have the parameter ctlArgument in the query!");
    try {
        uActorCtl(ctlArgument);
    } catch (err) {
        console.error(err);
        res.status(400).json(err);
    }
    res.status(200).json(ctlArgument);
};

const sendMessage = async (req, res) => {
    let ip = req.query.ip;
    let port = req.query.port;
    let msg = JSON.parse(req.query.message);
    console.log(ip);
    console.log(port);
    console.log(msg);
    if (!ip || !port || !msg)
        return res.status(400).json("Request must have the parameter ip, port and message in the query!");

    // TODO: code snipet for sending message, move to a separate function!
    let t = Math.floor(new Date() / 1000);
    let socket = new net.Socket();
    socket.connect(port, ip, () => {
        console.log("Connected " + ip + ":" + port);
        let peer_msg = Buffer.from(encode(msg));
        // TODO: too many magic numbers!
        let buf = Buffer.allocUnsafe(4);
        buf.writeIntBE(peer_msg.length, 0, 4);
        socket.write(buf);
        socket.write(peer_msg);
        let idx = 0;
        while (idx < peer_msg.length) {
            let end = Math.min(idx + 10, peer_msg.length);
            console.log(peer_msg.slice(idx + 10, end));
            idx += 10;
        }
    });

    socket.on("data", (data) => {
        console.log("received data:");
        console.log(data);

        socket.destroy();
        res.status(200).json(data.toString("utf8"));
    });

    socket.on("error", (err) => {
        console.log("received error!");
        let errMsg = err.code;
        socket.destroy();
        res.status(400).json(errMsg);
    });
};

module.exports = {
    create,
    read,
    remove,
    deploy,
    sendMessage,
};
