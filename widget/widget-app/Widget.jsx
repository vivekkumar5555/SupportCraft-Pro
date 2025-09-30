import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const Widget = ({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (!config.wsUrl || !config.key) return;

    const socket = io(`${config.wsUrl}/ws/chat`, {
      query: { tenantKey: config.key },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setSessionId(socket.id);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("bot:message", (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "bot",
          content: data.message,
          timestamp: data.timestamp,
          confidence: data.confidence,
          sources: data.sources,
          isFallback: data.isFallback,
        },
      ]);
      setIsTyping(false);
    });

    socket.on("bot:typing", (data) => {
      setIsTyping(data.isTyping);
    });

    socket.on("error", (error) => {
      console.error("Widget socket error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "bot",
          content: "Sorry, I encountered an error. Please try again.",
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsTyping(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [config.wsUrl, config.key]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !isConnected) return;

    const message = inputValue.trim();
    setInputValue("");

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "user",
        content: message,
        timestamp: new Date().toISOString(),
      },
    ]);

    // Send message via socket
    if (socketRef.current) {
      socketRef.current.emit("user:message", {
        message,
        sessionId,
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleWidget = () => {
    setIsOpen(!isOpen);
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Widget styles
  const widgetStyles = {
    position: "fixed",
    [config.position.includes("right") ? "right" : "left"]: "20px",
    [config.position.includes("bottom") ? "bottom" : "top"]: "20px",
    zIndex: config.zIndex || 9999,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const buttonStyles = {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    border: "none",
    backgroundColor: config.primaryColor,
    color: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    transition: "all 0.3s ease",
    fontSize: "24px",
  };

  const chatStyles = {
    position: "absolute",
    [config.position.includes("right") ? "right" : "left"]: "0",
    [config.position.includes("bottom") ? "bottom" : "top"]: "70px",
    width: "350px",
    height: "500px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    border: "1px solid #e5e7eb",
  };

  const headerStyles = {
    backgroundColor: config.primaryColor,
    color: "white",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const messagesStyles = {
    flex: 1,
    padding: "16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  };

  const inputStyles = {
    padding: "16px",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    gap: "8px",
  };

  const messageStyles = {
    maxWidth: "80%",
    padding: "8px 12px",
    borderRadius: "12px",
    fontSize: "14px",
    lineHeight: "1.4",
  };

  const userMessageStyles = {
    ...messageStyles,
    backgroundColor: config.primaryColor,
    color: "white",
    alignSelf: "flex-end",
  };

  const botMessageStyles = {
    ...messageStyles,
    backgroundColor: "#f3f4f6",
    color: "#374151",
    alignSelf: "flex-start",
  };

  const errorMessageStyles = {
    ...messageStyles,
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    alignSelf: "flex-start",
  };

  return (
    <div style={widgetStyles}>
      {/* Chat Widget */}
      {isOpen && (
        <div style={chatStyles}>
          {/* Header */}
          <div style={headerStyles}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {config.logoUrl && (
                <img
                  src={config.logoUrl}
                  alt="Logo"
                  style={{ width: "24px", height: "24px", borderRadius: "4px" }}
                />
              )}
              <div>
                <div style={{ fontWeight: "600", fontSize: "16px" }}>
                  {config.botName}
                </div>
                <div style={{ fontSize: "12px", opacity: 0.8 }}>
                  {isConnected ? "Online" : "Connecting..."}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={clearChat}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  fontSize: "16px",
                }}
                title="Clear chat"
              >
                🗑️
              </button>
              <button
                onClick={toggleWidget}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  fontSize: "16px",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={messagesStyles}>
            {messages.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: "14px",
                  marginTop: "20px",
                }}
              >
                {config.welcomeMessage}
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  style={
                    message.type === "user"
                      ? userMessageStyles
                      : message.isError
                      ? errorMessageStyles
                      : botMessageStyles
                  }
                >
                  {message.content}
                  {message.type === "bot" &&
                    !message.isError &&
                    message.confidence && (
                      <div
                        style={{
                          fontSize: "11px",
                          opacity: 0.7,
                          marginTop: "4px",
                        }}
                      >
                        Confidence: {Math.round(message.confidence * 100)}%
                      </div>
                    )}
                </div>
              ))
            )}

            {isTyping && (
              <div style={botMessageStyles}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <div style={{ fontSize: "12px" }}>Typing</div>
                  <div style={{ display: "flex", gap: "2px" }}>
                    <div
                      style={{
                        width: "4px",
                        height: "4px",
                        backgroundColor: "#6b7280",
                        borderRadius: "50%",
                        animation: "typing 1.4s infinite ease-in-out",
                      }}
                    ></div>
                    <div
                      style={{
                        width: "4px",
                        height: "4px",
                        backgroundColor: "#6b7280",
                        borderRadius: "50%",
                        animation: "typing 1.4s infinite ease-in-out 0.2s",
                      }}
                    ></div>
                    <div
                      style={{
                        width: "4px",
                        height: "4px",
                        backgroundColor: "#6b7280",
                        borderRadius: "50%",
                        animation: "typing 1.4s infinite ease-in-out 0.4s",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={inputStyles}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={config.placeholderText}
              disabled={!isConnected}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "20px",
                fontSize: "14px",
                outline: "none",
                backgroundColor: isConnected ? "white" : "#f9fafb",
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || !isConnected}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: config.primaryColor,
                color: "white",
                cursor: isConnected ? "pointer" : "not-allowed",
                opacity: isConnected ? 1 : 0.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={toggleWidget}
        style={buttonStyles}
        onMouseEnter={(e) => {
          e.target.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "scale(1)";
        }}
      >
        {isOpen ? "✕" : "💬"}
      </button>

      {/* Typing Animation Styles */}
      <style>
        {`
          @keyframes typing {
            0%, 60%, 100% {
              transform: translateY(0);
            }
            30% {
              transform: translateY(-10px);
            }
          }
        `}
      </style>
    </div>
  );
};

export default Widget;
