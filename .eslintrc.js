module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint/eslint-plugin"],
  extends: [
    "plugin:@typescript-eslint/recommended"
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [".eslintrc.js"],
  rules: {
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
		// Indentation is broken for decorators.
		// Tab usage for properties has to be manually enforced.
		// https://github.com/eslint/eslint/issues/15299
		"indent": [
			"error",
			"tab",
			{
				"ignoredNodes": ["PropertyDefinition"],
			}
		],
		"quotes": [
			"error",
			"double"
		],
		"object-curly-spacing": [
			"error",
			"always"
		],
		"max-len": [
			"error",
			{
				code: 120,
				ignoreComments: true
			}
		],
		"@typescript-eslint/no-unused-vars": [
			"error",
			{
				"ignoreRestSiblings": true,
				"argsIgnorePattern": "^_"
			}
		],
		"@typescript-eslint/space-infix-ops": 2,
		"semi": 2,
		"@typescript-eslint/no-floating-promises": 2,
		"no-console": 2
  },
};
