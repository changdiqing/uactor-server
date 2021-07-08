"use strict";

const express = require("express");
const helmet = require("helmet");
const middlewares = require("./middlewares");

const api = express();

api.use(helmet());
api.use(middlewares.allowCrossDomain);

// Define the routes
const router = express.Router();
const uActorController = require("./controllers/uActorController");

router.get("/uactors", uActorController.read);

api.use(router);

//Basic route
api.get("/", (req, res) => {
    res.json({
        name: "uActor GUI server",
    });
});

module.exports = api;
