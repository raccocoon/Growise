import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Send, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCrisis } from "@/contexts/CrisisContext";

type Msg     = { id: number; sender: "user" | "bot"; text: string };
type HistMsg = { role: "user" | "assistant"; content: string };

const DEFAULT_SUGGESTIONS = ["How to grow Kangkung?", "Best crops for monsoon", "Soil pH tips"];
const CRISIS_SUGGESTIONS  = ["What to do in flood?", "Crops safe in heavy rain?", "Should I harvest now?"];

export default function LeafyPage() {
  const { activeProfile } = useAuth();
  const { isCrisis }      = useCrisis();

  const [messages,   setMessages]   = useState<Msg[]>([{
    id: 0, sender: "bot",
    text: "Hello! I'm Leafy, your GrowBuddy AI assistant. 🌱 How can I help you with your farming today?",
  }]);
  const [input,      setInput]      = useState("");
  const [isLoading,  setIsLoading]  = useState(false);
  const [history,    setHistory]    = useState<HistMsg[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const suggestions = isCrisis ? CRISIS_SUGGESTIONS : DEFAULT_SUGGESTIONS;

  async function handleSend(text?: string) {
    const userMessage = (text ?? input).trim();
    if (!userMessage || isLoading) return;
    setInput("");

    setMessages(prev => [...prev, { id: Date.now(), sender: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      const res = await api.post("/api/chat", {
        profile_id: activeProfile?.id ?? "",
        message:    userMessage,
        history,
      });
      const reply: string = res.response ?? "Sorry, I couldn't understand that.";
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: "bot", text: reply }]);
      setHistory(prev => [
        ...prev,
        { role: "user",      content: userMessage },
        { role: "assistant", content: reply },
      ].slice(-20) as HistMsg[]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: "bot",
        text: "Sorry, I couldn't connect. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-7rem)] md:h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Leafy</h1>
            <p className="text-xs text-muted-foreground">Your AI farming assistant</p>
          </div>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">Online</span>
        </div>

        {/* Chat area */}
        <div className="flex-1 bg-card rounded-2xl card-shadow flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.sender === "user" ? "justify-end" : "justify-start")}>
                <div className="flex items-end gap-2 max-w-[75%]">
                  {m.sender === "bot" && (
                    <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Leaf className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm",
                    m.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}>
                    {m.text}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2 max-w-[75%]">
                  <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Leaf className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl rounded-bl-md text-sm bg-muted text-muted-foreground">
                    Leafy is thinking...
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick suggestions */}
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
            {suggestions.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask Leafy about your farm..."
              className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading}
              className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
