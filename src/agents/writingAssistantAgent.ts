import eventEmitter from "events";

import { BaseMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

import { handleStream } from "../utils/handleStream.js";

const writingAssistantPrompt = `
You are FutureSearch's Writing Assistant.

Your job is to help users write, rewrite, improve, summarize, expand, or edit text.

Guidelines:
- Produce clear, natural, and well-structured writing.
- Preserve the user's intent.
- If asked to rewrite, keep the meaning the same while improving clarity.
- If asked to summarize, include only the important information.
- If asked to expand, add useful details without changing the original meaning.
- Use Markdown when it improves readability.
- Do not invent facts.
`;
const strParser = new StringOutputParser();

type WritingAssistantInput = {
  chat_history: BaseMessage[];
  query: string;
};

const createWritingAssistantChain = (
  llm: BaseChatModel,
) => {
  return RunnableSequence.from([
    ChatPromptTemplate.fromMessages([
      ["system", writingAssistantPrompt],
      new MessagesPlaceholder("chat_history"),
      ["user", "{query}"],
    ]),
    llm,
    strParser,
  ]).withConfig({
    runName: "FinalResponseGenerator",
  });
};

const basicWritingAssistant = (
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel,
) => {
  const emitter = new eventEmitter();

  try {
    const chain = createWritingAssistantChain(llm);

    const stream = chain.streamEvents(
      {
        chat_history: history,
        query,
      },
      {
        version: "v1",
      },
    );

    handleStream(stream, emitter).catch((streamErr) => {
      emitter.emit(
        "error",
        JSON.stringify({
          data: "An error has occurred. Please try again later.",
        }),
      );
      console.error(streamErr);
    });
  } catch (err) {
    emitter.emit(
      "error",
      JSON.stringify({
        data: "An error has occurred. Please try again later.",
      }),
    );

    console.error(err);
  }

  return emitter;
};

const handleWritingAssistant = (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel,
) => {
  return basicWritingAssistant(message, history, llm);
};

export default handleWritingAssistant;