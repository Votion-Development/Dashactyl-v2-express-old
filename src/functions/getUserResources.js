const db = require("./db.js")

const getUserResources = async (req) => {
    const packages = await db.getPackages()

    return packages;
}


module.exports = getUserResources