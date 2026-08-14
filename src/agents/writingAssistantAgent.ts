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

const createWritingAssistantChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    ChatPromptTemplate.fromMessages([
      ["system", writingAssistantPrompt],
      new MessagesPlaceholder("chat_history"),
      ["user", "{query}"],
    ]),
    llm,
    strParser,
  ]).withConfig({ runName: "FinalResponseGenerator" });
};