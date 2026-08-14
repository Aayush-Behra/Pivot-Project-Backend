export const handleStream = async (stream, emitter) => {
  for await (const event of stream) {
    if (event.event === "on_chain_end" && event.name === "FinalSourceRetriever") {
      emitter.emit("data", JSON.stringify({ type: "sources", data: event.data.output }));
    }
    if (event.event === "on_chain_stream" && event.name === "FinalResponseGenerator") {
      emitter.emit("data", JSON.stringify({ type: "response", data: event.data.chunk }));
    }
    if (event.event === "on_chain_end" && event.name === "FinalResponseGenerator") {
      emitter.emit("end");
    }
  }
};

