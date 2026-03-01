import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, MicOff, Volume2, VolumeX, Shield, ShieldAlert, Terminal, Loader2, Globe, ExternalLink, Radio, Bell, BellOff, Play, Pause, Square, MessageSquare } from 'lucide-react';
import Markdown from 'react-markdown';
import { generateChatResponse, generateSpeech } from '../services/geminiService';
import LiveMode from './LiveMode';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Message, ChatSession } from '../types';
import { isWakeWordDetected } from '../utils/wakeWord';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatInterfaceProps {
  session: ChatSession;
  onUpdateSession: (messages: Message[]) => void;
}

export default function ChatInterface({ session, onUpdateSession }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<number | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [showLiveMode, setShowLiveMode] = useState(false);
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(false);
  const [isContinuousListening, setIsContinuousListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [wakeWordRecognition, setWakeWordRecognition] = useState<any>(null);
  const wakeLockRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const messages = session.messages;

  const updateMessages = useCallback((newMessages: Message[]) => {
    onUpdateSession(newMessages);
  }, [onUpdateSession]);

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US'; // Default, will handle Bengali too if possible

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        handleSend(transcript);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
        // If continuous mode is on and we're not currently processing/speaking, restart
        if (isContinuousListening && !isLoading && !isSpeaking) {
          try { recognitionInstance.start(); setIsListening(true); } catch(e) {}
        }
      };

      setRecognition(recognitionInstance);

      // Initialize Wake Word Recognition
      const wakeWordInstance = new SpeechRecognition();
      wakeWordInstance.continuous = true;
      wakeWordInstance.interimResults = true;
      wakeWordInstance.lang = 'en-US';

      wakeWordInstance.onresult = (event: any) => {
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript.toLowerCase();
        
        if (isWakeWordDetected(transcript)) {
          console.log("Wake word detected!");
          setIsContinuousListening(true);
          // Feedback
          const notification = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          notification.play().catch(() => {});
          
          // Start listening immediately
          setTimeout(() => {
            try { recognition?.start(); setIsListening(true); } catch(e) {}
          }, 1000);
        }
      };

      wakeWordInstance.onend = () => {
        // Restart if still enabled
        if (isWakeWordEnabled) {
          try { wakeWordInstance.start(); } catch(e) {}
        }
      };

      setWakeWordRecognition(wakeWordInstance);
    }
  }, [isWakeWordEnabled]);

  const toggleWakeWord = async () => {
    if (isWakeWordEnabled) {
      wakeWordRecognition?.stop();
      setIsWakeWordEnabled(false);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } else {
      stopSpeaking();
      setIsWakeWordEnabled(true);
      try {
        wakeWordRecognition?.start();
        // Request Wake Lock to keep screen on
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (e) {
        console.error("Wake Word Error:", e);
      }
    }
  };

  useEffect(() => {
    if (showLiveMode && isWakeWordEnabled) {
      wakeWordRecognition?.stop();
    } else if (!showLiveMode && isWakeWordEnabled) {
      try { wakeWordRecognition?.start(); } catch(e) {}
    }
  }, [showLiveMode, isWakeWordEnabled, wakeWordRecognition]);

  useEffect(() => {
    // Auto-restart listening after AI finishes speaking if in continuous mode
    if (!isSpeaking && isContinuousListening && !isLoading && !isListening) {
      const timer = setTimeout(() => {
        try { recognition?.start(); setIsListening(true); } catch(e) {}
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, isContinuousListening, isLoading, isListening, recognition]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;
    stopSpeaking();

    const userMessage: Message = { 
      role: 'user', 
      parts: [{ text }],
      timestamp: Date.now()
    };
    
    const newMessages = [...messages, userMessage];
    updateMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await generateChatResponse(text, messages.slice(-6));
      const modelMessage: Message = { 
        role: 'model', 
        parts: [{ text: response.text }],
        groundingMetadata: response.groundingMetadata,
        timestamp: Date.now()
      };
      updateMessages([...newMessages, modelMessage]);

      if (isAudioEnabled) {
        handleSpeak(response.text, newMessages.length);
      }
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMessage: Message = { 
        role: 'model', 
        parts: [{ text: "Error: I encountered a technical issue. Please check your connection and try again." }],
        timestamp: Date.now()
      };
      updateMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = async (text: string, msgIdx?: number) => {
    const targetIdx = msgIdx !== undefined ? msgIdx : messages.length - 1;
    setCurrentlySpeakingId(targetIdx);
    setIsSpeaking(true);
    setIsPaused(false);
    try {
      const audioUrl = await generateSpeech(text);
      if (audioUrl) {
        if (audioRef.current) {
          // Revoke old URL if it exists
          if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioRef.current.src);
          }
          audioRef.current.src = audioUrl;
          audioRef.current.play();
        }
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    }
  };

  const pauseSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPaused(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
    } else {
      stopSpeaking();
      recognition?.start();
      setIsListening(true);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentlySpeakingId(null);
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto cyber-border bg-black/40 backdrop-blur-md rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
            <Shield className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h2 className="font-mono text-lg font-bold tracking-tight glow-text text-green-400">CYBERGUARD AI</h2>
            <p className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Threat Intelligence Protocol v3.1</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleWakeWord}
            title={isWakeWordEnabled ? "Disable Wake Word" : "Enable Wake Word (Listen for 'CyberGuard')"}
            className={cn(
              "p-2 rounded-lg transition-all border",
              isWakeWordEnabled ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" : "bg-white/5 border-white/10 text-white/40"
            )}
          >
            {isWakeWordEnabled ? <Bell className="w-5 h-5 animate-bounce" /> : <BellOff className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => {
              stopSpeaking();
              setShowLiveMode(true);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all group"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest hidden sm:inline">Live Mode</span>
          </button>
          <button 
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className={cn(
              "p-2 rounded-lg transition-all border border-white/10",
              isAudioEnabled ? "bg-green-500/10 text-green-400" : "bg-white/5 text-white/40"
            )}
          >
            {isAudioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-mono text-green-400 uppercase">System Online</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 cyber-grid">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60">
            <Terminal className="w-12 h-12 text-green-400/40" />
            <div className="space-y-2">
              <h3 className="font-mono text-xl text-green-400">INITIALIZING SECURE SESSION...</h3>
              <p className="text-sm max-w-md">Ask me about cyber security threats, defensive strategies, or real-time vulnerability updates. I speak English and Bengali.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-lg mt-8">
              {["Latest CVEs", "Phishing Defense", "NIST Framework", "ম্যালওয়্যার সুরক্ষা"].map((tip) => (
                <button 
                  key={tip}
                  onClick={() => handleSend(tip)}
                  className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-green-500/10 hover:border-green-500/30 transition-all text-xs font-mono text-white/70"
                >
                  {tip}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex flex-col gap-2",
                msg.role === 'user' ? "items-end" : "items-start"
              )}
            >
              <div className={cn(
                "max-w-[85%] p-4 rounded-2xl border relative group/msg",
                msg.role === 'user' 
                  ? "bg-green-500/10 border-green-500/30 text-white rounded-tr-none" 
                  : "bg-white/5 border-white/10 text-white/90 rounded-tl-none"
              )}>
                {currentlySpeakingId === idx && (
                  <div className={cn(
                    "absolute -top-2 -left-2 p-1 rounded-full shadow-[0_0_10px_rgba(0,255,0,0.5)] transition-all",
                    isPaused ? "bg-yellow-500" : "bg-green-500 animate-pulse"
                  )}>
                    {isPaused ? <Pause className="w-2 h-2 text-black" /> : <Volume2 className="w-2 h-2 text-black" />}
                  </div>
                )}
                {msg.role === 'model' && (
                  <div className={cn(
                    "absolute -right-12 top-0 flex flex-col gap-2 transition-all",
                    currentlySpeakingId === idx ? "opacity-100" : "opacity-0 group-hover/msg:opacity-100"
                  )}>
                    {currentlySpeakingId === idx ? (
                      <>
                        <button
                          onClick={() => isPaused ? resumeSpeaking() : pauseSpeaking()}
                          className="p-2 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-all"
                          title={isPaused ? "Resume" : "Pause"}
                        >
                          {isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
                        </button>
                        <button
                          onClick={stopSpeaking}
                          className="p-2 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
                          title="Stop"
                        >
                          <Square className="w-3 h-3 fill-current" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleSpeak(msg.parts[0].text, idx)}
                        className="p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-green-400 hover:bg-green-500/10 transition-all"
                        title="Play Audio"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    )}
                  </div>
                )}
                <div className="markdown-body">
                  <Markdown>{msg.parts[0].text}</Markdown>
                </div>

                {/* Grounding Metadata */}
                {msg.groundingMetadata?.groundingChunks && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-wider">
                      <Globe className="w-3 h-3" />
                      <span>Verified Intelligence Sources</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {msg.groundingMetadata.groundingChunks.map((chunk: any, cIdx: number) => (
                        chunk.web && (
                          <a 
                            key={cIdx}
                            href={chunk.web.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-green-400 hover:bg-green-500/10 transition-colors"
                          >
                            {chunk.web.title || "Source"}
                            <ExternalLink className="w-2 h-2" />
                          </a>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[9px] font-mono text-white/30 uppercase tracking-tighter">
                {msg.role === 'user' ? 'Operator' : 'CyberGuard AI'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 text-green-400/60"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[10px] font-mono uppercase tracking-widest">Analyzing Threat Vectors...</span>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/5 border-t border-white/10">
        <div className="relative flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Enter security query or command..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500/50 transition-all font-mono placeholder:text-white/20"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                onClick={() => setIsContinuousListening(!isContinuousListening)}
                title={isContinuousListening ? "Disable Continuous Listening" : "Enable Continuous Listening"}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  isContinuousListening ? "bg-green-500/20 text-green-400" : "text-white/20 hover:text-white/40"
                )}
              >
                <Radio className={cn("w-4 h-4", isContinuousListening && "animate-pulse")} />
              </button>
              <button
                onClick={toggleListening}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  isListening ? "bg-red-500/20 text-red-400 animate-pulse" : "text-white/40 hover:text-green-400"
                )}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-green-500 text-black rounded-xl hover:bg-green-400 disabled:opacity-50 disabled:hover:bg-green-500 transition-all shadow-[0_0_15px_rgba(0,255,0,0.3)]"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3 text-yellow-500" />
              <span className="text-[9px] font-mono text-white/40 uppercase">Encrypted Session</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-blue-400" />
              <span className="text-[9px] font-mono text-white/40 uppercase">Global Intelligence Active</span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-white/20 uppercase">Press Enter to Transmit</span>
        </div>
      </div>

      <audio 
        ref={audioRef} 
        onEnded={() => {
          setIsSpeaking(false);
          setIsPaused(false);
          setCurrentlySpeakingId(null);
        }} 
        className="hidden" 
      />

      <AnimatePresence>
        {showLiveMode && (
          <LiveMode 
            onClose={() => setShowLiveMode(false)} 
            isWakeWordEnabled={isWakeWordEnabled}
            onToggleWakeWord={toggleWakeWord}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
