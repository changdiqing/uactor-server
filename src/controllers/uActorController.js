"use strict";
const { exec } = require("child_process");

const read = async (req, res) => {
    console.log("Querying uActors");
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
            console.log(elements);
            // If first element is uActorBin, it is our uActor: extract the 2nd element (pid) and 9th element (port)
            // TODO: use constructor
            if (elements[0] === "uActorBin") {
                uactors.push({ pid: elements[1], port: elements[8] });
            }
        });

        return res.status(200).json(uactors);
    });
};

module.exports = {
    read,
};
