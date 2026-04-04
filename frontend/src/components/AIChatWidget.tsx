import { useState } from "react";
import { Bot, X, Send, Maximize2, Minimize2 } from "lucide-react";
import { mockChatMessages } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function AIChatWidget({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [messages] = useState(mockChatMessages);
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => onOpenChange(true)}
          className="fixed bottom-20 md:bottom-6 right-4 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        >
          <Bot className="h-5 w-5" />
        </button>
      )}

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed bottom-20 md:bottom-6 right-4 z-50 bg-card rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden transition-all duration-300",
              expanded ? "w-[500px] max-h-[700px]" : "w-[340px] max-h-[480px]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-primary-foreground rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <span className="font-semibold text-sm">GrowBuddy AI</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-white/20 transition-colors">
                  {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-white/20 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex", m.sender === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] px-3 py-2 rounded-2xl text-sm",
                    m.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  )}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your crops..."
                className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
