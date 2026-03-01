import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, VolumeX, Shield, Loader2, X, Radio, Waves, Bell, BellOff } from 'lucide-react';
import { connectLive } from '../services/geminiService';
import { isWakeWordDetected } from '../utils/wakeWord';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LiveModeProps {
  onClose: () => void;
  isWakeWordEnabled: boolean;
  onToggleWakeWord: () => void;
}

export default function LiveMode({ onClose, isWakeWordEnabled, onToggleWakeWord }: LiveModeProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wakeWordRecognition, setWakeWordRecognition] = useState<any>(null);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  const stopAudio = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  const playNextChunk = useCallback(() => {
    if (audioQueueRef.current.length === 0 || !audioContextRef.current) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;
    const audioBuffer = audioContextRef.current.createBuffer(1, chunk.length, 24000);
    audioBuffer.getChannelData(0).set(chunk);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => playNextChunk();
    source.start();
  }, []);

  const startLiveSession = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Setup Audio Context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = connectLive({
        onopen: () => {
          setIsConnected(true);
          setIsConnecting(false);
          
          // Start sending audio
          const source = audioContextRef.current!.createMediaStreamSource(stream);
          sourceRef.current = source;
          
          const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            // Convert to 16-bit PCM
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
            }
            
            // Convert to base64
            const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
            
            sessionPromise.then(session => {
              session.sendRealtimeInput({
                media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
              });
            });
          };

          source.connect(processor);
          processor.connect(audioContextRef.current!.destination);
        },
        onmessage: (message) => {
          if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
            const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const pcmData = new Int16Array(bytes.buffer);
            const floatData = new Float32Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) {
              floatData[i] = pcmData[i] / 0x7FFF;
            }
            
            audioQueueRef.current.push(floatData);
            if (!isPlayingRef.current) {
              playNextChunk();
            }
          }

          if (message.serverContent?.interrupted) {
            setIsInterrupted(true);
            audioQueueRef.current = [];
            setTimeout(() => setIsInterrupted(false), 1000);
          }
        },
        onerror: (err) => {
          console.error("Live Session Error:", err);
          setError("Connection lost. Please try again.");
          setIsConnected(false);
          setIsConnecting(false);
        },
        onclose: () => {
          setIsConnected(false);
          setIsConnecting(false);
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start live session:", err);
      setError("Microphone access denied or connection failed.");
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const wakeWordInstance = new SpeechRecognition();
      wakeWordInstance.continuous = true;
      wakeWordInstance.interimResults = true;
      wakeWordInstance.lang = 'en-US';

      wakeWordInstance.onresult = (event: any) => {
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript.toLowerCase();
        
        if (isWakeWordDetected(transcript)) {
          console.log("Wake word detected in Live Mode!");
          // Visual feedback
          setIsInterrupted(true);
          setTimeout(() => setIsInterrupted(false), 500);
          
          const notification = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          notification.play().catch(() => {});
        }
      };

      wakeWordInstance.onend = () => {
        if (isWakeWordEnabled) {
          try { wakeWordInstance.start(); } catch(e) {}
        }
      };

      setWakeWordRecognition(wakeWordInstance);
    }
  }, [isWakeWordEnabled]);

  useEffect(() => {
    if (isWakeWordEnabled && isConnected) {
      try { wakeWordRecognition?.start(); } catch(e) {}
    } else {
      wakeWordRecognition?.stop();
    }
    return () => wakeWordRecognition?.stop();
  }, [isWakeWordEnabled, isConnected, wakeWordRecognition]);

  useEffect(() => {
    startLiveSession();
    return () => {
      stopAudio();
      sessionRef.current?.close();
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
    >
      <div className="relative w-full max-w-lg p-8 rounded-3xl border border-green-500/30 bg-black/60 shadow-[0_0_50px_rgba(0,255,0,0.15)] overflow-hidden">
        {/* Animated Background Waves */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute inset-0 cyber-grid" />
          {isConnected && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="w-64 h-64 rounded-full bg-green-500/20 blur-3xl"
              />
            </div>
          )}
        </div>

        <div className="absolute top-6 left-6 flex items-center gap-2">
          <button 
            onClick={onToggleWakeWord}
            title={isWakeWordEnabled ? "Disable Wake Word" : "Enable Wake Word (Listen for 'CyberGuard')"}
            className={cn(
              "p-2 rounded-full transition-all border",
              isWakeWordEnabled ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" : "bg-white/5 border-white/10 text-white/40"
            )}
          >
            {isWakeWordEnabled ? <Bell className="w-4 h-4 animate-bounce" /> : <BellOff className="w-4 h-4" />}
          </button>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative flex flex-col items-center text-center space-y-8">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Radio className={cn("w-4 h-4", isConnected ? "text-green-400 animate-pulse" : "text-white/20")} />
              <h2 className="font-mono text-sm font-bold tracking-[0.3em] text-white/40 uppercase">Live Intelligence Link</h2>
            </div>
            <h1 className="text-3xl font-bold tracking-tight glow-text text-white">
              {isConnected ? "Devil Cyber Guard AI is Listening" : isConnecting ? "Establishing Link..." : "Link Offline"}
            </h1>
          </div>

          {/* Visualizer */}
          <div className="h-32 flex items-center justify-center gap-1">
            {isConnected ? (
              Array.from({ length: 24 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    height: isInterrupted ? [4, 4] : [8, Math.random() * 60 + 10, 8],
                  }}
                  transition={{ 
                    duration: 0.5, 
                    repeat: Infinity, 
                    delay: i * 0.05 
                  }}
                  className={cn(
                    "w-1 rounded-full",
                    isInterrupted ? "bg-red-500/40" : "bg-green-500/60"
                  )}
                />
              ))
            ) : (
              <div className="flex flex-col items-center gap-4">
                {isConnecting ? (
                  <Loader2 className="w-12 h-12 text-green-400 animate-spin" />
                ) : (
                  <Shield className="w-16 h-16 text-white/10" />
                )}
              </div>
            )}
          </div>

          <div className="space-y-6 w-full">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-sm text-white/60 leading-relaxed italic">
                {isConnected 
                  ? "Speak naturally. I will respond in real-time. You can interrupt me at any time." 
                  : error || "Initializing secure voice channel..."}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-500",
                  isConnected ? "bg-green-500/20 border-green-500 shadow-[0_0_20px_rgba(0,255,0,0.4)]" : "bg-white/5 border-white/10"
                )}>
                  <Mic className={cn("w-8 h-8", isConnected ? "text-green-400" : "text-white/20")} />
                </div>
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Operator</span>
              </div>

              <div className="w-12 h-[1px] bg-white/10 relative">
                {isConnected && (
                  <motion.div 
                    animate={{ left: ["0%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-400 blur-[2px]"
                  />
                )}
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-500",
                  isConnected ? "bg-blue-500/20 border-blue-500 shadow-[0_0_20px_rgba(0,100,255,0.4)]" : "bg-white/5 border-white/10"
                )}>
                  <Waves className={cn("w-8 h-8", isConnected ? "text-blue-400" : "text-white/20")} />
                </div>
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Devil Cyber Guard</span>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="w-full py-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs uppercase tracking-[0.2em] hover:bg-red-500/20 transition-all"
            >
              Terminate Session
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
