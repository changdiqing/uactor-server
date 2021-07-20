const { FileNotFoundException, WrongTypeException } = require("./Exceptions");
const fs = require("fs");
const net = require("net");
const yaml = require("js-yaml");
const path = require("path");
const blake2 = require("blake2");
const luamin = require("luamin");
const { encode, decode } = require("@msgpack/msgpack");

var INTER_DEPLOYMENT_WAIT_TIME_MS = 5000;
var MIN_DEPLOYMENT_LIFETIME = 10000;

function CtlArguments(host, port, refresh, hashAsVersion, file, minify, publishCodeCount, uploadCodeNodeId) {
    this.host = host;
    this.port = port;
    this.refresh = refresh;
    this.hashAsVersion = hashAsVersion;
    this.file = file;
    this.minify = minify;
    this.publishCodeCount = publishCodeCount;
    this.uploadCodeNodeId = uploadCodeNodeId;
}

function uActorCtl(args) {
    let deployments = [];
    let min_ttl_ms = 0;
    let sequence_number = 0;
    let epoch = Math.floor(new Date() / 1000);

    let publish_code_count = args.publishCodeCount;

    let rawDeployments = [];

    args.file.forEach((configFilePath) => {
        if (!fs.existsSync(configFilePath)) {
            throw new FileNotFoundException("Configuration file does not exist.");
        }
        try {
            rawDeployments = yaml.loadAll(fs.readFileSync(configFilePath, "utf8"));
        } catch (err) {
            throw err;
        }

        rawDeployments.forEach((rawDeployment) => {
            let deployment;
            try {
                deployment = parseDeployment(configFilePath, rawDeployment, arguments.minify);
            } catch (err) {
                throw err;
            }
            // A successful parse could still return null?
            if (deployment) {
                if (deployment["deployment_ttl"] > 0 && deployment["deployment_ttl"] < MIN_DEPLOYMENT_LIFETIME) {
                    console.log(
                        `Increased deployment ttl to the minimum value of ${MIN_DEPLOYMENT_LIFETIME / 1000} seconds`
                    );
                    deployment["deployment_ttl"] = MIN_DEPLOYMENT_LIFETIME;
                }
                if (
                    min_ttl_ms == 0 ||
                    (deployment["deployment_ttl"] > 0 && deployment["deployment_ttl"] < min_ttl_ms)
                ) {
                    min_ttl_ms = deployment["deployment_ttl"];
                }
                if (args.hashAsVersion) {
                    deployment["deployment_actor_version"] = deployment["deployment_actor_code_hash"];
                }
                delete deployment["deployment_actor_code_hash"];
                deployments.push(deployment);
            }
        });
    });

    let totalRequiredTime = (INTER_DEPLOYMENT_WAIT_TIME_MS / 1000) * deployments.length;
    let lastIterations = {};

    let socket = new net.Socket();
    socket.connect(args.port, args.host, () => {
        let before = new Date();
        deployments.forEach((deployment) => {
            lastIterations[deployment["deployment_name"]] = new Date(); // miliseconds
            // TODO: test this block
            if (args.uploadCodeNodeId) {
                console.log("Upload Code");
                publish(socket, codeMsg(deployment, args.uploadCodeId), epoch, sequence_number);
                sequence_number++;
            }

            if (publish_code_count == 0 && "deployment_actor_code" in deployment) {
                delete deployment["deployment_actor_code"];
            }

            let startPublish = new Date();
            publish(socket, deployment, epoch, sequence_number);
            console.log(`Publish: ${deployment["deployment_name"]} ${new Date() - startPublish}`);
            setTimeout(() => {
                console.log(`Wait ${INTER_DEPLOYMENT_WAIT_TIME_MS} milliseconds`);
            }, INTER_DEPLOYMENT_WAIT_TIME_MS);
            sequence_number++;
        });

        if (publish_code_count > 0) {
            publish_code_count--;
        }

        let waitTime = Math.max(min_ttl_ms - (new Date() - before) - 10, 0);
        if (args.refresh) {
            setTimeout(() => {
                console.log(`Wait ${waitTime} milliseconds`);
            }, waitTime);
        }

        // TODO: is this an infinite loop!?
        while (min_ttl_ms > 0 && args.refresh) {
            before = new Date();
            deployments.forEach((deployment) => {
                if (publish_code_count == 0 && "deployment_actor_code" in deployment) {
                    delete deployment["deployment_actor_code"];
                }
                publish(socket, deployment, epoch, sequence_number);
                console.log(
                    `Refresh: ${deployment["deployment_name"]} Interval: ${
                        new Date() - lastIterations[deployment["deployment_name"]]
                    }`
                );
                lastIterations[deployment["deployment_name"]] = new Date();
                setTimeout(() => {
                    console.log(`Wait ${INTER_DEPLOYMENT_WAIT_TIME_MS} milliseconds`);
                }, INTER_DEPLOYMENT_WAIT_TIME_MS);
                sequence_number++;
            });
            if (publish_code_count > 0) {
                publish_code_count--;
            }
            setTimeout(() => {
                console.log(`Wait ${waitTime} milliseconds`);
            }, waitTime);
        }

        setTimeout(() => {
            console.log(`Wait ${waitTime} milliseconds`);
        }, 2000);
    });

    socket.on("data", (data) => {
        socket.destroy();
    });
}

