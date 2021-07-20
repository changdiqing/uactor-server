"use strict";

const express = require("express");
const helmet = require("helmet");
const middlewares = require("./middlewares");
const cors = require("cors");

const api = express();

//api.use(helmet());
api.use(middlewares.allowCrossDomain);
api.use(cors());

// Define the routes
const router = express.Router();
const uActorController = require("./controllers/uActorController");
const FsController = require("./controllers/FsController");

router.get("/deploy", uActorController.deploy);
router.post("/uactor", uActorController.create);
router.get("/uactors", uActorController.read);
router.delete("/remove-uactor", uActorController.remove);
router.get("/files", FsController.readDir);
router.get("/file", FsController.readFile);

api.use(router);

//Basic route
api.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

module.exports = api;
