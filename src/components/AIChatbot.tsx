import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, X, Send, Copy, FileText, CheckSquare, Mail, MessageCircle, Sparkles, Loader2, ChevronDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: {
    copy?: boolean;
    insert?: boolean;
    saveAsNote?: boolean;
    convertToTask?: boolean;
  };
}

const SUGGESTED_QUERIES = [
  "Summarize this customer",
  "Draft a follow-up email",
  "What are my tasks due this week?",
  "Show leads added today",
  "Generate product description",
  "Create a ticket reply",
  "What's the next best action?",
  "Summarize ticket status",
  "Draft WhatsApp message",
  "Show pending payments",
];

export const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<any>(null);
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-ai-chat', handleOpenChat);
    return () => window.removeEventListener('open-ai-chat', handleOpenChat);
  }, []);

  useEffect(() => {
    if (isOpen) {
      detectContext();
      inputRef.current?.focus();
    }
  }, [isOpen, location]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const detectContext = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Detect if we're on a customer page
      const customerMatch = location.pathname.match(/\/customers\/([^\/]+)/);
      if (customerMatch) {
        const customerId = customerMatch[1];
        const { data: customer } = await supabase
          .from("customers")
          .select("*")
          .eq("id", customerId)
          .single();

        if (customer) {
          // Fetch related data
          const [notes, tasks, quotations, orders] = await Promise.all([
            supabase.from("activities").select("*").eq("related_to_id", customerId).limit(5),
            supabase.from("tasks").select("*").eq("user_id", user.id).limit(5),
            supabase.from("quotations").select("*").eq("customer_id", customerId).limit(5),
            supabase.from("sales_orders").select("*").eq("customer_id", customerId).limit(5),
          ]);

          setContext({
            type: "customer",
            customer,
            notes: notes.data,
            tasks: tasks.data,
            quotations: quotations.data,
            orders: orders.data,
          });
        }
      } else {
        setContext(null);
      }
    } catch (error) {
      console.error("Error detecting context", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response (replace with actual AI API call)
    setTimeout(() => {
      const response = generateAIResponse(input, context);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
        actions: {
          copy: true,
          insert: true,
          saveAsNote: true,
          convertToTask: true,
        },
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const generateAIResponse = (query: string, ctx: any): string => {
    const lowerQuery = query.toLowerCase();

    // Context-aware responses
    if (ctx?.type === "customer") {
      if (lowerQuery.includes("summarize") || lowerQuery.includes("summary")) {
        return `**Customer Summary: ${ctx.customer.name}**

**Contact Information:**
- Email: ${ctx.customer.email || "N/A"}
- Phone: ${ctx.customer.phone || "N/A"}

**Recent Activity:**
- ${ctx.quotations?.length || 0} Quotations
- ${ctx.orders?.length || 0} Sales Orders
- ${ctx.tasks?.length || 0} Related Tasks

**Recommendation:** Based on the data, I recommend following up on the latest quotation and checking on pending tasks.`;
      }

      if (lowerQuery.includes("email") || lowerQuery.includes("message")) {
        return `**Draft Email for ${ctx.customer.name}:**

Subject: Follow-up on Your Recent Inquiry

Dear ${ctx.customer.name},

Thank you for your interest in our services. I wanted to follow up on our recent conversation and see if you have any questions.

I'm available to discuss how we can help meet your needs. Please let me know a convenient time for a call.

Best regards,
[Your Name]`;
      }
    }

    // General CRM queries
    if (lowerQuery.includes("leads") && lowerQuery.includes("today")) {
      return "I can help you find leads added today. Let me search the CRM...";
    }

    if (lowerQuery.includes("tasks") && lowerQuery.includes("due")) {
      return "I can help you find tasks due this week. Let me check your task list...";
    }

    if (lowerQuery.includes("ticket") || lowerQuery.includes("support")) {
      return "I can help you with ticket management. Would you like me to:\n- Show open tickets\n- Create a new ticket\n- Summarize ticket status";
    }

    // Default response
    return `I understand you're asking about: "${query}"

I'm your AI assistant for the CRM. I can help you with:
- Customer summaries and insights
- Drafting emails and messages
- Searching CRM data
- Creating tasks and notes
- Generating content

How can I assist you further?`;
  };

  const handleAction = async (action: string, message: Message) => {
    switch (action) {
      case "copy":
        navigator.clipboard.writeText(message.content);
        toast.success("Copied to clipboard!");
        break;
      case "insert":
        // This would insert into an active form field
        toast.info("Insert functionality - to be implemented");
        break;
      case "saveAsNote":
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          if (context?.customer) {
            await supabase.from("activities").insert({
              user_id: user.id,
              activity_type: "note",
              subject: "AI Generated Note",
              description: message.content,
              related_to_type: "customer",
              related_to_id: context.customer.id,
            } as any);
            toast.success("Saved as note!");
          } else {
            toast.info("Please open a customer page to save notes");
          }
        } catch (error) {
          toast.error("Error saving note");
        }
        break;
      case "convertToTask":
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          await supabase.from("tasks").insert({
            user_id: user.id,
            title: message.content.substring(0, 100),
            description: message.content,
            status: "pending",
            priority: "medium",
          } as any);
          toast.success("Converted to task!");
        } catch (error) {
          toast.error("Error creating task");
        }
        break;
    }
  };

  const quickCommands = [
    { label: "Create Task", query: "Create a task for following up with customers" },
    { label: "Show Leads", query: "Show me leads added today" },
    { label: "Pending Tasks", query: "Show tasks due this week" },
    { label: "Ticket Status", query: "Summarize ticket status" },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center z-50"
        title="AI Assistant"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-[400px] md:w-[500px] h-[600px] bg-background border rounded-lg shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <h3 className="font-semibold">AI Assistant</h3>
          {context?.customer && (
            <Badge variant="secondary" className="ml-2">
              {context.customer.name}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8 p-0 text-primary-foreground hover:bg-primary-foreground/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm mb-4">I'm your AI assistant. How can I help?</p>
              <div className="space-y-2">
                {quickCommands.map((cmd, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInput(cmd.query);
                      setTimeout(() => handleSend(), 100);
                    }}
                    className="w-full text-left justify-start"
                  >
                    {cmd.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                {message.role === "assistant" && message.actions && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction("copy", message)}
                      className="h-6 px-2 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction("saveAsNote", message)}
                      className="h-6 px-2 text-xs"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Save Note
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction("convertToTask", message)}
                      className="h-6 px-2 text-xs"
                    >
                      <CheckSquare className="h-3 w-3 mr-1" />
                      Task
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t space-y-2">
        <Select
          value=""
          onValueChange={(value) => {
            setInput(value);
            setTimeout(() => handleSend(), 100);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a suggested query..." />
          </SelectTrigger>
          <SelectContent>
            {SUGGESTED_QUERIES.map((query, idx) => (
              <SelectItem key={idx} value={query}>
                {query}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Or type your question..."
            rows={2}
            className="resize-none"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

