"use strict";
// TODO: change fs to fs/promises
const fs = require("fs");
const path = require("path");
const { supportedFileExts } = require("../constants.js");

const readDir = async (req, res) => {
    // TODO: params handled differently for get and post!
    if (!req.query.dir) return res.status(400).json("Request must have the parameter dir in the query!");

    let __dirname = req.query.dir;

    const walk = (dirname, depth) => {
        let fileIdx = 0;
        let result = [];
        try {
            let files = fs.readdirSync(dirname, { withFileTypes: true });
            files.forEach((file) => {
                let fileKey = depth + "-" + fileIdx;
                let fullPath = path.resolve(dirname, file.name);
                let newObject = { title: file.name, key: fileKey, isLeaf: true, path: fullPath };
                if (file.isDirectory()) {
                    newObject.children = walk(fullPath, fileKey);
                    newObject.isLeaf = false;
                }
                result.push(newObject);
                fileIdx++;
            });
        } catch (err) {
            console.error(err);
            return [];
        }
        return result;
    };
    return res.status(200).json(walk(__dirname, ""));
};

const readFile = async (req, res) => {
    if (!req.query.dir) return res.status(400).json("Request must have the parameter dir in the query!");

    let __dirname = req.query.dir;
    if (!supportedFileExts.includes(path.extname(__dirname))) {
        return res.status(400).json("Sorry, any file type other than .yaml is not supported! yet....");
    } else {
        fs.promises
            .readFile(__dirname, { encoding: "utf8" })
            .then((contents) => {
                console.log("loaded contents");
                console.log(contents);
                return res.status(200).json(contents);
            })
            .catch((err) => {
                console.log(err);
                return res.status(400).json(err);
            });
    }
};

module.exports = {
    readDir,
    readFile,
};
