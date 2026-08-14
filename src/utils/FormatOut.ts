import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";

const formatOut = (
  history: { role: string; content: string }[],
): BaseMessage[] => {
  const messages: BaseMessage[] = [];

  for (const item of history) {
    if (item.role === "assistant") {
      messages.push(new AIMessage(item.content));
    } else {
      messages.push(new HumanMessage(item.content));
    }
  }

  return messages;
};

export default formatOut;