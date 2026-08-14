type DocLike ={ 
    pageContent: string;
    metadata?: Record<string, any> ;
};

export function
formatContext(docs: DocLike[]):
string {
  if (docs.length === 0) {
    return "No relevant sources were found.";
  }

  return docs
   .map((doc, index) => {
    const title = doc.metadata?.title || "untitled";
    const url= doc.metadata?.url || "";

    return `[${index + 1}]
    Title: ${title}
    URL: ${url}
    content: ${doc.pageContent}`;
   })
   .join("\n\n");
}