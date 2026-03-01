import React, { useState, useEffect, useCallback } from 'react';
import ChatInterface from './components/ChatInterface';
import SecurityGuidelines from './components/SecurityGuidelines';
import { Shield, ShieldCheck, ShieldAlert, Activity, Cpu, Lock, Terminal, Zap, Globe, AlertTriangle, Plus, MessageSquare, Trash2, Clock, Loader2, Filter, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Message, ChatSession } from './types';
import { fetchRecentCVEs, ThreatAlert } from './services/threatService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STORAGE_KEY = 'cyberguard_sessions';

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [threatAlerts, setThreatAlerts] = useState<ThreatAlert[]>([]);
  const [isThreatsLoading, setIsThreatsLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [showSecurityGuidelines, setShowSecurityGuidelines] = useState(false);

  // Load sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to parse saved sessions", e);
      }
    }
  }, []);

  // Fetch threat intelligence
  const updateThreats = useCallback(async () => {
    setIsThreatsLoading(true);
    try {
      const alerts = await fetchRecentCVEs();
      if (alerts.length > 0) {
        setThreatAlerts(alerts);
      }
    } catch (e) {
      console.error("Failed to fetch threats", e);
    } finally {
      setIsThreatsLoading(false);
    }
  }, []);

  useEffect(() => {
    updateThreats();
    // Refresh threats every 5 minutes
    const interval = setInterval(updateThreats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [updateThreats]);

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Investigation',
      messages: [],
      lastUpdated: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, []);

  const updateActiveSession = useCallback((messages: Message[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        // Update title based on first message if it's still default
        let title = s.title;
        if (title === 'New Investigation' && messages.length > 0) {
          title = messages[0].parts[0].text.substring(0, 30) + (messages[0].parts[0].text.length > 30 ? '...' : '');
        }
        return { ...s, messages, title, lastUpdated: Date.now() };
      }
      return s;
    }));
  }, [activeSessionId]);

  const deleteSession = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  }, [activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // If no sessions, create one
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    }
  }, [sessions.length, createNewSession]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-green-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full cyber-grid opacity-20" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col h-screen max-h-screen">
        {/* Navigation / Top Bar */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-green-400" />
              <h1 className="font-mono text-xl font-bold tracking-tighter glow-text">DEVIL CYBER GUARD <span className="text-green-400">AI</span></h1>
            </div>
            <div className="h-4 w-[1px] bg-white/10 mx-2" />
            <div className="flex items-center gap-4 text-[10px] font-mono text-white/40 uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-green-400" />
                <span>Threat Level: Low</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-blue-400" />
                <span>Core: Gemini 3.1 Pro</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-[11px] font-mono text-white/60 uppercase tracking-wider">
              <a href="#" className="hover:text-green-400 transition-colors">Intelligence</a>
              <a href="#" className="hover:text-green-400 transition-colors">Vulnerabilities</a>
              <button 
                onClick={() => setShowSecurityGuidelines(true)}
                className="hover:text-green-400 transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-3 h-3" />
                Guidelines
              </button>
              <a href="#" className="hover:text-green-400 transition-colors">About</a>
            </nav>
            <button className="px-4 py-1.5 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 text-[11px] font-mono uppercase tracking-wider hover:bg-green-500/20 transition-all">
              Secure Login
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex overflow-hidden p-4 gap-4">
          {/* Left Sidebar - Chat History */}
          <aside className="hidden lg:flex flex-col w-72 gap-4 overflow-y-auto">
            <button 
              onClick={createNewSession}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-green-500/30 bg-green-500/5 text-green-400 hover:bg-green-500/10 transition-all group"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              <span className="text-xs font-mono uppercase tracking-widest">New Investigation</span>
            </button>

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
              <h3 className="px-2 text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Past Interactions</h3>
              <AnimatePresence initial={false}>
                {sessions.map((s) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onClick={() => setActiveSessionId(s.id)}
                    className={`group flex flex-col gap-1 p-3 rounded-xl border cursor-pointer transition-all ${
                      activeSessionId === s.id 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : 'bg-white/5 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare className={`w-3 h-3 flex-shrink-0 ${activeSessionId === s.id ? 'text-green-400' : 'text-white/40'}`} />
                        <span className={`text-xs font-mono truncate ${activeSessionId === s.id ? 'text-white' : 'text-white/60'}`}>
                          {s.title}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => deleteSession(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-[8px] font-mono text-white/20 uppercase">
                      <Clock className="w-2 h-2" />
                      <span>{new Date(s.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-widest">System Status</h3>
                <Zap className="w-3 h-3 text-yellow-400" />
              </div>
              <div className="space-y-3">
                {[
                  { label: "Firewall", status: "Active", color: "text-green-400" },
                  { label: "IDS/IPS", status: "Monitoring", color: "text-blue-400" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-white/60 font-mono">{item.label}</span>
                    <span className={`text-[10px] font-mono uppercase ${item.color}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Center - Chat Interface */}
          <section className="flex-1 flex flex-col min-w-0">
            {activeSession ? (
              <ChatInterface 
                key={activeSession.id}
                session={activeSession} 
                onUpdateSession={updateActiveSession} 
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
              </div>
            )}
          </section>

          {/* Right Sidebar - Global Intel */}
          <aside className="hidden xl:flex flex-col w-72 gap-4 overflow-y-auto">
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3 h-3 text-white/40" />
                    <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Recent Alerts</h3>
                    {isThreatsLoading && <Loader2 className="w-2.5 h-2.5 text-green-400 animate-spin" />}
                  </div>
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                </div>
                
                {/* Filter UI */}
                <div className="flex flex-wrap gap-1.5">
                  <button 
                    onClick={() => setSeverityFilter(null)}
                    className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase transition-all border ${
                      severityFilter === null 
                        ? 'bg-white/10 border-white/20 text-white' 
                        : 'bg-transparent border-white/5 text-white/30 hover:border-white/10'
                    }`}
                  >
                    All
                  </button>
                  {['Critical', 'High', 'Medium', 'Low'].map((sev) => (
                    <button 
                      key={sev}
                      onClick={() => setSeverityFilter(sev)}
                      className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase transition-all border ${
                        severityFilter === sev 
                          ? cn(
                              "border-opacity-50",
                              sev === 'Critical' ? "bg-red-500/20 border-red-500 text-red-400" :
                              sev === 'High' ? "bg-orange-500/20 border-orange-500 text-orange-400" :
                              sev === 'Medium' ? "bg-yellow-500/20 border-yellow-500 text-yellow-400" :
                              "bg-blue-500/20 border-blue-500 text-blue-400"
                            )
                          : 'bg-transparent border-white/5 text-white/30 hover:border-white/10'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {threatAlerts.filter(a => !severityFilter || a.severity === severityFilter).length > 0 ? (
                  threatAlerts
                    .filter(a => !severityFilter || a.severity === severityFilter)
                    .map((alert, i) => (
                      <div key={i} className="space-y-1 group/alert cursor-help">
                      <div className="flex items-center justify-between">
                        <a 
                          href={alert.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] font-mono text-white/80 truncate hover:text-green-400 transition-colors"
                        >
                          {alert.title}
                        </a>
                        <span className="text-[8px] font-mono text-white/30">{alert.timestamp}</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            alert.severity === 'Critical' ? 'bg-red-500' : 
                            alert.severity === 'High' ? 'bg-orange-500' : 
                            alert.severity === 'Medium' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`} 
                          style={{ width: alert.severity === 'Critical' ? '100%' : alert.severity === 'High' ? '75%' : alert.severity === 'Medium' ? '50%' : '25%' }}
                        />
                      </div>
                      <p className="text-[8px] text-white/20 line-clamp-1 group-hover/alert:line-clamp-none transition-all">
                        {alert.summary}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-[10px] font-mono text-white/20 uppercase">No active alerts</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Global Intelligence</h3>
                <Globe className="w-3 h-3 text-blue-400" />
              </div>
              <div className="space-y-4">
                {[
                  { country: "USA", activity: "Elevated", color: "bg-orange-500" },
                  { country: "Bangladesh", activity: "Normal", color: "bg-green-500" },
                ].map((intel) => (
                  <div key={intel.country} className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${intel.color}`} />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-xs text-white/70 font-mono">{intel.country}</span>
                      <span className="text-[9px] font-mono text-white/30 uppercase">{intel.activity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-4">
              <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Security Protocols</h3>
              <div className="space-y-2">
                {["NIST SP 800-53", "ISO/IEC 27001", "BGD e-GOV CIRT"].map((protocol) => (
                  <div key={protocol} className="p-2 rounded bg-black/20 border border-white/5 hover:border-green-500/30 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-white/60 group-hover:text-green-400">{protocol}</span>
                      <Terminal className="w-2.5 h-2.5 text-white/20 group-hover:text-green-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </main>

        {/* Footer / Status Bar */}
        <footer className="h-8 border-t border-white/10 flex items-center justify-between px-6 bg-black/60 text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span>Secure Connection Established</span>
            </div>
            <span>Latency: 42ms</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Uptime: 99.99%</span>
            <span>© 2026 Devil Cyber Guard Intelligence Agency</span>
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {showSecurityGuidelines && (
          <SecurityGuidelines onClose={() => setShowSecurityGuidelines(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
