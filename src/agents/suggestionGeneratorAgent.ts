const outputParser = new ListLineOutputParser({ key: "suggestions" });
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

const createSuggestionGeneratorChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    RunnableMap.from({
      chat_history: (input) => formatChatHistoryAsString(input.chat_history),
    }),
    PromptTemplate.fromTemplate(suggestionGeneratorPrompt),
    llm,
    outputParser,
  ]);
};

const generateSuggestions = (input, llm: BaseChatModel) => {
  (llm as any).temperature = 0; // consistent, less repetitive suggestions
  return createSuggestionGeneratorChain(llm).invoke(input);
};

