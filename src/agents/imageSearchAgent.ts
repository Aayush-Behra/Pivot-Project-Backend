import { BaseMessage } from "@langchain/core/messages";
import {
  RunnableSequence,
  RunnableMap,
  RunnableLambda,
} from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

import { searchSearxng } from "../Services/searchSearxng.js";
import formatChatHistoryAsString from "../utils/Chat_history.js";
import { imageSearchChainPrompt } from "./Prompts/Prompts.js";

const strParser = new StringOutputParser();

type ImageSearchInput = {
  chat_history: BaseMessage[];
  query: string;
};


const createImageSearchChain = (
  llm: BaseChatModel,
) => {
  return RunnableSequence.from([
    RunnableMap.from({
      chat_history: (input: ImageSearchInput) =>
        formatChatHistoryAsString(input.chat_history),

      query: (input: ImageSearchInput) => input.query,
    }),

    PromptTemplate.fromTemplate(imageSearchChainPrompt),

    llm,

    strParser,

    RunnableLambda.from(async (input: string) => {
      const res = await searchSearxng(input, {
        categories: ["images"],
        engines: ["bing images", "google images"],
      });

      const results: {
        img_src: string;
        url: string;
        title: string;
      }[] = [];

      res.results.forEach((result) => {
        if (result.img_src && result.url && result.title) {
          results.push({
            img_src: result.img_src,
            url: result.url,
            title: result.title,
          });
        }
      });

      return results.slice(0, 10);
    }),
  ]);
};

const handleImageSearch = async (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel,
) => {
  const chain = createImageSearchChain(llm);

  return chain.invoke({
    chat_history: history,
    query: message,
  });
};

export default handleImageSearch;