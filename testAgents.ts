import { BaseMessage } from "@langchain/core/messages";
import type { Embeddings } from "@langchain/core/embeddings";

import { llm } from "./src/Services/llm.js";
import { embeddings } from "./src/Services/Embedding.js";
import dispatch from "./src/Dispatch.js";
import handleSuggestionGenerator from "./src/agents/suggestionGeneratorAgent.js";
import formatOut from "./src/utils/FormatOut.js";


// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 45_000;
const SAMPLES_PER_AGENT = 3;

// ---------------------------------------------------------------------------
// Sample inputs — 3 realistic queries per agent, tailored to what each
// agent/focus-mode is actually meant to handle.
// ---------------------------------------------------------------------------

const SAMPLE_QUERIES: Record<string, string[]> = {
  webSearch: [
    "What are the latest developments in renewable energy storage?",
    "Who won the most recent Formula 1 championship?",
    "Explain the difference between TCP and UDP",
  ],
  academicSearch: [
    "What does recent research say about the effects of sleep on memory consolidation?",
    "Summarize the state of the art in transformer architectures for NLP",
    "What are the leading theories on the origin of the universe?",
  ],
  redditSearch: [
    "What do people on Reddit recommend as the best budget mechanical keyboard?",
    "What's the general Reddit sentiment on remote work vs. office work?",
    "What are common Reddit tips for learning to cook as a beginner?",
  ],
  youtubeSearch: [
    "Find a good beginner tutorial on React hooks",
    "What are popular videos explaining how black holes form?",
    "Recommend videos for learning basic guitar chords",
  ],
  writingAssistant: [
    "Rewrite this sentence to sound more professional: 'hey can u send me that file asap thx'",
    "Summarize the following paragraph in two sentences: 'Artificial intelligence has rapidly transformed industries by automating complex tasks, enabling data-driven decisions, and creating new products. However, it also raises concerns around job displacement, bias, and privacy that policymakers are still working to address.'",
    "Expand this into a short paragraph: 'Remote work increases flexibility but can reduce collaboration.'",
  ],
  imageSearch: [
    "pictures of the Eiffel Tower at night",
    "images of golden retriever puppies",
    "diagrams of the human digestive system",
  ],
  videoSearch: [
    "videos explaining how photosynthesis works",
    "highlight clips from the latest Champions League final",
    "tutorial videos for setting up a home espresso machine",
  ],
};

