import { ChatGroq } from "@langchain/groq";
import { BaseMessage } from "@langchain/core/messages";
import {
  RunnableSequence,
  RunnableMap,
  RunnableLambda,
} from "@langchain/core/runnables";

import {
  PromptTemplate,
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

import { StringOutputParser } from "@langchain/core/output_parsers";

import { Document } from "@langchain/core/documents";

import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

const imageSearchAgent = () = {
    return RunnableSequence.from([
  RunnableMap.from({
    chat_history: (input) => formatChatHistoryAsString(input.chat_history),
    query: (input) => input.query,
  }),
  PromptTemplate.fromTemplate(rephrasePrompt),
  llm,
  strParser,
  RunnableLambda.from(async (input: string) => {
    const res = await searchSearxng(input, { categories: ["images"], engines: ["bing images", "google images"], engines: [...] });
    const results = [];
    res.results.forEach((result) => {
      if (/* required fields present */) {
        results.push({ /* shaped result object */ });
      }
    });
    return results.slice(0, 10);
  }),
])
}