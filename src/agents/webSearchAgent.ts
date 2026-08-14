import eventEmitter from "events";
import { BaseMessage } from "@langchain/core/messages";
import { handleStream } from "../utils/handleStream.js";
import { searchSearxng } from "../Services/searchSearxng.js";
import formatChatHistoryAsString from "../utils/Chat_history.js";
import computeSimilarity from "../utils/computeSimilarity.js";

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
import type { Embeddings } from "@langchain/core/embeddings";
import { basicWebSearchResponsePrompt,basicWebSearchRetrieverPrompt } from "./Prompts/Prompts.js";


const strParser = new StringOutputParser();

type WebChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

const createBasicWebSearchAnsweringChain = (
  llm: BaseChatModel,
  embeddings: Embeddings,
) => {
  const basicRedditSearchRetrieverChain =
    createBasicWebSearchRetrieverChain(llm);

  const processDocs = async (docs: (Document | undefined)[]) => {
    return docs
      .filter((doc): doc is Document => doc !== undefined)
      .map((doc, index) => `${index + 1}. ${doc.pageContent}`)
      .join("\n");
  };

  const rerankDocs = async ({
    query,
    docs,
  }: {
    query: string;
    docs: Document[];
  }) => {
    if (docs.length === 0) return docs;

    const docsWithContent = docs.filter(
      (doc) => doc.pageContent && doc.pageContent.length > 0,
    );

    const [docEmbeddings, queryEmbedding] = await Promise.all([
      embeddings.embedDocuments(docsWithContent.map((doc) => doc.pageContent)),
      embeddings.embedQuery(query),
    ]);

    const similarity = docEmbeddings.map((docEmbedding, i) => ({
      index: i,
      similarity: computeSimilarity(queryEmbedding, docEmbedding),
    }));

    const sortedDocs = similarity
      .sort((a, b) => b.similarity - a.similarity)
      .filter((sim) => sim.similarity > 0.5)
      .slice(0, 15)
      .map((sim) => docsWithContent[sim.index]);

    return sortedDocs;
  };

  return RunnableSequence.from([
    RunnableMap.from({
      query: (input: WebChainInput) => input.query,

      chat_history: (input: WebChainInput) => input.chat_history,

      context: RunnableSequence.from([
        (input) => ({
          query: input.query,
          chat_history: formatChatHistoryAsString(input.chat_history),
        }),

        basicRedditSearchRetrieverChain
          .pipe(rerankDocs)
          .withConfig({
            runName: "FinalSourceRetriever",
          })
          .pipe(processDocs),
      ]),
    }),

    ChatPromptTemplate.fromMessages([
      ["system", basicWebSearchResponsePrompt],
      new MessagesPlaceholder("chat_history"),
      ["user", "{query}"],
    ]),

    llm,
    strParser,
  ]).withConfig({
    runName: "FinalResponseGenerator",
  });
};

const createBasicWebSearchRetrieverChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    PromptTemplate.fromTemplate(basicWebSearchRetrieverPrompt),

    llm,

    strParser,

    RunnableLambda.from(async (input: string) => {
      if (input === "not_needed") {
        return {
          query: "",
          docs: [],
        };
      }

      const res = await searchSearxng(input, {
        language: "en",
      });

      const documents = res.results.map(
        (result) =>
          new Document({
            pageContent: result.content,
            metadata: {
              title: result.title,
              url: result.url,
              ...(result.img_src && {
                img_src: result.img_src,
              }),
            },
          }),
      );

      return {
        query: input,
        docs: documents,
      };
    }),
  ]);
};

const basicWebSearch = (
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings,
) => {
  const emitter = new eventEmitter();

  try {
    const chain = createBasicWebSearchAnsweringChain(llm, embeddings);

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
          data: "An error has occurred please try again later",
        }),
      );
      console.error(streamErr);
    });
  } catch (err) {
    emitter.emit(
      "error",
      JSON.stringify({
        data: "An error has occurred please try again later",
      }),
    );

    console.error(err);
  }

  return emitter;
};

const handleWebSearch = (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings,
) => {
  return basicWebSearch(message, history, llm, embeddings);
};

export default handleWebSearch;