// suggestionGenerator doesn't take a query — it takes chat history and
// proposes follow-up questions/suggestions.
const SAMPLE_HISTORIES: { role: string; content: string }[][] = [
  [
    { role: "user", content: "What is quantum computing?" },
    {
      role: "assistant",
      content:
        "Quantum computing uses qubits, which can represent 0 and 1 simultaneously via superposition, to perform certain calculations far faster than classical computers.",
    },
  ],
  [
    { role: "user", content: "How do I start learning Python?" },
    {
      role: "assistant",
      content:
        "Start with the official Python tutorial, practice on small scripts, then move to a project like a to-do app or a simple web scraper.",
    },
  ],
  [
    { role: "user", content: "What's a good beginner workout routine?" },
    {
      role: "assistant",
      content:
        "A simple full-body routine 3x/week with squats, push-ups, rows, and planks is a solid start for most beginners.",
    },
  ],
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TestOutcome = {
  agent: string;
  sampleIndex: number;
  input: string;
  success: boolean;
  durationMs: number;
  preview: string;
  error?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out after ${ms}ms waiting for ${label}`));
    }, ms);

    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

const truncate = (text: string, max = 220) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
};

/** Runs a "stream" mode agent (returns an EventEmitter) and collects output. */
const runStreamAgent = (
  run: (...args: any[]) => any,
  query: string,
  history: BaseMessage[],
): Promise<string> => {
  return new Promise((resolve, reject) => {
    let responseText = "";
    let sourcesCount = 0;

    let emitter: any;
    try {
      emitter = run(query, history, llm, embeddings as Embeddings);
    } catch (err) {
      reject(err);
      return;
    }

    emitter.on("data", (raw: string) => {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.type === "response") {
          const chunk = parsed.data;
          responseText += typeof chunk === "string" ? chunk : chunk?.content ?? "";
        } else if (parsed.type === "sources") {
          sourcesCount = Array.isArray(parsed.data) ? parsed.data.length : 0;
        }
      } catch {
        // non-JSON payload, ignore
      }
    });

    emitter.on("end", () => {
      resolve(
        responseText.trim().length > 0
          ? responseText
          : `(no text chunks emitted; sources found: ${sourcesCount})`,
      );
    });

    emitter.on("error", (err: any) => {
      reject(new Error(typeof err === "string" ? err : err?.message || "stream error"));
    });
  });
};

/** Runs a "list" mode agent (returns a Promise of an array). */
const runListAgent = async (
  run: (...args: any[]) => any,
  query: string,
  history: BaseMessage[],
): Promise<string> => {
  const result = await run(query, history, llm);
  const items = Array.isArray(result) ? result : [];
  return `${items.length} result(s): ${JSON.stringify(items.slice(0, 3))}`;
};

const runSuggestionGenerator = async (
  historyRaw: { role: string; content: string }[],
): Promise<string> => {
  const history = formatOut(historyRaw);
  const result = await handleSuggestionGenerator(history, llm);
  return JSON.stringify(result);
};

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const runAgent = async (agentName: string): Promise<TestOutcome[]> => {
  const outcomes: TestOutcome[] = [];

  if (agentName === "suggestionGenerator") {
    for (let i = 0; i < SAMPLES_PER_AGENT; i++) {
      // Non-null assertion is safe: modulo always keeps the index in range,
      // but tsconfig's noUncheckedIndexedAccess would otherwise type this
      // as `... | undefined`.
      const historyRaw = SAMPLE_HISTORIES[i % SAMPLE_HISTORIES.length]!;
      const label = historyRaw.map((h) => h.content).join(" | ");
      const start = Date.now();
      try {
        const output = await withTimeout(
          runSuggestionGenerator(historyRaw),
          TIMEOUT_MS,
          `${agentName} sample ${i + 1}`,
        );
        outcomes.push({
          agent: agentName,
          sampleIndex: i + 1,
          input: truncate(label, 100),
          success: true,
          durationMs: Date.now() - start,
          preview: truncate(output),
        });
      } catch (err: any) {
        outcomes.push({
          agent: agentName,
          sampleIndex: i + 1,
          input: truncate(label, 100),
          success: false,
          durationMs: Date.now() - start,
          preview: "",
          error: err?.message || String(err),
        });
      }
    }
    return outcomes;
  }

  const entry = (dispatch as any)[agentName];
  if (!entry) {
    throw new Error(`Unknown agent '${agentName}'. Valid: ${Object.keys(dispatch).join(", ")}`);
  }

  const queries = SAMPLE_QUERIES[agentName] ?? [];
  for (let i = 0; i < SAMPLES_PER_AGENT; i++) {
    const query = queries[i] ?? `Sample query ${i + 1} for ${agentName}`;
    const history: BaseMessage[] = [];
    const start = Date.now();

    try {
      const output =
        entry.mode === "stream"
          ? await withTimeout(
              runStreamAgent(entry.run, query, history),
              TIMEOUT_MS,
              `${agentName} sample ${i + 1}`,
            )
          : await withTimeout(
              runListAgent(entry.run, query, history),
              TIMEOUT_MS,
              `${agentName} sample ${i + 1}`,
            );

      outcomes.push({
        agent: agentName,
        sampleIndex: i + 1,
        input: query,
        success: true,
        durationMs: Date.now() - start,
        preview: truncate(output),
      });
    } catch (err: any) {
      outcomes.push({
        agent: agentName,
        sampleIndex: i + 1,
        input: query,
        success: false,
        durationMs: Date.now() - start,
        preview: "",
        error: err?.message || String(err),
      });
    }
  }

  return outcomes;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  const requested = process.argv.slice(2);
  const allAgents = [...Object.keys(dispatch), "suggestionGenerator"];
  const agentsToRun = requested.length > 0 ? requested : allAgents;

  const invalid = agentsToRun.filter((a) => !allAgents.includes(a));
  if (invalid.length > 0) {
    console.error(`Unknown agent(s): ${invalid.join(", ")}`);
    console.error(`Valid agents: ${allAgents.join(", ")}`);
    process.exit(1);
  }

  console.log(`\nRunning ${SAMPLES_PER_AGENT} sample(s) each against: ${agentsToRun.join(", ")}\n`);
  console.log("=".repeat(80));

  const allOutcomes: TestOutcome[] = [];

  for (const agentName of agentsToRun) {
    console.log(`\n### ${agentName} ###`);
    const outcomes = await runAgent(agentName);
    allOutcomes.push(...outcomes);

    for (const o of outcomes) {
      const status = o.success ? "PASS" : "FAIL";
      console.log(`  [${status}] sample ${o.sampleIndex} (${o.durationMs}ms)`);
      console.log(`    input:  ${o.input}`);
      if (o.success) {
        console.log(`    output: ${o.preview}`);
      } else {
        console.log(`    error:  ${o.error}`);
      }
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY\n");

  const byAgent = new Map<string, TestOutcome[]>();
  for (const o of allOutcomes) {
    if (!byAgent.has(o.agent)) byAgent.set(o.agent, []);
    byAgent.get(o.agent)!.push(o);
  }

  let totalPass = 0;
  let totalFail = 0;

  for (const [agentName, outcomes] of byAgent) {
    const pass = outcomes.filter((o) => o.success).length;
    const fail = outcomes.length - pass;
    totalPass += pass;
    totalFail += fail;
    const avgMs =
      outcomes.reduce((sum, o) => sum + o.durationMs, 0) / outcomes.length;
    console.log(
      `  ${agentName.padEnd(20)} ${pass}/${outcomes.length} passed   avg ${avgMs.toFixed(0)}ms`,
    );
  }

  console.log(
    `\n  TOTAL: ${totalPass}/${totalPass + totalFail} passed, ${totalFail} failed\n`,
  );

  process.exit(totalFail > 0 ? 1 : 0);
};

main().catch((err) => {
  console.error("Fatal error running test suite:", err);
  process.exit(1);
});