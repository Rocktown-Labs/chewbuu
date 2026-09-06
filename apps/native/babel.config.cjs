const {
  stripNodeFsDynamicImport,
} = require("../../scripts/babel-strip-node-fs-dynamic-import.cjs");

module.exports = function babelConfig(api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [stripNodeFsDynamicImport],
  };
};
