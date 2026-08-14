import express from "express";
import type { Request, Response } from "express";

import cors from "cors";

import { llm } from "./src/Services/llm.js";
import { embeddings } from "./src/Services/Embedding.js";
import dispatch from "./src/Dispatch.js";
import handleSuggestionGenerator from "./src/agents/suggestionGeneratorAgent.js";
import formatOut from "./src/utils/FormatOut.js";


const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "backend is running!",
  });
});


app.post("/api/search", async (req: Request, res: Response) => {
  const focusMode = req.body.focusMode;
  const query = req.body.query;
  const history = req.body.history || [];

  const agent = (dispatch as any)[focusMode];

  if (!agent) {
    res.status(400).json({
      success: false,
      error:
        "Unknown focusMode '" +
        focusMode +
        "'. Valid options: " +
        Object.keys(dispatch).join(", "),
    });
    return;
  }

  if (!query) {
    res.status(400).json({
      success: false,
      error: "Missing 'query' in request body",
    });
    return;
  }

  const chatHistory = formatOut(history);

  if (agent.mode === "list") {
    try {
      const data = await agent.run(query, chatHistory, llm);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err?.message || "Something went wrong",
      });
    }
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const emitter = agent.run(query, chatHistory, llm, embeddings);

  emitter.on("data", (raw: string) => {
   
    res.write("data: " + raw + "\n\n");
  });

  emitter.on("end", () => {
    res.write("event: done\ndata: {}\n\n");
    res.end();
  });

  emitter.on("error", (err: any) => {
    const payload = JSON.stringify({
      success: false,
      error: err?.message || "Stream error",
    });
    res.write("event: error\ndata: " + payload + "\n\n");
    res.end();
  });
});

app.post("/api/suggestions", async (req: Request, res: Response) => {
  const history = req.body.history;

  if (!history || history.length === 0) {
    res.status(400).json({
      success: false,
      error: "Missing 'history' in request body",
    });
    return;
  }

  try {
    const chatHistory = formatOut(history);
    const suggestions = await handleSuggestionGenerator(chatHistory, llm);
    res.json({ success: true, data: suggestions });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || "Something went wrong",
    });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log("listening on port " + PORT);
});

export default app;