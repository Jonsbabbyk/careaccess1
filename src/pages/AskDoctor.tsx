import React, { useState, useRef, useEffect } from 'react';
import { Mic, VolumeX, Volume2, User, MessageCircle, HelpCircle, Send, CheckCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
// These imports are from your original code. We'll use the backend for the main logic now.
// import { findBestAnswer, saveNewQuestion, getSampleQuestions, getKeywordSuggestions } from '../utils/doctorAnswers';

interface Message {
  id: string;
  type: 'user' | 'doctor';
  content: string;
  timestamp: Date;
}

const AskDoctor: React.FC = () => {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [voiceInputSuccess, setVoiceInputSuccess] = useState(false);
  const [showSamples, setShowSamples] = useState(true);
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('askDoctor_muted');
    return saved ? JSON.parse(saved) : false;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Hardcoded sample data for a cleaner, self-contained component
  const sampleQuestions = [
    "What are some common exercises for wheelchair users?",
    "Can you explain the symptoms of diabetic retinopathy?",
    "What are the benefits of using a service animal?",
    "How can I manage chronic pain with a disability?",
    "What resources are available for people with hearing loss?"
  ];

  const keywordSuggestions = [
    "Medication", "Mobility", "Vision", "Hearing", "Chronic Pain", "Mental Health", "Diet", "Exercise"
  ];

  useEffect(() => {
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (currentUtteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (voiceInputSuccess) {
      const timer = setTimeout(() => setVoiceInputSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [voiceInputSuccess]);

  useEffect(() => {
    localStorage.setItem('askDoctor_muted', JSON.stringify(isMuted));
  }, [isMuted]);

  const startVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      setIsRecording(true);
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        console.log('Voice recognition started');
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Voice input received:', transcript);
        
        if (inputText.trim()) {
          const shouldAppend = confirm(`Current text: "${inputText}"\n\nDo you want to add the new text to your existing question?\n\nClick OK to add, Cancel to replace.`);
          if (shouldAppend) {
            setInputText(prev => `${prev} ${transcript}`);
          } else {
            setInputText(transcript);
          }
        } else {
          setInputText(transcript);
        }
        
        setIsRecording(false);
        setVoiceInputSuccess(true);
        recognitionRef.current = null;
        
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        recognitionRef.current = null;
        
        let errorMessage = 'Voice recognition failed. Please try again or type your question.';
        if (event.error === 'not-allowed') {
          errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings and try again.';
        } else if (event.error === 'no-speech') {
          errorMessage = 'No speech detected. Please speak clearly and try again.';
        } else if (event.error === 'network') {
          errorMessage = 'Network error occurred. Please check your connection and try again.';
        } else if (event.error === 'audio-capture') {
          errorMessage = 'No microphone found. Please ensure a microphone is connected and try again.';
        } else if (event.error === 'aborted') {
          errorMessage = 'Voice input was cancelled.';
        }
        
        alert(errorMessage);
      };
      
      recognition.onend = () => {
        console.log('Voice recognition ended');
        setIsRecording(false);
        recognitionRef.current = null;
      };
      
      try {
        recognition.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        setIsRecording(false);
        recognitionRef.current = null;
        alert('Failed to start voice recognition. Please ensure your browser supports this feature and try again.');
      }
    } else {
      alert('Voice input is not supported in your browser. Please type your question or try using a different browser like Chrome, Edge, or Safari.');
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);
    setShowSamples(false);

    try {
      const response = await fetch('https://careease-backend-tlkz.onrender.com/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.content,
          history: messages.map(msg => ({
            type: msg.type === 'user' ? 'user' : 'model',
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const doctorResponse = data.answer;

      const doctorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'doctor',
        content: doctorResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, doctorMessage]);

      if (!isMuted) {
        speakText(doctorResponse);
      }

    } catch (error) {
      console.error('Error fetching AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'doctor',
        content: "I am sorry, I am currently unable to provide a response. Please check your network connection and try again later.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = async (text: string) => {
    if (isMuted) return;

    // First, try to get audio from the backend using ElevenLabs
    try {
      const response = await fetch('http://127.0.0.1:8000/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      // Check if the response is an audio file or a specific JSON message
      const contentType = response.headers.get("content-type");
      if (response.ok && contentType && contentType.startsWith("audio/")) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        audio.onended = () => URL.revokeObjectURL(audioUrl);
        return; // Exit if audio played successfully
      }
    } catch (error) {
      console.error('ElevenLabs TTS failed or API key not configured. Falling back to browser TTS:', error);
    }

    // Fallback to the browser's native voice if the backend failed or did not return audio
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice =>
        voice.name.includes('Natural') ||
        voice.name.includes('Enhanced') ||
        voice.lang.startsWith('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      currentUtteranceRef.current = utterance;
      utterance.onend = () => currentUtteranceRef.current = null;
      utterance.onerror = () => currentUtteranceRef.current = null;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (newMutedState && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      currentUtteranceRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSampleQuestionClick = (question: string) => {
    setInputText(question);
    setShowSamples(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeywordClick = (keyword: string) => {
    const currentText = inputText.trim();
    const newText = currentText ? `${currentText} ${keyword}` : keyword;
    setInputText(newText);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mr-4 ${
            theme === 'high-contrast' ? 'bg-white text-black' : 'bg-teal-100 text-teal-600'
          }`}>
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Ask Dr. CareEase</h1>
            <p className={`text-lg ${
              theme === 'dark' ? 'text-gray-300' : theme === 'high-contrast' ? 'text-gray-200' : 'text-gray-600'
            }`}>
              Virtual Health Assistant for Disability-Related Questions
            </p>
            <div className="flex items-center gap-4">
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : theme === 'high-contrast' ? 'text-gray-300' : 'text-gray-500'
              }`}>
                Status: {isOnline ? '🟢 Online' : '🔴 Offline'} | All conversations are private and secure
              </p>
              <button
                onClick={toggleMute}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors ${
                  theme === 'high-contrast' 
                    ? 'bg-white text-black hover:bg-gray-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-label={isMuted ? "Unmute voice responses" : "Mute voice responses"}
                aria-pressed={isMuted}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{isMuted ? 'Muted' : 'Voice On'}</span>
              </button>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowHelp(!showHelp)}
          aria-label="Show help information"
          className={`p-3 rounded-full text-2xl ${
            theme === 'high-contrast' ? 'bg-white text-black' : 'text-teal-600 hover:bg-teal-100'
          }`}
        >
          <HelpCircle className="w-8 h-8" />
        </button>
      </div>

      {showHelp && (
        <div className={`mb-6 p-6 rounded-lg ${
          theme === 'high-contrast' ? 'bg-gray-900 border border-white' : 
          theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
        }`}>
          <h2 className="text-2xl font-semibold mb-4">How to use Dr. CareEase</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ul className="list-disc list-inside space-y-2">
              <li>Ask questions about disability-related health topics</li>
              <li>Use voice input by clicking the large microphone button</li>
              <li>Click on sample questions below to get started quickly</li>
              <li>Use keyword suggestions to help form your questions</li>
            </ul>
            <ul className="list-disc list-inside space-y-2">
              <li>All responses are automatically read aloud (unless muted)</li>
              <li>The assistant works best with an active internet connection</li>
              <li>Your conversations help improve the system</li>
              <li>Always consult healthcare providers for medical decisions</li>
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className={`mb-6 p-6 rounded-lg text-center ${
            theme === 'high-contrast' ? 'bg-gray-900 border border-white' : 
            theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md'
          }`}>
            <div className={`w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center ${
              theme === 'high-contrast' ? 'bg-white text-black' : 'bg-teal-100 text-teal-600'
            }`}>
              <User className="w-16 h-16" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Dr. CareEase</h3>
            <p className="text-lg">
              Hello! I'm here to help answer your disability-related health questions. 
              I can provide information, guidance, and support for various health concerns.
            </p>
          </div>

          <div className={`h-96 overflow-y-auto p-6 rounded-lg mb-6 ${
            theme === 'high-contrast' ? 'bg-gray-900 border border-white' : 
            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
          }`}>
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className={`w-20 h-20 mx-auto mb-4 ${
                  theme === 'high-contrast' ? 'text-white' : 'text-gray-400'
                }`} />
                <p className={`text-xl ${theme === 'dark' ? 'text-gray-300' : theme === 'high-contrast' ? 'text-gray-200' : 'text-gray-600'}`}>
                  Start a conversation by asking a health-related question
                </p>
                <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : theme === 'high-contrast' ? 'text-gray-300' : 'text-gray-500'}`}>
                  Use the sample questions below or type your own
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-md px-6 py-4 rounded-lg ${
                      message.type === 'user'
                        ? (theme === 'high-contrast' ? 'bg-white text-black' : 'bg-teal-600 text-white')
                        : (theme === 'high-contrast' ? 'bg-gray-800 text-white border border-white' : 
                          theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-800 shadow')
                    }`}>
                      {message.type === 'doctor' && (
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <User className="w-5 h-5 mr-2" />
                            <span className="font-semibold">Dr. CareEase</span>
                          </div>
                          <button
                            onClick={() => speakText(message.content)}
                            className={`p-2 rounded-full transition-colors ${
                              theme === 'high-contrast' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                            }`}
                            aria-label="Play audio of this response"
                            disabled={isMuted}
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
                        message.type === 'user' ? 'text-teal-100' : 'text-gray-500'
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
                        <User className="w-5 h-5 mr-2" />
                        <span className="font-semibold">Dr. CareEase</span>
                      </div>
                      <p className="text-base">Thinking about your question...</p>
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
            )}
          </div>

          <div className={`p-6 rounded-lg ${
            theme === 'high-contrast' ? 'bg-gray-900 border border-white' : 
            theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md'
          }`}>
            {voiceInputSuccess && (
              <div className={`mb-4 p-3 rounded-lg flex items-center ${
                theme === 'high-contrast' ? 'bg-white text-black' : 'bg-green-100 text-green-800'
              }`}>
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">✅ Voice input received successfully!</span>
              </div>
            )}
            
            <div className="flex space-x-3">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about your health concerns, disability-related questions, or type your symptoms..."
                rows={4}
                className={`flex-1 p-4 rounded-md resize-none text-lg ${
                  theme === 'high-contrast' 
                    ? 'bg-black text-white border border-white focus:ring-2 focus:ring-white' 
                    : theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-teal-500'
                      : 'border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500'
                }`}
                disabled={isProcessing}
                aria-label="Type your health question here"
              />
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => {
                    if (isRecording) {
                      stopVoiceInput();
                    } else {
                      startVoiceInput();
                    }
                  }}
                  disabled={isProcessing}
                  className={`p-4 rounded-md text-xl transition-colors ${
                    isRecording
                      ? (theme === 'high-contrast' ? 'bg-white text-black animate-pulse' : 'bg-red-500 text-white animate-pulse')
                      : (theme === 'high-contrast' ? 'bg-white text-black hover:bg-gray-200' : 'bg-teal-600 text-white hover:bg-teal-700')
                  } disabled:opacity-50`}
                  aria-label={isRecording ? "Stop recording your voice..." : "Click to use voice input"}
                >
                  {isRecording ? (
                    <VolumeX className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isProcessing}
                  className={`p-4 rounded-md text-xl transition-colors ${
                    !inputText.trim() || isProcessing
                      ? (theme === 'high-contrast' ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                      : (theme === 'high-contrast' ? 'bg-white text-black hover:bg-gray-200' : 'bg-teal-600 text-white hover:bg-teal-700')
                  }`}
                  aria-label="Send your message"
                >
                  <Send className="w-8 h-8" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {showSamples && (
            <div className={`p-6 rounded-lg ${
              theme === 'high-contrast' ? 'bg-gray-900 border border-white' : 
              theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md'
            }`}>
              <h3 className="text-xl font-semibold mb-4">Sample Questions</h3>
              <p className={`text-sm mb-4 ${
                theme === 'dark' ? 'text-gray-300' : theme === 'high-contrast' ? 'text-gray-200' : 'text-gray-600'
              }`}>
                Click on any question to get started:
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sampleQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSampleQuestionClick(question)}
                    className={`w-full text-left p-3 rounded-md text-sm transition-colors ${
                      theme === 'high-contrast' 
                        ? 'bg-gray-800 text-white border border-white hover:bg-gray-700' 
                        : theme === 'dark'
                          ? 'bg-gray-700 text-white hover:bg-gray-600'
                          : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
                    }`}
                    aria-label={`Ask: ${question}`}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`p-6 rounded-lg ${
            theme === 'high-contrast' ? 'bg-gray-900 border border-white' : 
            theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md'
          }`}>
            <h3 className="text-xl font-semibold mb-4">Health Keywords</h3>
            <p className={`text-sm mb-4 ${
              theme === 'dark' ? 'text-gray-300' : theme === 'high-contrast' ? 'text-gray-200' : 'text-gray-600'
            }`}>
              Click to add keywords to your question:
            </p>
            <div className="flex flex-wrap gap-2">
              {keywordSuggestions.map((keyword, index) => (
                <button
                  key={index}
                  onClick={() => handleKeywordClick(keyword)}
                  className={`px-3 py-2 rounded-full text-sm transition-colors ${
                    theme === 'high-contrast' 
                      ? 'bg-white text-black hover:bg-gray-200' 
                      : theme === 'dark'
                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                        : 'bg-teal-100 text-teal-800 hover:bg-teal-200'
                  }`}
                  aria-label={`Add keyword: ${keyword}`}
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>

          <div className={`p-6 rounded-lg ${
            theme === 'high-contrast' ? 'bg-gray-900 border border-white' : 
            theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md'
          }`}>
            <h3 className="text-xl font-semibold mb-4">Accessibility Features</h3>
            <ul className={`space-y-2 text-sm ${
              theme === 'dark' ? 'text-gray-300' : theme === 'high-contrast' ? 'text-gray-200' : 'text-gray-600'
            }`}>
              <li>🎤 Voice input for hands-free typing</li>
              <li>🔊 Automatic audio responses (with mute option)</li>
              <li>🔍 High contrast mode available</li>
              <li>⌨️ Full keyboard navigation</li>
              <li>📱 Mobile-friendly interface</li>
            </ul>
          </div>
        </div>
      </div>

      <div className={`mt-8 p-6 rounded-lg text-base ${
        theme === 'high-contrast' ? 'bg-gray-900 border border-white' : 
        theme === 'dark' ? 'bg-gray-700' : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <p className={`font-semibold mb-2 ${theme === 'high-contrast' ? 'text-white' : theme === 'dark' ? 'text-yellow-200' : 'text-yellow-800'}`}>
          🏥 Important Medical Disclaimer:
        </p>
        <p className={theme === 'high-contrast' ? 'text-gray-200' : theme === 'dark' ? 'text-gray-300' : 'text-yellow-700'}>
          This virtual assistant provides general health information only and is not a substitute for professional medical advice, diagnosis, or treatment. 
          Always consult with qualified healthcare providers for medical decisions and urgent health concerns. If you're experiencing a medical emergency, 
          call emergency services immediately.
        </p>
      </div>
    </div>
  );
};

export default AskDoctor;