const transform = require('jstransform').transform;
const jsxVisitorList = require('jstransform/visitors/react-jsx-visitors').visitorList;

const options = {
  ignoreDocblock: true,
  docblockUnknownTags: true
};

module.exports = (code) => transform(jsxVisitorList, code, options).code;
