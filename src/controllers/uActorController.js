"use strict";
const { exec } = require("child_process");
const spawn = require("child_process").spawn;
const constants = require("../constants.js");
const UActor = require("../models/UActor");

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
                uactors.push(UActor("Unknown Actor", elements[1], elements[8], elements[8]));
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
    /*
    exec(`kill ${pid}`, (err, stdout, stderr) => {
        if (err || stderr) {
            // node couldn't execute the command or something is wrong with the shell command
            let errMsg = err ? err : stderr;
            console.log(errMsg);
            return res.status(500).json({ errMsg });
        }
        return res.status(200).json(pid);
    });
    */
    ps.kill(Number(pid), (err) => {
        if (err) {
            console.log(err);
        } else {
            console.log(`Process with pid ${pid} has been killed!`);
            return res.status(200).json(pid);
        }
    });
};

module.exports = {
    create,
    read,
    remove,
};
