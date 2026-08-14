import { handleStream } from "../utils/handleStream.ts";
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

const createBasicAcademicSearchRetrieverChain = () => {
    return RunnableSequence.from([
     PromptTemplate.fromTemplate(retrieverPrompt),
     llm,
     strParser,
     RunnableLambda.from(async (input: string) => {
       if (input === "not_needed") 
        return { query: "", docs: [] };
       const res = await searchSearxng(input, 
        { language: "en", 
            engines: ["arxiv", "google scholar", "internetarchivescholar", "pubmed"] 
        });

        const doc = res.results.map(
            r => new Document({ 
                pageContent: r.content, 
                metadata: {...} }
            ))
       return { query: input, docs: doc };
     }),
   ])
};