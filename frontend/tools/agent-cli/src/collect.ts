import fs from "node:fs";
import path from "node:path";

type VitestJson = {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests?: number;
  startTime?: number;
  testResults?: any[];
};

type CoverageSummary = {
  total?: {
    lines?: { pct: number };
    statements?: { pct: number };
  }
};

export function readVitestJson(file: string): VitestJson {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function readCoverageSummary(file: string): CoverageSummary {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function buildArtifacts({
  vitestJsonPath,
  coverageSummaryPath,
  failLogPath,
  setupSnippetsPath
}: {
  vitestJsonPath: string;
  coverageSummaryPath: string;
  failLogPath?: string;
  setupSnippetsPath?: string;
}) {
  const v = readVitestJson(vitestJsonPath);
  const c = readCoverageSummary(coverageSummaryPath);
  const failLog = failLogPath && fs.existsSync(failLogPath) ? fs.readFileSync(failLogPath, "utf8") : "";
  const setupSnippets = setupSnippetsPath && fs.existsSync(setupSnippetsPath) ? fs.readFileSync(setupSnippetsPath, "utf8") : "";

  return {
    vitest: v,
    coverage: c,
    failLog,
    setupSnippets
  };
}

export function buildUserBlock(art: ReturnType<typeof buildArtifacts>): string {
  const vitestBlock = `<VITEST_JSON>\n${JSON.stringify(art.vitest, null, 2)}\n</VITEST_JSON>`;
  const covBlock = `<COVERAGE_SUMMARY_JSON>\n${JSON.stringify(art.coverage, null, 2)}\n</COVERAGE_SUMMARY_JSON>`;
  const failBlock = `<FAIL_LOG>\n${art.failLog || ""}\n</FAIL_LOG>`;
  const setupBlock = `<SETUP_SNIPPETS>\n${art.setupSnippets || ""}\n</SETUP_SNIPPETS>`;
  return [
    "# Aufgabe",
    "Bewerte Testabdeckung und Setup-Korrektheit (Pinia-Provider, vi.mock-Hoisting, globale Plugins).",
    "",
    "# Artefakte",
    vitestBlock,
    "",
    covBlock,
    "",
    failBlock,
    "",
    setupBlock,
    "",
    "# Erwartungen",
    "Identifiziere Hoisting-Probleme, prüfe globale Provider & Mount-Utility, liefere minimale Patches."
  ].join("\n");
}

export function buildSystemBlock(): string {
  return [
    "Du bist Senior-DX-/QA-Reviewer für Vue 3 + Pinia + Vitest.",
    "Antworte ausschließlich im JSON-Schema aus agent-spec.md.",
    "Erfinde nichts; nutze nur gelieferte Artefakte."
  ].join("\n");
}
