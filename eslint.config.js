import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/dist-ts/**", "node_modules/**", "CLAUDE_INPUT/**", "docs/**", "tools/arch/fixtures/**", "**/out/**", "spikes/s4-render/public/**"] },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      eqeqeq: "error",
    },
  },
  {
    // Spikes and tooling are throwaway/dynamic (JSON, driver shims); strict typing is enforced where it matters (product packages).
    files: ["spikes/**/*.ts", "tools/**/*.ts", "**/test/**/*.ts", "**/e2e/**/*.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  {
    // Kernel determinism: time and randomness come from ports (Clock, Ids), never ambient globals.
    files: ["packages/kernel/**/*.ts"],
    rules: {
      "no-restricted-globals": ["error", "process", "Buffer", "window", "document", "localStorage", "fetch", "setTimeout", "setInterval", "console"],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Use the Clock port." },
        { object: "Math", property: "random", message: "Use the Ids/Random port." },
        { object: "crypto", property: "randomUUID", message: "Use the Ids port." },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: "Use the Clock port." },
      ],
    },
  },
);
