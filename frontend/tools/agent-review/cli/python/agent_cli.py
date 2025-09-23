#!/usr/bin/env python3
import json, argparse, sys, pathlib, re

SCHEMA = {
  "summary": str,
  "scores": dict,
  "verdict": str,
  "missing_artifacts": list,
  "findings": list,
  "actions": list,
  "metrics": dict,
  "context": dict
}

def read_json(p): return json.loads(pathlib.Path(p).read_text(encoding="utf-8"))
def write_text(p, s): pathlib.Path(p).parent.mkdir(parents=True, exist_ok=True); pathlib.Path(p).write_text(s, encoding="utf-8")

def build_system():
    return ("Du bist Senior-DX-/QA-Reviewer für Vue 3 + Pinia + Vitest.\n"
            "Antworte ausschließlich im JSON-Schema aus agent-spec.md.\n"
            "Erfinde nichts; nutze nur gelieferte Artefakte.")

def build_user(vitest_json, coverage_summary, fail_log="", setup_snippets=""):
    return "\n".join([
      "# Aufgabe",
      "Bewerte Testabdeckung und Setup-Korrektheit (Pinia-Provider, vi.mock-Hoisting, globale Plugins).",
      "",
      "# Artefakte",
      "<VITEST_JSON>",
      json.dumps(vitest_json, indent=2, ensure_ascii=False),
      "</VITEST_JSON>",
      "",
      "<COVERAGE_SUMMARY_JSON>",
      json.dumps(coverage_summary, indent=2, ensure_ascii=False),
      "</COVERAGE_SUMMARY_JSON>",
      "",
      "<FAIL_LOG>",
      fail_log,
      "</FAIL_LOG>",
      "",
      "<SETUP_SNIPPETS>",
      setup_snippets,
      "</SETUP_SNIPPETS>",
      "",
      "# Erwartungen",
      "Identifiziere Hoisting-Probleme, prüfe globale Provider & Mount-Utility, liefere minimale Patches."
    ])

def validate_agent_output(path):
    data = read_json(path)
    # Minimal Validation
    def must(k, t):
        if k not in data: raise ValueError(f"Missing key: {k}")
        if not isinstance(data[k], t): raise TypeError(f"Key {k} not {t}")
    for k,t in SCHEMA.items(): must(k,t)
    if data["verdict"] not in ["pass","soft-fail","fail","blocked"]:
        raise ValueError("verdict invalid")
    for key in ["pass_rate_pct","coverage_statements_pct","coverage_lines_pct","setup_correctness_pct","determinism_pct","overall_pct"]:
        v = data["scores"].get(key)
        if not isinstance(v, (int,float)) or not (0 <= v <= 100):
            raise ValueError(f"scores.{key} invalid")
    print("✓ Schema ok. Verdict:", data["verdict"])
    return 0

def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd")

    c = sub.add_parser("collect")
    c.add_argument("--vitest", default="vitest.json")
    c.add_argument("--coverage", default="coverage/coverage-summary.json")
    c.add_argument("--faillog")
    c.add_argument("--snippets")
    c.add_argument("--out", default="build/artifacts.json")

    p = sub.add_parser("prompt")
    p.add_argument("--artifacts", default="build/artifacts.json")
    p.add_argument("--out", default="build/prompt.txt")

    v = sub.add_parser("validate")
    v.add_argument("--output", required=True)

    args = ap.parse_args()

    if args.cmd == "collect":
      vj = read_json(args.vitest)
      cov = read_json(args.coverage)
      fail = pathlib.Path(args.faillog).read_text(encoding="utf-8") if args.faillog and pathlib.Path(args.faillog).exists() else ""
      snip = pathlib.Path(args.snippets).read_text(encoding="utf-8") if args.snippets and pathlib.Path(args.snippets).exists() else ""
      write_text(args.out, json.dumps({"vitest": vj, "coverage": cov, "failLog": fail, "setupSnippets": snip}, indent=2))
      print("✓ artifacts →", args.out)
      return

    if args.cmd == "prompt":
      art = read_json(args.artifacts)
      sysblock = build_system()
      usrblock = build_user(art["vitest"], art["coverage"], art.get("failLog",""), art.get("setupSnippets",""))
      prompt = f"## SYSTEM\n{sysblock}\n\n## USER\n{usrblock}\n"
      write_text(args.out, prompt)
      print("✓ prompt →", args.out)
      print("\n--- Prompt Preview ---\n")
      print(prompt)
      return

    if args.cmd == "validate":
      return sys.exit(validate_agent_output(args.output))

    ap.print_help()

if __name__ == "__main__":
    main()
