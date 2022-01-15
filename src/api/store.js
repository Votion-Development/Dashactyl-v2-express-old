const { Router } = require("express");
const db = require("../functions/db");
const validateResources = require("../functions/validateResources");
const router = Router();
const util = require("../util/index");
router.post("/buy_resources", async (req, res) => {
  const user_data = await db.fetchAccount(req.session.data?.user_info.id);
  if (!user_data) return res.render("/store");
  let resourcesObj = {
    cpu: 0,
    memory: 0,
    disk: 0,
    servers: 0,
  };
  let cost = 0;
  let zero = 0;
  let enabled = 0;
  let added = {
    cpu: 0,
    memory: 0,
    disk: 0,
    servers: 0,
  };

  const errors = [];
  const settings = util.loadSettings();
  const resources = validateResources(resourcesObj, req);

  for (const [resource, amount] of Object.entries(resourcesObj)) {
    if (settings.store[resource].enabled) {
      enabled++;
      if (amount < 0) {
        errors.push("shesh");
        zero++;
      } else if (amount === 0) {
        zero++;
      } else if (amount + user_data[resource] > 1073741823) {
        //javascript limitations
        errors.push("You have too much of that resource");
      } else {
        const multiple = amount / settings.store[resource].per;
        if (multiple !== Math.round(multiple)) {
          errors.push("Number can't be multiplied");
        }
        added[resource] = user_data[resource] + amount;
        cost += settings.store[resource].cost * multiple;
      }
    }
  }
  if (zero && zero === enabled) {
    errors.push("zero");
    return res.redirect("/store");
  }
  if (errors.length !== 0) {
    errors.push("zero");
    return res.redirect("/store");
  }
  if (cost > user_data.coins) {
    errors.push("espensive");
    return res.redirect("/store");
  }
  await db.setCoins(user_data.discordID, user_data.coins - cost);
  await db.setResources(user_data.discordID, added);
  await res.redirect("/store");
});

module.exports = router;
