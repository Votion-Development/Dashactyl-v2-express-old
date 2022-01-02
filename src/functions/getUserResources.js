const db = require("./db.js")

const getUserResources = async (req) => {
    let package = req.session.data.dbInfo.package || await db.getDefaultPackage()

    req.session.data.dbinfo = await db.fetchAccount(req.session.data.userInfo.id)

    const usersPackage = await db.findPackage(req.session.data.dbinfo.package)

    if (!usersPackage) return `noPackage`;

    const extra = {
        memory: req.session.data.dbinfo.memory || 0,
        disk: req.session.data.dbinfo.disk || 0,
        cpu: req.session.data.dbinfo.cpu || 0,
        servers: req.session.data.dbinfo.servers || 0
    }

    const total = {
        memory: packageinfo.memory + extra.memory,
        disk: packageinfo.disk + extra.disk,
        cpu: packageinfo.cpu + extra.cpu,
        servers: packageinfo.servers + extra.servers
    }

    const current = {
        memory: 0,
        disk: 0,
        cpu: 0,
        servers: user_servers.length
    }

    return {
        packageInfo: usersPackage,
        extra: extra,
        total: total,
        current: current
    }
}


module.exports = getUserResources