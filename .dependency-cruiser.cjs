/**
 * Architectural boundary rules (TECHNOLOGY_STACK_DECISION.md §2, clarified by ADR-0001:
 * `contracts` is a pure leaf below `kernel`). All rules are `error` severity. tools/arch/arch.test.ts proves
 * that each rule actually FIRES on a violating fixture, so a green run is not vacuous.
 */
const PRODUCT = "^(packages|adapters)/";

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Cycles make layering meaningless.",
      from: {},
      to: { circular: true },
    },
    {
      name: "kernel-is-pure-internal",
      severity: "error",
      comment: "kernel may depend only on contracts (a pure schema leaf).",
      from: { path: "^packages/kernel/" },
      to: { path: "^(packages/(app|api|web|ports|profiles)|adapters|spikes|tools)/" },
    },
    {
      name: "kernel-no-node-or-vendor-libs",
      severity: "error",
      comment: "kernel imports no Node built-ins and no npm package except the schema library.",
      from: { path: "^packages/kernel/" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "kernel-only-schema-lib",
      severity: "error",
      from: { path: "^packages/kernel/" },
      to: { dependencyTypes: ["npm", "npm-dev", "npm-optional", "npm-peer", "npm-no-pkg", "npm-unknown"], pathNot: "node_modules/zod/" },
    },
    {
      name: "contracts-is-a-leaf",
      severity: "error",
      comment: "contracts imports nothing internal and only the schema library.",
      from: { path: "^packages/contracts/" },
      to: { path: "^(packages/(?!contracts/)|adapters|spikes|tools)" },
    },
    {
      name: "contracts-only-schema-lib",
      severity: "error",
      from: { path: "^packages/contracts/src/" },
      to: { dependencyTypes: ["core", "npm", "npm-dev", "npm-optional", "npm-peer", "npm-no-pkg", "npm-unknown"], pathNot: "node_modules/zod/" },
    },
    {
      name: "ports-depend-on-kernel-and-contracts-only",
      severity: "error",
      from: { path: "^packages/ports/" },
      to: { path: "^(packages/(app|api|web|profiles)|adapters|spikes|tools)/" },
    },
    {
      name: "app-depends-on-kernel-ports-contracts-only",
      severity: "error",
      from: { path: "^packages/app/" },
      to: { path: "^(packages/(api|web|profiles)|adapters|spikes|tools)/" },
    },
    {
      name: "api-uses-app-and-contracts-only",
      severity: "error",
      comment: "api never reaches kernel or adapters directly; a composition root wires adapters (Slice 1).",
      from: { path: "^packages/api/" },
      to: { path: "^(packages/(kernel|ports|web|profiles)|adapters|spikes|tools)/" },
    },
    {
      name: "web-imports-contracts-only",
      severity: "error",
      from: { path: "^packages/web/" },
      to: { path: "^(packages/(?!(web|contracts)/)|adapters|spikes|tools)" },
    },
    {
      name: "adapters-use-ports-only",
      severity: "error",
      comment: "adapters import ports/kernel types/contracts, never each other nor app/api/web.",
      from: { path: "^adapters/([^/]+)/" },
      to: { path: "^(packages/(app|api|web|profiles)|spikes|tools)/|^adapters/(?!$1/)" },
    },
    {
      name: "profiles-are-data-only",
      severity: "error",
      from: { path: "^packages/profiles/src/" },
      to: { path: "^(packages/(?!profiles/)|adapters|spikes|tools)" },
    },
    {
      name: "product-never-imports-spikes-or-tools",
      severity: "error",
      from: { path: PRODUCT },
      to: { path: "^(spikes|tools)/" },
    },
    {
      name: "product-never-imports-tests",
      severity: "error",
      // anchored to our own package dirs: an unanchored "/test/" also matches node_modules/@playwright/test/
      from: { path: PRODUCT, pathNot: "^(packages|adapters)/[^/]+/(test|e2e)/" },
      to: { path: "^(packages|adapters)/[^/]+/(test|e2e)/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    moduleSystems: ["es6", "cjs"],
    // Do NOT exclude *.d.ts or any */dist/* broadly: npm packages resolving there would silently escape the rules.
    exclude: { path: "^((packages|adapters|spikes)/[^/]+|tools)/dist/" }, // our own build output only; never node_modules/**/dist
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "node", "default", "types"],
    },
  },
};
