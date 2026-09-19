import { scenarioCollapsed, scenarioGraph } from "./cy.ts";
import { scenarioGrid } from "./grid.ts";

/** Playwright calls window.scenarios[name](); each scenario runs in a fresh page load. */
const scenarios = {
  graph500: () => scenarioGraph(500, 8, { interact: true }),
  graph5000: () => scenarioGraph(5000, 20, { interact: false }),
  collapsed5000: () => scenarioCollapsed(),
  grid500: () => scenarioGrid(500, 20_000),
  grid5000: () => scenarioGrid(5000, 200_000),
};
(window as unknown as { scenarios: typeof scenarios }).scenarios = scenarios;
