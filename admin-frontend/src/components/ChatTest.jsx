import { useState } from "react";
import { useQuery } from "react-query";
import { Send, Bot, User, Copy, Check } from "lucide-react";
import { chatAPI } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";

const ChatTest = () => {
  const [message, setMessage] = useState("");
  const [responses, setResponses] = useState([]);
  const [testing, setTesting] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || testing) return;

    const userMessage = message.trim();
    setMessage("");
    setTesting(true);

    // Add user message to responses
    const newResponses = [...responses, { type: "user", content: userMessage }];
    setResponses(newResponses);

    try {
      const response = await chatAPI.testQuery(userMessage);
      const botResponse = {
        type: "bot",
        content: response.response,
        confidence: response.confidence,
        sources: response.sources,
        isFallback: response.isFallback,
        timestamp: new Date().toISOString(),
      };
      setResponses([...newResponses, botResponse]);
    } catch (error) {
      console.error("Test chat error:", error);
      const errorResponse = {
        type: "bot",
        content: "Sorry, I encountered an error processing your request.",
        isError: true,
        timestamp: new Date().toISOString(),
      };
      setResponses([...newResponses, errorResponse]);
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const clearChat = () => {
    setResponses([]);
  };

  return (
    <div className="flex flex-col h-96">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {responses.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Test your chatbot
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Ask a question to see how your chatbot responds.
            </p>
          </div>
        ) : (
          responses.map((response, index) => (
            <div
              key={index}
              className={`flex ${
                response.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex max-w-xs lg:max-w-md ${
                  response.type === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`flex-shrink-0 ${
                    response.type === "user" ? "ml-2" : "mr-2"
                  }`}
                >
                  {response.type === "user" ? (
                    <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                <div
                  className={`rounded-lg px-4 py-2 ${
                    response.type === "user"
                      ? "bg-primary-600 text-white"
                      : response.isError
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm">{response.content}</p>

                  {response.type === "bot" && !response.isError && (
                    <div className="mt-2 space-y-2">
                      {response.confidence && (
                        <div className="text-xs opacity-75">
                          Confidence: {Math.round(response.confidence * 100)}%
                        </div>
                      )}

                      {response.isFallback && (
                        <div className="text-xs opacity-75 italic">
                          Fallback response
                        </div>
                      )}

                      {response.sources && response.sources.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium opacity-75">
                            Sources:
                          </div>
                          {response.sources
                            .slice(0, 2)
                            .map((source, sourceIndex) => (
                              <div
                                key={sourceIndex}
                                className="text-xs opacity-75 bg-white bg-opacity-20 rounded px-2 py-1"
                              >
                                {source.text.substring(0, 100)}...
                                {source.similarity && (
                                  <span className="ml-1">
                                    ({Math.round(source.similarity * 100)}%)
                                  </span>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => copyToClipboard(response.content, index)}
                    className="mt-1 text-xs opacity-75 hover:opacity-100 transition-opacity"
                  >
                    {copiedIndex === index ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {testing && (
          <div className="flex justify-start">
            <div className="flex max-w-xs lg:max-w-md">
              <div className="flex-shrink-0 mr-2">
                <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="rounded-lg px-4 py-2 bg-gray-100 text-gray-900">
                <div className="flex items-center space-x-1">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 input"
          disabled={testing}
        />
        <button
          type="submit"
          disabled={!message.trim() || testing}
          className="btn-primary"
        >
          {testing ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>

      {/* Clear Chat Button */}
      {responses.length > 0 && (
        <div className="mt-2 flex justify-end">
          <button
            onClick={clearChat}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear chat
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatTest;
