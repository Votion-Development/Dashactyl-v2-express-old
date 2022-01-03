const db = require("./db.js")

const getUserResources = async (req) => {
    req.session.data.dbInfo = await db.fetchAccount(req.session.data.userInfo.id);
    if (!req.session.data.dbInfo.package) {
        req.session.data.dbInfo.package = await db.getDefaultPackage()

        await req.session.save()
    }

    const { package } = req.session.data.dbInfo;
    const defaultPackage = await db.findPackage(package);
    if (package != defaultPackage?.name) return `noPackage`;
    const { dbInfo } = req.session.data;

    const extra = {
        memory: dbInfo.memory || 0,
        disk: dbInfo.disk || 0,
        cpu: dbInfo.cpu || 0,
        servers: dbInfo.servers || 0
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
        servers: req.session.data.panelInfo.relationships.servers.data.length
    }

    for (const server of user_servers) {
        current.memory += server.attributes.limits.memory
        current.disk += server.attributes.limits.disk
        current.cpu += server.attributes.limits.cpu
    }

    return {
        package,
        extra: extra,
        total: total,
        current: current
    }
}


module.exports = getUserResources
