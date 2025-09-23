import { z } from "zod";

export const OutputSchema = z.object({
  summary: z.string().max(1000),
  scores: z.object({
    pass_rate_pct: z.number().min(0).max(100),
    coverage_statements_pct: z.number().min(0).max(100),
    coverage_lines_pct: z.number().min(0).max(100),
    setup_correctness_pct: z.number().min(0).max(100),
    determinism_pct: z.number().min(0).max(100),
    overall_pct: z.number().min(0).max(100)
  }),
  verdict: z.enum(["pass","soft-fail","fail","blocked"]),
  missing_artifacts: z.array(z.string()),
  findings: z.array(z.object({
    id: z.string(),
    category: z.enum(["pinia-setup","vi.mock-hoisting","global-providers","coverage","determinism","other"]),
    severity: z.enum(["high","medium","low"]),
    evidence: z.string(),
    impact: z.string(),
    fix: z.object({
      type: z.enum(["minimal-patch","refactor","config"]),
      patch: z.string(),
      notes: z.string().optional()
    })
  })),
  actions: z.array(z.object({
    priority: z.number().int().positive(),
    title: z.string(),
    eta_minutes: z.number().int().positive(),
    depends_on: z.array(z.string()),
    details: z.string()
  })),
  metrics: z.object({
    total_tests: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative()
  }),
  context: z.object({
    tooling: z.string(),
    assumptions: z.array(z.string()),
    notes: z.string().optional()
  })
});

export type AgentOutput = z.infer<typeof OutputSchema>;
