const db = require("./db.js")

const getUserResources = async (req) => {
    req.session.data.dbinfo = await db.fetchAccount(req.session.data.userInfo.id)

    const package = await db.findPackage(req.session.data.dbinfo.package)
    if (!package) return `noPackage`;
    const { dbinfo } = req.session.data;

    const extra = {
        memory: dbinfo.memory || 0,
        disk: dbinfo.disk || 0,
        cpu: dbinfo.cpu || 0,
        servers: dbinfo.servers || 0
    }

    const total = {
        memory: package.memory + extra.memory,
        disk: package.disk + extra.disk,
        cpu: package.cpu + extra.cpu,
        servers: package.servers + extra.servers
    }

    const current = {
        memory: 0,
        disk: 0,
        cpu: 0,
        servers: req.session.data.panelInfo.relationships.servers.data.length
    }

    return {
        package,
        extra: extra,
        total: total,
        current: current
    }
}


module.exports = getUserResources
