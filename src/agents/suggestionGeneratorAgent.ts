import { BaseMessage } from "@langchain/core/messages";

import { PromptTemplate } from "@langchain/core/prompts";

import { RunnableSequence, RunnableMap } from "@langchain/core/runnables";

import type { BaseChatModel } from "@langchain/core/language_models/chat_models";


import formatChatHistoryAsString from "../utils/Chat_history.js";
import ListLineOutputParser from "../lib/outputParsers/ListLineOutputParser.js";
import { suggestionGeneratorPrompt } from "./Prompts/Prompts.js";

const outputParser = new ListLineOutputParser({ key: "suggestions" });

type SuggestionGeneratorInput = {
  chat_history: BaseMessage[];
};

const createSuggestionGeneratorChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    RunnableMap.from({
      chat_history: (input: SuggestionGeneratorInput) =>
        formatChatHistoryAsString(input.chat_history),
    }),

    PromptTemplate.fromTemplate(suggestionGeneratorPrompt),

    llm,

    outputParser,
  ]).withConfig({
    runName: "FinalResponseGenerator",
  });
};

const generateSuggestions = (
  input: SuggestionGeneratorInput,
  llm: BaseChatModel,
) => {
  (llm as any).temperature = 0;

  return createSuggestionGeneratorChain(llm).invoke(input);
};

const handleSuggestionGenerator = (
  history: BaseMessage[],
  llm: BaseChatModel,
) => {
  return generateSuggestions({ chat_history: history }, llm);
};

export default handleSuggestionGenerator;