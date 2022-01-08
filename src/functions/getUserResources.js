const db = require("./db.js");

const getUserResources = async (req) => {
    req.session.data.db_info = await db.fetchAccount(req.session.data.user_info.id);

    const package = await db.getPackages(req.session.data.db_info.package)
    if (!package) return `noPackage`;
    const { db_info } = req.session.data;

    const extra = {
        memory: db_info.memory || 0,
        disk: db_info.disk || 0,
        cpu: db_info.cpu || 0,
        servers: db_info.servers || 0
    }

    const total = {
        memory: defaultPackage.memory + extra.memory,
        disk: defaultPackage.disk + extra.disk,
        cpu: defaultPackage.cpu + extra.cpu,
        servers: defaultPackage.servers + extra.servers
    }

    const user_servers = req.session.data.panelInfo.relationships.servers.data

    const current = {
        memory: 0,
        disk: 0,
        cpu: 0,
        servers: req.session.data.panel_info.relationships.servers.data
    }

    return { package, extra, total, current }
}


module.exports = getUserResources;
