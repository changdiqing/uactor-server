const net = require("net");
const { encode } = "@msgpack/msgpack";

function Node(id, ip, port) {
    this.id = id;
    this.ip = ip;
    this.port = port;
}

function peerAnnouncer(nodes) {
    let t = Math.floor(new Date() / 1000);
    nodes.forEach((node) => {
        let socket = new net.Socket();
        socket.connect(node.port, node.ip, () => {
            console.log("connected " + node);
            nodes.forEach((node) => {
                let peer_message = {};
                peer_message["publisher_node_id"] = "bootstrap_server";
                peer_message["publisher_actor_type"] = "peer_announcer";
                peer_message["publisher_instance_id"] = "1";
                peer_message["_internal_sequence_number"] = t;
                peer_message["_internal_epoch"] = t;

                peer_message["type"] = "peer_announcement";
                peer_message["peer_type"] = "tcp_server";

                peer_message["peer_ip"] = node.ip;
                peer_message["peer_port"] = node.port;
                peer_message["peer_node_id"] = node.id;

                let peer_msg = Buffer.from(encode(peer_message));
                // TODO: too many magic numbers!
                let buf = Buffer.allocUnsafe(4);
                buf.writeIntBE(peer_msg.length, 0, 4);
                let bufTotal = Buffer.concat([buf, peer_msg]);
                socket.write(buf);
                socket.write(peer_msg);
                let idx = 0;
                while (idx < peer_msg.length) {
                    let end = Math.min(idx + 10, peer_msg.length);
                    idx += 10;
                }
                //socket.write(bufTotal);
                t++;
            });
            setTimeout(() => {
                console.log(`Wait 1000 milliseconds`);
            }, 1000);
        });
        console.log("end connection");
    });
    console.log("peer anoucement finished");
    return true;
}

function sendNodeMessage(nodeIp, nodePort, nodeMsg) {
    let t = Math.floor(new Date() / 1000);
    let socket = new net.Socket();
    socket.connect(nodePort, nodeIp, () => {
        console.log("Connected " + node);
        let peer_msg = Buffer.from(encode(nodeMsg));
        // TODO: too many magic numbers!
        let buf = Buffer.allocUnsafe(4);
        buf.writeIntBE(peer_msg.length, 0, 4);
        socket.write(buf);
        socket.write(peer_msg);
        let idx = 0;
        while (idx < peer_msg.length) {
            //let end = Math.min(idx + 10, peer_msg.length);
            console.log(peer_msg.slice(idx + 10, end));
            idx += 10;
        }
        t++;
    });

    let hasError = false;

    socket.on("error", (err) => {
        console.log("received error!");
        hasError = true;
        socket.destroy();
    });

    // TODO: current logic is, if no error throw after 1 second assume it succeeded
    setTimeout(() => {
        console.log(`Wait for 1 second`);
        console.log("End connection");
        console.log(`Sending message to ${nodeIp}:${nodePort}`);
    }, 1000);

    console.log("returned!");
}

//var peers = [new Node("example_node_1", "127.0.0.1", 5555), new Node("example_node_2", "127.0.0.1", 5556)];

//peerAnnouncer(peers);

module.exports = { peerAnnouncer, sendNodeMessage };
