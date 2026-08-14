import handleAcademicSearch from "./agents/academicSearchAgent.js";
import handleImageSearch from "./agents/imageSearchAgent.js";
import handleRedditSearch from "./agents/redditSearchAgent.js";
import handleYoutubeSearch from "./agents/youtubeSearchAgent.js";
import handleWritingAssistant from "./agents/writingAssistantAgent.js";
import handleWebSearch from "./agents/webSearchAgent.js";
import handleVideoSearch from "./agents/videoSearchAgent.js";


const dispatch = {
  webSearch: {
    mode: "stream",
    run: handleWebSearch,
  },
  academicSearch: {
    mode: "stream",
    run: handleAcademicSearch,
  },
  redditSearch: {
    mode: "stream",
    run: handleRedditSearch,
  },
  youtubeSearch: {
    mode: "stream",
    run: handleYoutubeSearch,
  },
  writingAssistant: {
    mode: "stream",
    run: handleWritingAssistant,
  },
  imageSearch: {
    mode: "list",
    run: handleImageSearch,
  },
  videoSearch: {
    mode: "list",
    run: handleVideoSearch,
  },
};

export default dispatch;