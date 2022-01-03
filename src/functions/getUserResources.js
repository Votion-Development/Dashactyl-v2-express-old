const db = require("./db.js")

const getUserResources = async (req) => {
    if (!req.session.data.dbInfo.package) {
        req.session.data.dbInfo.package === await db.getDefaultPackage()

        await req.session.save()
    }

    let package = req.session.data.dbInfo.package || await db.getDefaultPackage()

    req.session.data.dbInfo = await db.fetchAccount(req.session.data.userInfo.id)

    const usersPackage = await db.findPackage(package)

    if (usersPackage.name != package) return `noPackage`;

    const extra = {
        memory: req.session.data.dbInfo.memory || 0,
        disk: req.session.data.dbInfo.disk || 0,
        cpu: req.session.data.dbInfo.cpu || 0,
        servers: req.session.data.dbInfo.servers || 0
    }

    const total = {
        memory: +usersPackage.memory + +extra.memory,
        disk: +usersPackage.disk + +extra.disk,
        cpu: +usersPackage.cpu + +extra.cpu,
        servers: +usersPackage.servers + +extra.servers
    }

    const user_servers = req.session.data.panelInfo.relationships.servers.data

    const current = {
        memory: 0,
        disk: 0,
        cpu: 0,
        servers: user_servers.length
    }

    for (const server of user_servers) {
        current.memory += server.attributes.limits.memory
        current.disk += server.attributes.limits.disk
        current.cpu += server.attributes.limits.cpu
    }

    return {
        packageInfo: usersPackage,
        extra: extra,
        total: total,
        current: current
    }
}


module.exports = getUserResources