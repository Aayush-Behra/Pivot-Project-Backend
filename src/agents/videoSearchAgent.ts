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
import { videoSearchChainPrompt } from "./Prompts/Prompts.js";

const strParser = new StringOutputParser();

type VideoSearchInput = {
  chat_history: BaseMessage[];
  query: string;
};

const createVideoSearchChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    RunnableMap.from({
      chat_history: (input: VideoSearchInput) =>
        formatChatHistoryAsString(input.chat_history),

      query: (input: VideoSearchInput) => input.query,
    }),

    PromptTemplate.fromTemplate(videoSearchChainPrompt),

    llm,

    strParser,

    RunnableLambda.from(async (input: string) => {
      const res = await searchSearxng(input, {
        engines: ["youtube"],
      });

      const results: {
        img_src: string;
        url: string;
        title: string;
        iframe_src: string;
      }[] = [];

      res.results.forEach((result) => {
        if (
          result.thumbnail &&
          result.url &&
          result.title &&
          result.iframe_src
        ) {
          results.push({
            img_src: result.thumbnail,
            url: result.url,
            title: result.title,
            iframe_src: result.iframe_src,
          });
        }
      });

      return results.slice(0, 10);
    }),
  ]);
};

const handleVideoSearch = async (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel,
) => {
  const chain = createVideoSearchChain(llm);

  return chain.invoke({
    chat_history: history,
    query: message,
  });
};

export default handleVideoSearch;