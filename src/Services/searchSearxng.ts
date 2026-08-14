export type SearxngResult = {
  title: string;
  url: string;
  content: string;
  img_src?: string;
  thumbnail?: string;
  iframe_src?: string;
};

export type SearxngResponse = {
  results: SearxngResult[];
};

export const searchSearxng = async (
  query: string,
  options?: {
    language?: string;
    engines?: string[];
    categories?: string[];
  },
): Promise<SearxngResponse> => {
  const baseUrl = process.env.SEARXNG_API_URL;

  if (!baseUrl) {
    throw new Error("SEARXNG_API_URL is not configured");
  }

  const params = new URLSearchParams({
    q: query,
    format: "json",
  });

  if (options?.language) {
    params.set("language", options.language);
  }

  if (options?.engines && options.engines.length > 0) {
    params.set("engines", options.engines.join(","));
  }

  if (options?.categories && options.categories.length > 0) {
    params.set("categories", options.categories.join(","));
  }

  const url = new URL("/search", baseUrl);
  url.search = params.toString();
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `SearXNG request failed with status ${response.status}: ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as {
    results?: Array<{
      title?: string;
      url?: string;
      content?: string;
      img_src?: string;
      thumbnail?: string;
      iframe_src?: string;
    }>;
  };

  const results = (payload.results ?? []).map((result) => ({
    title: result.title ?? "",
    url: result.url ?? "",
    content: result.content ?? "",
    ...(result.img_src ? { img_src: result.img_src } : {}),
    ...(result.thumbnail ? { thumbnail: result.thumbnail } : {}),
    ...(result.iframe_src ? { iframe_src: result.iframe_src } : {}),
  }));

  return {
    results,
  };
};