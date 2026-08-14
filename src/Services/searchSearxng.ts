import axios from "axios";
import dotenv from 'dotenv'


export interface SearxngSearchOptions {
    language? : string;
    categories? : string[];
    engines?: string[];
}

export async function searchSearxng(
    query: string,
    options: SearxngSearchOptions ={}
)
{
    const baseUrl = process.env.SEARXNG_API_URL || "https://searx.be";

    const params: Record<string, string> = { 
        q: query,
        format: "json",
        language: options.language || "en",
        };

    if (options.categories?.length) {
        params.categories = options.categories.join(",");
    }
    
    if(options.engines?.length) {
        params.engines = options.engines.join(",");
    }

    console.log("SEARXNG BASE URL:", baseUrl);
console.log("SEARXNG REQUEST URL:", `${baseUrl}/search`);
console.log("SEARXNG PARAMS:", params);
    
    const response = await
    axios.get(`${baseUrl}/search`,{
        params,
    });

    if (
        typeof response.data ===
        "string" &&
        response.data.includes("<html")
    ){
        throw new Error(
            "This SearxNG instance does not provide JSON API responses."
        );
    }
    return response.data;
}