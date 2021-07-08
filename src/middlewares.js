"use strict";

const allowCrossDomain = (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "*");

    // intercept OPTIONS method
    if (req.method == "OPTIONS") {
        res.status(200).sendStatus(200);
    } else {
        next();
    }
};

module.exports = {
    allowCrossDomain,
};
