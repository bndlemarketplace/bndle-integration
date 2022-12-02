const constVer = require('./constant');

const allRoles = {
  user: [],
  admin: constVer.config.roles.adminRoles,
  vendor: constVer.config.roles.vendor,
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
