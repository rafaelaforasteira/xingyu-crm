module.exports = {
  root: true,
  extends: ["@xingyu/eslint-config"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ["dist", "node_modules", "coverage"],
};
