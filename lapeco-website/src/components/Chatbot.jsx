import React, { useState, useEffect, useRef } from 'react';
import { chatbotData } from '../data/chatbotData';
import { faqData } from '../data/faqData';
import './Chatbot.css';

export default function Chatbot({ onClose }) {
  // State for the chat message history
  const [messages, setMessages] = useState([]);
  // State for the currently displayed question options
  const [currentOptions, setCurrentOptions] = useState([]);
  // State to track the current "mode" (e.g., recruitment or faq)
  const [chatMode, setChatMode] = useState('recruitment');
  // State for the "bot is typing" indicator
  const [isTyping, setIsTyping] = useState(false);
  // Ref to the message area for auto-scrolling
  const messageAreaRef = useRef(null);

  // Dynamic Q&A loaded from HRMS backend (with static fallback)
  const [recruitmentItems, setRecruitmentItems] = useState([]);
  const [faqItems, setFaqItems] = useState([]);

  const refreshQAs = async () => {
    try {
      const base = 'https://api.lapeco.org/api/chatbot-qas/public';
      const [recRes, faqRes] = await Promise.all([
        fetch(base + '?type=recruitment', { cache: 'no-store' }),
        fetch(base + '?type=faq', { cache: 'no-store' })
      ]);
      const recJson = await recRes.json().catch(() => ({}));
      const faqJson = await faqRes.json().catch(() => ({}));
      const recData = Array.isArray(recJson.data) ? recJson.data.filter(i => i.active) : [];
      const faqDataArr = Array.isArray(faqJson.data) ? faqJson.data.filter(i => i.active) : [];
      setRecruitmentItems(recData);
      setFaqItems(faqDataArr);
    } catch (_) {
      // Silent fallback to static data
      setRecruitmentItems([]);
      setFaqItems([]);
    }
  };

  useEffect(() => { refreshQAs(); }, []);

  // Initializes or resets the chatbot to its starting state
  const setInitialState = () => {
    setIsTyping(true);
    // Simulate a brief delay for a more natural welcome
    setTimeout(() => {
      setMessages([
        {
          sender: 'bot',
          text: "Hello! Welcome to LAPECO's recruitment portal. How can I help you today? Please choose from the options below:",
        },
      ]);
      const source = recruitmentItems && recruitmentItems.length ? recruitmentItems : chatbotData;
      const initialOpts = source.slice(0, 8).map((qa, idx) => ({
        id: qa.id ?? idx,
        question: qa.question,
        answer: qa.answer
      }));
      setCurrentOptions(initialOpts);
      setChatMode('recruitment');
      setIsTyping(false);
    }, 800);
    refreshQAs();
  };

  // Run initial setup when the component mounts
  useEffect(() => {
    setInitialState();
  }, []);

  // Effect to auto-scroll to the latest message or typing indicator
  useEffect(() => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Handles the logic when a user clicks a question
  const handleQuestionClick = (question, answer) => {
    setMessages(prev => [...prev, { sender: 'user', text: question }]);
    
    // Don't clear options, just show the typing indicator
    setIsTyping(true);

    // Simulate the bot "thinking" before replying
    setTimeout(() => {
      setMessages(prev => [...prev, { sender: 'bot', text: answer }]);
      setIsTyping(false);
    }, 1200);
  };
  
  // Switches the chatbot to FAQ mode
  const handleShowFAQs = () => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'Of course! Here are some frequently asked questions about our company:' }
      ]);
      const source = faqItems && faqItems.length ? faqItems : faqData;
      const opts = source.map((qa, idx) => ({ id: qa.id ?? idx, question: qa.question, answer: qa.answer }));
      setCurrentOptions(opts);
      setChatMode('faq');
      setIsTyping(false);
    }, 800);
    refreshQAs();
  };

  useEffect(() => {
    if (chatMode === 'recruitment' && recruitmentItems && recruitmentItems.length) {
      const initialOpts = recruitmentItems.slice(0, 8).map((qa, idx) => ({
        id: qa.id ?? idx,
        question: qa.question,
        answer: qa.answer
      }));
      setCurrentOptions(initialOpts);
    }
  }, [recruitmentItems, chatMode]);

  useEffect(() => {
    if (chatMode === 'faq' && faqItems && faqItems.length) {
      const opts = faqItems.map((qa, idx) => ({ id: qa.id ?? idx, question: qa.question, answer: qa.answer }));
      setCurrentOptions(opts);
    }
  }, [faqItems, chatMode]);

  return (
    <div className="chatbot-container">
      <header className="chatbot-header">
        <div>
          <h3>
            <i className="bi bi-robot"></i> 
            Hi, I'm Peco!
          </h3>
          <p>LAPECO Virtual Assistant</p>
        </div>
        <button onClick={onClose} className="chatbot-close-btn" aria-label="Close chat">×</button>
      </header>

      <div className="message-area" ref={messageAreaRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}-message`}>
            <span className="avatar">
              {msg.sender === 'bot' ? <i className="bi bi-robot"></i> : <i className="bi bi-person"></i>}
            </span>
            <div className="message-content">{msg.text}</div>
          </div>
        ))}
        {isTyping && (
          <div className="message bot-message">
            <span className="avatar"><i className="bi bi-robot"></i></span>
            <div className="message-content typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </div>

      <div className="chatbot-footer">
        <div className="controls-area">
          <button onClick={handleShowFAQs} className="control-btn">
            <i className="bi bi-question-circle"></i> Explore FAQs
          </button>
          <button onClick={setInitialState} className="control-btn primary">
            <i className="bi bi-arrow-clockwise"></i> Start Over
          </button>
        </div>

        <div className="options-area">
          {currentOptions.map((qa) => (
            <button
              key={qa.id}
              onClick={() => handleQuestionClick(qa.question, qa.answer)}
              className="option-button"
            >
              <span>{qa.question}</span>
              <i className="bi bi-chevron-right icon"></i>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}