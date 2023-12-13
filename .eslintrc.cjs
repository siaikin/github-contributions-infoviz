/* eslint-env node */

module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:vue/vue3-essential",
    "plugin:vue/vue3-strongly-recommended",
    "plugin:vue/vue3-recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  plugins: ["@typescript-eslint"],
  /**
   * eslint 默认行为是忽略以 `.` 开头的文件 / 文件夹. 但是我们需要对 `.vitepress` 目录下的文件进行检查.
   * @see https://stackoverflow.com/questions/57947585/eslint-warning-file-ignored-by-default-use-a-negated-ignore-pattern
   */
  ignorePatterns: ["!.vitepress"],
  /**
   * https://eslint.vuejs.org/user-guide/#how-to-use-a-custom-parser
   */
  parser: "vue-eslint-parser",
  parserOptions: {
    parser: "@typescript-eslint/parser",
    ecmaVersion: "latest"
  }
};
