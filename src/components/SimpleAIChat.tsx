import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Mic, VolumeX, Volume2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const API_BASE_URL = 'https://careease-backend-tlkz.onrender.com'; // Change to your backend URL if different

const SimpleAIChat: React.FC = () => {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'ai',
        content: "Hello! I'm Dr. CareEase, a virtual health assistant. I can help answer general questions about health, disabilities, and wellness. How can I help you today?",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const getHistoryForAPI = () => {
    return messages.map(msg => ({
      type: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));
  };

  const speakText = async (text: string) => {
    if (isMuted) return;

    try {
      setIsSpeaking(true);
      const response = await fetch(`${API_BASE_URL}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('TTS API request failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        audioRef.current.onended = () => {
          setIsSpeaking(false);
        };
      } else {
        const audio = new Audio(audioUrl);
        audio.play();
        audio.onended = () => {
          setIsSpeaking(false);
        };
        audioRef.current = audio;
      }
    } catch (error) {
      console.error('Error with TTS:', error);
      setIsSpeaking(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ask-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.content,
          history: getHistoryForAPI(),
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.answer,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      speakText(aiMessage.content);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I'm sorry, I'm currently unable to provide a response. Please check your network connection and try again later.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStarterClick = (starter: string) => {
    setInputText(starter);
    handleSendMessage();
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsSpeaking(false);
    }
  };

  const conversationStarters = [
    "What is Dr. CareEase's purpose?",
    "What are some common mobility aids?",
    "How can I manage chronic pain?",
    "What are some benefits of physical therapy?",
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mr-4 ${
            theme === 'high-contrast' ? 'bg-white text-black' : 'bg-purple-100 text-purple-600'
          }`}>
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Dr. CareEase</h1>
            <p className={`text-lg ${
              theme === 'dark' ? 'text-gray-300' : theme === 'high-contrast' ? 'text-gray-200' : 'text-gray-600'
            }`}>
              Virtual Health Assistant
            </p>
            <div className="flex items-center gap-4">
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : theme === 'high-contrast' ? 'text-gray-300' : 'text-gray-500'
              }`}>
                🌐 Online API | 🤖 Groq LLM | 💬 ElevenLabs TTS
              </p>
              <button
                onClick={toggleMute}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors ${
                  theme === 'high-contrast' 
                    ? 'bg-white text-black hover:bg-gray-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-label={isMuted ? "Unmute voice responses" : "Mute voice responses"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{isMuted ? 'Muted' : 'Voice On'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chat Area */}
        <div className="lg:col-span-2">
          {/* Messages */}
          <div className={`h-96 overflow-y-auto p-6 rounded-lg mb-6 ${
            theme === 'high-contrast' ? 'bg-gray-900 border border-white' : 
            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
          }`}>
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-md px-6 py-4 rounded-lg ${
                    message.type === 'user'
                      ? (theme === 'high-contrast' ? 'bg-white text-black' : 'bg-purple-600 text-white')
                      : (theme === 'high-contrast' ? 'bg-gray-800 text-white border border-white' : 
                          theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-800 shadow')
                  }`}>
                    {message.type === 'ai' && (
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <Bot className="w-5 h-5 mr-2" />
                          <span className="font-semibold">Dr. CareEase</span>
                        </div>
                        <button
                          onClick={() => speakText(message.content)}
                          className={`p-1 rounded-full transition-colors ${
                            isSpeaking ? 'text-purple-500' : ''
                          } ${
                            theme === 'high-contrast' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                          }`}
                          aria-label="Play audio of this response"
                          disabled={isMuted || isSpeaking}
                        >
                          {isMuted ? (
                            <VolumeX className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                    <p className="text-base leading-relaxed">{message.content}</p>
                    <p className={`text-xs mt-2 ${
                      message.type === 'user' ? 'text-purple-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className={`max-w-md px-6 py-4 rounded-lg ${
                    theme === 'high-contrast' ? 'bg-gray-800 text-white border border-white' : 
                    theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-800 shadow'
                  }`}>
                    <div className="flex items-center mb-2">
                      <Bot className="w-5 h-5 mr-2" />
                      <span className="font-semibold">Dr. CareEase</span>
                    </div>
                    <p className="text-base">Thinking...</p>
                    <div className="flex space-x-1 mt-3">
                      <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className={`p-6 rounded-lg ${
            theme === 'high-contrast' ? 'bg-gray-900 border border-white' : 
            theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md'
          }`}>
            <div className="flex space-x-3">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Dr. CareEase a question..."
                rows={3}
                className={`flex-1 p-4 rounded-md resize-none text-lg ${
                  theme === 'high-contrast' 
                    ? 'bg-black text-white border border-white focus:ring-2 focus:ring-white' 
                    : theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-purple-500'
                      : 'border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500'
                }`}
                disabled={isProcessing}
                aria-label="Type your message here"
              />
              <div className="flex flex-col space-y-3">
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isProcessing}
                  className={`p-4 rounded-md text-xl transition-colors ${
                    !inputText.trim() || isProcessing
                      ? (theme === 'high-contrast' ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                      : (theme === 'high-contrast' ? 'bg-white text-black hover:bg-gray-200' : 'bg-purple-600 text-white hover:bg-purple-700')
                  }`}
                  aria-label="Send message"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Conversation Starters */}
          <div className={`p-6 rounded-lg ${
            theme === 'high-contrast' ? 'bg-gray-900 border border-white' : 
            theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md'
          }`}>
            <h3 className="text-xl font-semibold mb-4">Conversation Starters</h3>
            <p className={`text-sm mb-4 ${
              theme === 'dark' ? 'text-gray-300' : theme === 'high-contrast' ? 'text-gray-200' : 'text-gray-600'
            }`}>
              Click on any topic to get started:
            </p>
            <div className="space-y-2">
              {conversationStarters.map((starter, index) => (
                <button
                  key={index}
                  onClick={() => handleStarterClick(starter)}
                  className={`w-full text-left p-3 rounded-md text-sm transition-colors ${
                    theme === 'high-contrast' 
                      ? 'bg-gray-800 text-white border border-white hover:bg-gray-700' 
                      : theme === 'dark'
                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                        : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
                  }`}
                  aria-label={`Ask: ${starter}`}
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>

          {/* AI Features */}
          <div className={`p-6 rounded-lg ${
            theme === 'high-contrast' ? 'bg-gray-900 border border-white' : 
            theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md'
          }`}>
            <h3 className="text-xl font-semibold mb-4">AI Features</h3>
            <ul className={`space-y-2 text-sm ${
              theme === 'dark' ? 'text-gray-300' : theme === 'high-contrast' ? 'text-gray-200' : 'text-gray-600'
            }`}>
              <li>🌐 Online API Communication</li>
              <li>🤖 Groq LLM Integration</li>
              <li>🔊 ElevenLabs Text-to-Speech</li>
              <li>💬 Conversation History Support</li>
              <li>♿ Accessibility-first design</li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div className={`p-4 rounded-lg text-sm ${
            theme === 'high-contrast' ? 'bg-gray-900 border border-white' : 
            theme === 'dark' ? 'bg-yellow-900 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className={`font-semibold mb-2 ${
              theme === 'high-contrast' ? 'text-white' : theme === 'dark' ? 'text-yellow-200' : 'text-yellow-800'
            }`}>
              ⚠️ AI Disclaimer:
            </p>
            <p className={theme === 'high-contrast' ? 'text-gray-200' : theme === 'dark' ? 'text-yellow-100' : 'text-yellow-700'}>
              This is a simple rule-based AI assistant for general information only. 
              It cannot replace professional medical advice. Always consult healthcare providers for medical decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleAIChat;