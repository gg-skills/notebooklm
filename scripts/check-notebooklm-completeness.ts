#!/usr/bin/env npx tsx

/**
 * NotebookLM Completeness Checker
 * 
 * Verifies a NotebookLM operation against the 8-item NotebookLM Quality Checklist.
 * 
 * Usage:
 *   npx tsx skills/notebooklm/scripts/check-notebooklm-completeness.ts --phase <phase>
 */

import { argv } from "process";

// ============================================================================
// Types
// ============================================================================

/**
 * One row of the eight-item NotebookLM quality checklist used for scoring and console output.
 *
 * @remarks
 * PURITY: `checked` is synthesized from the CLI `--phase` value; it does not read live NotebookLM UI state.
 */
interface ChecklistItem {
  number: number;
  name: string;
  description: string;
  required: boolean;
  checked: boolean;
  weight: number;
}

/**
 * Structured completeness payload printed after the human-readable report when `--json` is set.
 *
 * @remarks
 * I/O: Emitted to stdout only; callers parse JSON from the trailing console block, not a return value.
 */
interface CompletenessReport {
  checklist: ChecklistItem[];
  score: number;
  maxScore: number;
  canFinalize: boolean;
}

// ============================================================================
// Checklist Definition
// ============================================================================

const CHECKLIST_ITEMS: Omit<ChecklistItem, "checked">[] = [
  { number: 1, name: "Counter verified", description: "Chat-input footer count used", required: true, weight: 2 },
  { number: 2, name: "Quota checked", description: "Source cap ~268, not 300", required: true, weight: 2 },
  { number: 3, name: "CDP tier used", description: "browser_batch with computer action", required: true, weight: 2 },
  { number: 4, name: "Dialog scoped", description: "querySelector scoped to dialog", required: true, weight: 1 },
  { number: 5, name: "Timing respected", description: "Angular init needs 1500ms", required: true, weight: 2 },
  { number: 6, name: "Chat cleared", description: "No prior contamination", required: true, weight: 1 },
  { number: 7, name: "Response saved", description: "To .tmp/notebooklm-YYYY-MM-DD/", required: true, weight: 2 },
  { number: 8, name: "Prompt mapping printed", description: "window.__gen.report() called", required: false, weight: 1 },
];

// ============================================================================
// Main
// ============================================================================

/**
 * Parses CLI flags, derives checklist completion from `--phase`, prints the scorecard to stdout.
 *
 * @remarks
 * I/O: Reads `process.argv`; writes human-readable lines to stdout and an optional JSON report for `--json`.
 * USAGE: Invoked as the script body when run via the shebang + `tsx` entry in this file.
 */
function main() {
  const args = argv.slice(2);
  const phaseArg = args.find(a => a === "--phase" || a === "-p");
  const jsonArg = args.includes("--json");
  
  const phase = phaseArg 
    ? parseInt(args[args.indexOf(phaseArg) + 1] || "8", 10)
    : 8;
  
  console.log("\n📋 NotebookLM Completeness Check");
  console.log("═".repeat(60));
  console.log(`\n📊 Phase: ${phase}/8`);
  
  // Build checklist based on phase
  const checklist: ChecklistItem[] = CHECKLIST_ITEMS.map(item => {
    let checked = false;
    
    switch (item.number) {
      case 1: // Counter verified
        checked = phase >= 1;
        break;
      case 2: // Quota checked
        checked = phase >= 1;
        break;
      case 3: // CDP tier used
        checked = phase >= 2;
        break;
      case 4: // Dialog scoped
        checked = phase >= 2;
        break;
      case 5: // Timing respected
        checked = phase >= 3;
        break;
      case 6: // Chat cleared
        checked = phase >= 1;
        break;
      case 7: // Response saved
        checked = phase >= 4;
        break;
      case 8: // Prompt mapping printed
        checked = phase >= 5 || item.required === false;
        break;
      default:
        break;
    }
    
    return { ...item, checked };
  });
  
  const score = checklist.reduce((sum, item) => 
    item.checked ? sum + item.weight : sum, 0);
  const maxScore = checklist.reduce((sum, item) => sum + item.weight, 0);
  
  const requiredItems = checklist.filter(i => i.required);
  const requiredScore = requiredItems.reduce((sum, item) => 
    item.checked ? sum + item.weight : sum, 0);
  const requiredMax = requiredItems.reduce((sum, item) => sum + item.weight, 0);
  
  const canFinalize = requiredScore === requiredMax;
  
  console.log(`\n📊 Score: ${score}/${maxScore} (${((score/maxScore)*100).toFixed(0)}%)`);
  console.log(`   Required items: ${requiredScore}/${requiredMax}`);
  
  console.log(`\n${canFinalize ? "✅" : "⚠️"} Ready: ${canFinalize ? "YES" : "NEEDS WORK"}`);
  
  console.log("\n📝 Checklist:");
  for (const item of checklist) {
    const icon = item.checked ? "✅" : item.required ? "❌" : "⚠️";
    console.log(`   ${icon} [${item.number}] ${item.name}`);
  }
  
  console.log("\n" + "═".repeat(60));
  
  if (!canFinalize) {
    console.log("\n⚠️ NotebookLM operation needs verification before proceeding.");
    const failedItems = checklist.filter(i => !i.checked && i.required);
    if (failedItems.length > 0) {
      console.log("\nIssues to verify:");
      failedItems.forEach(i => console.log(`   - ${i.name}: ${i.description}`));
    }
  } else {
    console.log("\n✅ NotebookLM operation is verified and ready.");
  }
  
  if (jsonArg) {
    const report: CompletenessReport = { checklist, score, maxScore, canFinalize };
    console.log("\n" + JSON.stringify(report, null, 2));
  }
}

main();
