const db = require("./db.js");

const getUserResources = async (req) => {
    req.session.data.db_info = await db.fetchAccount(req.session.data.user_info.id);

    let package = await db.getPackages(req.session.data.db_info.package)[0];
    package ??= await db.getPackages('default');
    if (!package) return `noPackages`;
    const { db_info } = req.session.data;

    const extra = {
        memory: db_info.memory || 0,
        disk: db_info.disk || 0,
        cpu: db_info.cpu || 0,
        servers: db_info.servers || 0
    }

    const total = {
        memory: +package.memory + +extra.memory,
        disk: +package.disk + +extra.disk,
        cpu: +package.cpu + +extra.cpu,
        servers: +package.servers + +extra.servers
    }

    const current = {
        memory: 0,
        disk: 0,
        cpu: 0,
        servers: req.session.data.panel_info.relationships.servers.data.length
    }

    return { package, extra, total, current }
}


module.exports = getUserResources;
