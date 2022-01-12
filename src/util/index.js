const yaml = require("js-yaml");
const { readFileSync } = require("fs");

function loadSettings() {
  return yaml.load(readFileSync("./src/settings.yml", "utf-8"));
}

function loadPages(theme) {
  return yaml.load(readFileSync(`./src/themes/${theme}/pages.yml`, "utf-8"));
}
function validateNumber(num) {
  if (typeof num !== "number" || num === 0 || !num) return false;
  else return num;
}

module.exports = {
  loadSettings,
  loadPages,
  validateNumber,
};
