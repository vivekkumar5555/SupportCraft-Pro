import { useState, useRef, useEffect } from "react";
import { chatAPI } from "../services/api";
import {
  Send,
  Bot,
  User,
  Copy,
  Check,
  Trash2,
  Sparkles,
  MessageSquare,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

const EXAMPLE_PROMPTS = [
  "What are your business hours?",
  "How can I contact support?",
  "Tell me about your products",
  "What payment methods do you accept?",
];

const formatRelativeTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString();
};

const TypingIndicator = () => (
  <div className="flex items-center gap-1.5 px-1 py-2">
    <span
      className="w-2 h-2 rounded-full bg-gray-500 animate-typing-bounce"
      style={{ animationDelay: "0ms" }}
    />
    <span
      className="w-2 h-2 rounded-full bg-gray-500 animate-typing-bounce"
      style={{ animationDelay: "160ms" }}
    />
    <span
      className="w-2 h-2 rounded-full bg-gray-500 animate-typing-bounce"
      style={{ animationDelay: "320ms" }}
    />
  </div>
);

const ChatTest = () => {
  const [message, setMessage] = useState("");
  const [responses, setResponses] = useState([]);
  const [testing, setTesting] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [responses, testing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || testing) return;

    const userMessage = message.trim();
    setMessage("");
    setTesting(true);

    const userMsg = {
      type: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    const newResponses = [...responses, userMsg];
    setResponses(newResponses);

    try {
      const { data } = await chatAPI.testQuery(userMessage);
      const botResponse = {
        type: "bot",
        content:
          data.response || data.message || "No response received",
        confidence: data.confidence,
        source: data.source,
        messageType: data.messageType,
        sources: data.sources,
        isFallback: data.isFallback,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      setResponses([...newResponses, botResponse]);
    } catch (error) {
      const errorMessage =
        error.response?.status === 401
          ? "Authentication error. Please logout and login again."
          : error.response?.data?.error
            ? error.response.data.error
            : error.message || "Sorry, I encountered an error processing your request.";

      const errorResponse = {
        type: "bot",
        content: errorMessage,
        isError: true,
        timestamp: new Date().toISOString(),
      };
      setResponses([...newResponses, errorResponse]);
      toast.error(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  const handleExampleClick = (prompt) => {
    setMessage(prompt);
  };

  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const clearChat = () => {
    setResponses([]);
    toast.success("Chat cleared");
  };

  return (
    <div className="flex flex-col h-[480px] bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-100">
            <MessageSquare className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Chat Test</h3>
            <p className="text-xs text-gray-500">Test your chatbot responses</p>
          </div>
        </div>
        {responses.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {responses.length === 0 && !testing ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-center animate-fade-in">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 mb-4">
              <Sparkles className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Test your chatbot
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              Ask a question to see how your chatbot responds in real-time
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(prompt)}
                  className="px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 border border-transparent rounded-lg transition-all duration-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {responses.map((response, index) => (
              <div
                key={index}
                className={`flex gap-3 animate-slide-up ${
                  response.type === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    response.type === "user"
                      ? "bg-primary-600"
                      : response.isError
                        ? "bg-red-100"
                        : "bg-gray-200"
                  }`}
                >
                  {response.type === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot
                      className={`w-4 h-4 ${
                        response.isError ? "text-red-600" : "text-gray-600"
                      }`}
                    />
                  )}
                </div>
                <div
                  className={`flex flex-col max-w-[85%] ${
                    response.type === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`group relative rounded-2xl px-4 py-2.5 transition-all duration-200 ${
                      response.type === "user"
                        ? "bg-primary-600 text-white rounded-br-md"
                        : response.isError
                          ? "bg-red-50 text-red-800 rounded-bl-md"
                          : "bg-gray-100 text-gray-900 rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm leading-relaxed pr-8">
                      {response.content}
                    </p>
                    <button
                      onClick={() => copyToClipboard(response.content, index)}
                      className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/10"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  {response.type === "bot" && !response.isError && (
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {(response.confidence != null ||
                        response.source ||
                        response.isFallback) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {response.confidence != null && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-200/80 text-gray-700">
                              {Math.round(response.confidence * 100)}% confidence
                            </span>
                          )}
                          {response.source && (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                                response.source === "pdf"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-gray-200/80 text-gray-700"
                              }`}
                            >
                              {response.source === "pdf" ? "PDF" : "Default"}
                            </span>
                          )}
                          {response.isFallback && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
                              Fallback
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <span className="text-xs text-gray-400 mt-1">
                    {formatRelativeTime(response.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {testing && (
              <div className="flex gap-3 animate-slide-up">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-4 border-t border-gray-200 bg-gray-50"
      >
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={testing}
          className="flex-1 px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!message.trim() || testing}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600 transition-all duration-200 shrink-0"
        >
          {testing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
};

export default ChatTest;
