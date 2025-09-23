import fs from "node:fs";
import path from "node:path";
import { buildArtifacts, buildSystemBlock, buildUserBlock } from "./collect.js";
import { validateOutput } from "./validate.js";

// Simple argument parser
function parseArgs(args: string[]) {
  const parsed: any = { _: [] };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = args[i + 1];
      parsed[key] = value;
      i += 2;
    } else {
      parsed._.push(arg);
      i++;
    }
  }
  return parsed;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];

  if (cmd === "collect") {
    const vitestPath = args.vitest || "vitest.json";
    const coveragePath = args.coverage || "coverage/coverage-summary.json";
    const failLogPath = args.faillog;
    const snippetsPath = args.snippets;
    
    try {
      const art = buildArtifacts({
        vitestJsonPath: vitestPath,
        coverageSummaryPath: coveragePath,
        failLogPath,
        setupSnippetsPath: snippetsPath
      });
      
      fs.mkdirSync("build", { recursive: true });
      fs.writeFileSync("build/artifacts.json", JSON.stringify(art, null, 2));
      console.log("✓ artifacts → build/artifacts.json");
    } catch (error) {
      console.error("Error collecting artifacts:", error.message);
      process.exit(1);
    }
  }
  
  else if (cmd === "prompt") {
    const artifactsPath = args.artifacts || "build/artifacts.json";
    const outPath = args.out || "build/prompt.txt";
    
    try {
      const art = JSON.parse(fs.readFileSync(artifactsPath, "utf8"));
      const sys = buildSystemBlock();
      const usr = buildUserBlock(art);
      const prompt = `## SYSTEM\n${sys}\n\n## USER\n${usr}\n`;
      
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, prompt);
      console.log("✓ prompt →", outPath);
      console.log("\n--- Prompt Preview ---\n");
      console.log(prompt);
    } catch (error) {
      console.error("Error building prompt:", error.message);
      process.exit(1);
    }
  }
  
  else if (cmd === "validate") {
    const outputPath = args.output;
    if (!outputPath) {
      console.error("Error: --output required for validate command");
      process.exit(1);
    }
    
    try {
      validateOutput(outputPath);
    } catch (error) {
      console.error("Validation failed:", error.message);
      process.exit(1);
    }
  }
  
  else {
    console.log("Usage:");
    console.log("  collect [--vitest vitest.json] [--coverage coverage/coverage-summary.json] [--faillog file] [--snippets file]");
    console.log("  prompt [--artifacts build/artifacts.json] [--out build/prompt.txt]");
    console.log("  validate --output agent_output.json");
    process.exit(1);
  }
}

main();
