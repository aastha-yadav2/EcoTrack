import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, X, RefreshCw, User, Brain } from "lucide-react";
import { ChatMessage, Activity } from "../types";
import { EcoTrackAPI } from "../services/api";

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  score: number;
  onPostAddActivityMessage?: (activityStub: string) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  isOpen,
  onClose,
  activities,
  score,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "wel-1",
      role: "model",
      content: `Hello! I am your **EcoTrack AI Sustainability Advisor**. 🌿

Analyzing your carbon parameters, you currently rank with a score of **${score}/100**.

How can I help you optimize your daily transport commute, lower home electrical draw, or establish plant-based meal routines today?`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const quickSuggestions = [
    "How is my sustainability score computed?",
    "Suggest simple actions to lower electricity carbon",
    "Compare my transport vs global targets",
    "What are the best seasonal vegetables?"
  ];

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsLoading(true);

    try {
      const historyContext = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content
      }));

      const data = await EcoTrackAPI.sendChatMessage({
        message: text,
        history: historyContext,
        stats: {
          currentScore: score,
          totalActivitiesLoggedCount: activities.length
        }
      });
      
      const modelMsg: ChatMessage = {
        id: `mod-${Date.now()}`,
        role: "model",
        content: data.reply || "I am currently adjusting carbon weights. Ask me again shortly!",
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "model",
        content: "⚠️ I had a temporary issue fetching data through the eco-grid. Please check your network connection or verify key configurations in Settings.",
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 w-full max-w-md z-50 flex flex-col glass-panel-dark text-slate-100 shadow-2xl border-l border-emerald-500/15 animate-in slide-in-from-right duration-300"
      id="ai-assistant-drawer"
      role="dialog"
      aria-label="EcoTrack AI Co-pilot Support Interface"
    >
      {/* Header element */}
      <div className="p-4 border-b border-slate-700/60 bg-slate-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
          <div>
            <h3 className="font-display font-semibold text-sm tracking-wide text-emerald-400">
              EcoTrack Copilot
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Powered by Gemini Flash 3.5
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close Assistant Panel"
          className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages viewport */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        id="chat-messages-container"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                msg.role === "user"
                  ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-300"
                  : "bg-slate-800/40 border-slate-700 text-teal-400"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
            </div>
            
            <div className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
              msg.role === "user"
                ? "bg-emerald-600/90 text-white rounded-tr-none shadow-md"
                : "bg-slate-800/60 text-slate-200 rounded-tl-none border border-slate-700/40 shadow-sm"
              }`}
            >
              <div className="whitespace-pre-line prose prose-invert font-sans">
                {msg.content}
              </div>
              <span className="block text-[9px] text-slate-400 mt-1.5 text-right font-mono">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex gap-2.5 flex-row">
            <div className="w-7 h-7 rounded-lg bg-slate-800/40 border border-slate-700 text-teal-400 flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="bg-slate-800/30 text-slate-400 rounded-2xl rounded-tl-none border border-slate-700/20 p-3.5 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
              <span className="font-mono text-[10px] ml-1">Analyzing parameters...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion list */}
      {messages.length === 1 && (
        <div className="px-4 py-2 border-t border-slate-800/50 bg-slate-900/10 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold font-display">
            Quick Queries
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {quickSuggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(sug)}
                className="text-left py-1.5 px-3 rounded-lg border border-slate-800 bg-slate-900/30 text-slate-300 hover:text-white hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-xs font-sans truncate outline-none"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message input panel */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputVal)}
          placeholder="Ask about your emissions..."
          aria-label="Consult co-pilot input"
          className="flex-1 bg-slate-950/80 rounded-xl px-3 py-2 text-xs border border-slate-800 focus:outline-none focus:border-emerald-500/60 font-sans focus:ring-1 focus:ring-emerald-500/30 transition-all text-white placeholder-slate-500"
        />
        <button
          onClick={() => handleSendMessage(inputVal)}
          aria-label="Send query"
          className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all duration-200 text-white shadow-lg glow-btn-emerald flex items-center justify-center outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
