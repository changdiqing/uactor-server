function UActor(name, pid, ip, port) {
    return {
        name: name,
        pid: pid,
        ip: ip,
        port,
    };
}

module.exports = UActor;
