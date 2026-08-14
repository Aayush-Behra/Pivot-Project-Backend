import { BaseOutputParser } from "@langchain/core/output_parsers";

interface ListLineOutputParserArgs {
  key?: string;
}

class ListLineOutputParser extends BaseOutputParser<string[]> {
  private key = "questions";

  constructor(args?: ListLineOutputParserArgs) {
    super();
    this.key = args?.key ?? this.key;
  }

  static lc_name() {
    return "ListLineOutputParser";
  }

  lc_namespace = ["langchain", "output_parsers", "list_line_output_parser"];

  async parse(text: string): Promise<string[]> {
    const startTag = `<${this.key}>`;
    const endTag = `</${this.key}>`;

    const startIndex = text.indexOf(startTag);
    const endIndex = text.indexOf(endTag);

    const contentStart = startIndex === -1 ? 0 : startIndex + startTag.length;
    const contentEnd = endIndex === -1 ? text.length : endIndex;

    const rawLines = text
      .slice(contentStart, contentEnd)
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const bulletPrefix = /^(\s*(-|\*|\d+\.\s|\d+\)\s)\s*)+/;
    const lines = rawLines.map((line) => line.replace(bulletPrefix, "").trim());

    return lines;
  }

  getFormatInstructions(): string {
    throw new Error(
      "getFormatInstructions not implemented for ListLineOutputParser.",
    );
  }
}

export default ListLineOutputParser;