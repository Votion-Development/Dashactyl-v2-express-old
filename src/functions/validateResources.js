const { validateNumber } = require("../util/index");
const validateResources = async (resources, req) => {
  const validCPU = validateNumber(Number(req.body.cpu));
  const validMemory = validateNumber(Number(req.body.memory));
  const validDisk = validateNumber(Number(req.body.disk));
  const validServers = validateNumber(Number(req.body.servers));
  if (validCPU) {
    resources.cpu = Number(req.body.cpu);
  }
  if (validMemory) {
    resources.memory = Number(req.body.memory);
  }
  if (validDisk) {
    resources.disk = Number(req.body.disk);
  }
  if (validServers) {
    resources.servers = Number(req.body.servers);
  }
  return resources;
};

module.exports = validateResources;
