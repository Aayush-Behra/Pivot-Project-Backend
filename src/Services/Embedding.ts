import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import dotenv from 'dotenv'
dotenv.config()

const googleApiKey = process.env.GOOGLE_API_KEY;

if (!googleApiKey) {
  throw new Error("GOOGLE_API_KEY is not defined");
}

export const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: googleApiKey,
});