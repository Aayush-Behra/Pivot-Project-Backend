import dotenv from "dotenv";
import {ChatGroq} from "@langchain/groq";
dotenv.config();

export const llm = new ChatGroq({
    apiKey:process.env.Groq_API_KEY,
    model: "llama-3.3-70b-versatile",
});