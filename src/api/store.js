const { Router } = require("express");
const db = require("../functions/db");

const router = Router();

router.post("/buy_resources", async (req, res) => {
  const body = req.body;
  console.log(body);
});

module.exports = router;
