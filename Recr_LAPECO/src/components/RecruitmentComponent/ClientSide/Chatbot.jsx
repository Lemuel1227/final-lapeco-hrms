// src/components/RecruitmentComponent/ClientSide/ChatBot.jsx
import { useState, useEffect } from "react";
import { chatbotData, defaultResponses, greetings } from "./chatbotData";

export default function ChatBot({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [currentOptions, setCurrentOptions] = useState([]);

  useEffect(() => {
    // Welcome message and initial options
    const welcomeMessage = {
      sender: "peco",
      text: "Hello! Welcome to LAPECO's recruitment portal. How can I help you today? Please choose from the options below:"
    };
    setMessages([welcomeMessage]);
    
    // Set initial question options (first 8 questions)
    setCurrentOptions(chatbotData.slice(0, 8));
  }, []);

  const handleQuestionClick = (question, answer) => {
    const userMessage = { sender: "user", text: question };
    const botMessage = { sender: "peco", text: answer };
    setMessages((prev) => [...prev, userMessage, botMessage]);
    
    // After answering, show follow-up options
    showFollowUpOptions();
  };

  const showFollowUpOptions = () => {
    // Show different questions as follow-up options
    const remainingQuestions = chatbotData.filter(qa => 
      !messages.some(msg => msg.text === qa.question)
    );
    
    // Show up to 6 different questions
    setCurrentOptions(remainingQuestions.slice(0, 6));
  };

  const handleMoreQuestions = () => {
    // Show more questions from the remaining pool
    const remainingQuestions = chatbotData.filter(qa => 
      !messages.some(msg => msg.text === qa.question)
    );
    
    setCurrentOptions(remainingQuestions.slice(0, 8));
  };

  const handleStartOver = () => {
    setMessages([{
      sender: "peco",
      text: "Hello! Welcome to LAPECO's recruitment portal. How can I help you today? Please choose from the options below:"
    }]);
    setCurrentOptions(chatbotData.slice(0, 8));
  };

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      width: '380px',
      maxHeight: '600px',
      zIndex: 1000,
      background: '#fff',
      border: '1px solid #ccc',
      borderRadius: '15px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '15px',
        borderBottom: '1px solid #eee',
        background: '#54B58C',
        color: 'white',
        borderRadius: '15px 15px 0 0'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>🤖 Hi, I'm Peco!</h3>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          ×
        </button>
      </div>

      {/* Message Area */}
      <div style={{
        height: "300px",
        overflowY: "auto",
        padding: "15px",
        background: "#fafafa",
        flex: 1,
      }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
              marginBottom: "12px",
              alignItems: "flex-start",
            }}
          >
            {msg.sender === "peco" && (
              <span style={{ fontSize: "20px", marginRight: "8px", marginTop: "2px" }}>🤖</span>
            )}
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "18px",
                background: msg.sender === "user" ? "#54B58C" : "#ffffff",
                color: msg.sender === "user" ? "white" : "#333",
                maxWidth: "75%",
                textAlign: "left",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                border: msg.sender === "peco" ? "1px solid #e0e0e0" : "none",
                whiteSpace: "pre-line",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Options Area */}
      <div style={{ padding: "15px", borderTop: "1px solid #eee", background: "white" }}>
        {/* Control Buttons */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
          <button
            onClick={handleMoreQuestions}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "#f8f9fa",
              border: "1px solid #ddd",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "12px",
              color: "#666",
            }}
          >
            More Questions
          </button>
          <button
            onClick={handleStartOver}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "#54B58C",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            Start Over
          </button>
        </div>

        {/* Question Options */}
        {currentOptions.length > 0 && (
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#666", fontWeight: "bold" }}>
              Choose a question:
            </p>
            {currentOptions.map((qa, i) => (
              <button
                key={qa.id}
                onClick={() => handleQuestionClick(qa.question, qa.answer)}
                style={{
                  display: "block",
                  margin: "6px 0",
                  padding: "12px 15px",
                  borderRadius: "12px",
                  background: "#e6f4ea",
                  color: "#333",
                  border: "1px solid #c6e2d6",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  fontSize: "13px",
                  transition: "all 0.2s",
                  lineHeight: "1.4",
                }}
                onMouseOver={(e) => {
                  e.target.style.background = "#d1e7dd";
                  e.target.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  e.target.style.background = "#e6f4ea";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                {qa.question}
              </button>
            ))}
          </div>
        )}

        {currentOptions.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
            <p>No more questions available.</p>
            <button
              onClick={handleStartOver}
              style={{
                padding: "10px 20px",
                background: "#54B58C",
                color: "white",
                border: "none",
                borderRadius: "20px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Start Over
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
