/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["next/core-web-vitals", "@xingyu/eslint-config"],
  ignorePatterns: [".next", "node_modules", "coverage", "e2e"],
};
