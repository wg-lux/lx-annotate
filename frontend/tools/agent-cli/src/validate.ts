import fs from "node:fs";

// Simplified validation without zod for now
export function validateOutput(file: string) {
  const raw = fs.readFileSync(file, "utf8");
  let data: any;
  try { 
    data = JSON.parse(raw); 
  } catch (e) {
    throw new Error("Agent output ist kein gültiges JSON.");
  }

  // Basic structure validation
  const required = ["summary", "scores", "verdict", "missing_artifacts", "findings", "actions", "metrics", "context"];
  for (const key of required) {
    if (!(key in data)) {
      throw new Error(`Missing required key: ${key}`);
    }
  }

  // Verdict validation
  const validVerdicts = ["pass", "soft-fail", "fail", "blocked"];
  if (!validVerdicts.includes(data.verdict)) {
    throw new Error(`Invalid verdict: ${data.verdict}. Must be one of: ${validVerdicts.join(", ")}`);
  }

  // Scores validation
  const scoreKeys = ["pass_rate_pct", "coverage_statements_pct", "coverage_lines_pct", "setup_correctness_pct", "determinism_pct", "overall_pct"];
  for (const key of scoreKeys) {
    const score = data.scores?.[key];
    if (typeof score !== "number" || score < 0 || score > 100) {
      throw new Error(`Invalid score ${key}: ${score}. Must be number between 0-100.`);
    }
  }

  console.log("✓ Schema ok. Summary:", data.summary);
  console.log("Scores:", data.scores);
  console.log("Verdict:", data.verdict);
  
  return data;
}