function parseDeployment(configFilePath, rawDeployment, minify) {
    if (!("type" in rawDeployment) || !(rawDeployment["type"] == "deployment")) {
        return null;
    }

    let requiredKeys = ["name", "actor_type", "actor_version", "actor_runtime_type", "actor_code_file", "ttl"];
    if (Object.keys(rawDeployment).includes(requiredKeys)) {
        return null;
    }

    let requiredActors = "";
    if ("required_actors" in rawDeployment) {
        if (Array.isArray(rawDeployment["required_actors"])) {
            requiredActors = rawDeployment["required_actors"].join(",");
        } else {
            throw new WrongTypeException("Required actors is not a list.");
        }
    }

    let configDir = path.dirname(configFilePath);
    let codeFile = path.join(configDir, rawDeployment["actor_code_file"]);

    let code = loadCodeFile(codeFile);
    let minifiedCode;

    if (minify) {
        minifiedCode = luamin.minify(code);
    }
    let h = blake2.createHash("blake2s");
    h.update(Buffer.from(code));
    let codeHash = h.digest();

    console.log(
        `Code Size: ${rawDeployment["name"]} Before: ${code.length} After: ${
            minify ? minifiedCode.length : "not minified"
        }`
    );

    let deployment = {
        type: "deployment",
        publisher_node_id: "actorctl_tmp_node_2",
        publisher_actor_type: "core.tools.actor_ctl",
        publisher_instance_id: "1",
        deployment_name: rawDeployment["name"],
        deployment_actor_type: rawDeployment["actor_type"],
        deployment_actor_runtime_type: rawDeployment["actor_runtime_type"],
        deployment_actor_version: rawDeployment["actor_version"],
        deployment_actor_code: minify ? minified_code : code,
        deployment_actor_code_hash: codeHash,
        deployment_required_actors: requiredActors,
        deployment_ttl: rawDeployment["ttl"],
    };

    let deploymentConstraints = [];

    if ("constraints" in rawDeployment) {
        rawDeployment["constraints"].forEach((constraint) => {
            Object.keys(constraint).forEach((key) => {
                deploymentConstraints.push(key);
                deployment[key] = constraint[key];
            });
        });
    }

    if (deploymentConstraints.length > 0) {
        deployment["deployment_constraints"] = deploymentConstraints.join(",");
    }

    return deployment;
}

function loadCodeFile(codeFile) {
    if (!fs.lstatSync(codeFile).isFile()) {
        throw new FileNotFoundException("Code file does not exist.");
    }
    let codePre;
    try {
        codePre = fs.readFileSync(codeFile, "utf8");
    } catch (err) {
        throw err;
    }

    let code = "";
    // handle the loaded code file line by line
    codePre.split(/\r?\n/).forEach((line) => {
        let match = line.match("^--includes+<([w./]+)>g");
        if (match) {
            code += loadCodeFile(path.join(path.dirname(codeFile), match[0] + ".lua")) + "\n";
        } else {
            code += line + "\n";
        }
    });

    return code;
}

// Constructs an object similar to, and based on deployment, TODO: why?
function codeMsg(deployment, nodeId) {
    return {
        actor_type: "code_store",
        instance_id: "1",
        node_id: nodeId,
        type: "actor_code",
        actor_code_type: deployment["deployment_actor_code"],
        actor_code_runtime_type: "lua",
        actor_code_version: deployment["deployment_actor_version"],
        actor_code_lifetime_end: 0,
        actor_code: deployment["deploymnt_actor_code"],
    };
}

function publish(socket, publication, epoch, sequenceNumber) {
    publication["_internal_sequence_number"] = sequenceNumber;
    publication["_internal_epoch"] = epoch;
    const msg = Buffer.from(encode(publication));
    // TODO: too many magic numbers!
    let buf = Buffer.allocUnsafe(4);
    buf.writeIntBE(msg.length, 0, 4);
    let bufTotal = Buffer.concat([buf, msg]);
    socket.write(bufTotal);
}

var testArguments = new CtlArguments(
    "127.0.0.1",
    "5555",
    false,
    null,
    ["/Users/diqingchang/uActor/examples/tutorial_ping_pong/two_node_deployment.yml"],
    null,
    null,
    null
);

//uActorCtl(testArguments);

//export default uActorCtl;
module.exports = uActorCtl;
