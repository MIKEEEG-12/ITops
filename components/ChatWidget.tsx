
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User as UserIcon, Minus, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { User } from '../types';
import { chatWithAI } from '../services/geminiService';
import { ChatClient } from '../plugins/websocket-chat/client';
import { ChatMessage } from '../plugins/websocket-chat/types';

interface ChatWidgetProps {
  user: User;
}

interface LocalMessage {
  id: string;
  sender: 'user' | 'bot' | 'agent' | 'system';
  text: string;
  timestamp: number;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'team'>('ai');
  const [input, setInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatClientRef = useRef<ChatClient | null>(null);

  // AI Chat State
  const [aiMessages, setAiMessages] = useState<LocalMessage[]>([
    { id: '1', sender: 'bot', text: `Hi ${user.name}! I'm your AI IT Assistant. How can I help you today?`, timestamp: Date.now() }
  ]);
  
  // Team Chat State (WebSocket)
  const [teamMessages, setTeamMessages] = useState<LocalMessage[]>([
    { id: '1', sender: 'system', text: 'Connecting to Team Chat...', timestamp: Date.now() }
  ]);

  // Initialize WebSocket Client
  useEffect(() => {
    if (!chatClientRef.current) {
      chatClientRef.current = new ChatClient({
        url: 'http://localhost:3000', // Assumes local server for demo
        token: 'demo-token',
        username: user.name
      });

      chatClientRef.current.onMessage = (msg: ChatMessage) => {
        setTeamMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, {
            id: msg.id,
            sender: msg.senderId === user.id ? 'user' : 'agent', // 'agent' represents others
            text: msg.senderName !== user.name ? `${msg.senderName}: ${msg.content}` : msg.content,
            timestamp: msg.timestamp
          }];
        });
      };

      // Mock connection status for UI feedback (Socket.io has built-in events but we use this for the icon)
      // In a real app, bind to socket.on('connect')
      setTimeout(() => setIsConnected(true), 1000); 
    }

    return () => {
      chatClientRef.current?.disconnect();
    };
  }, [user.name, user.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [aiMessages, teamMessages, isOpen, activeTab]);

  const handleSend = async () => {
    if (!input.trim()) return;

    if (activeTab === 'ai') {
      const userMsg: LocalMessage = {
        id: Date.now().toString(),
        sender: 'user',
        text: input,
        timestamp: Date.now()
      };
      
      setAiMessages(prev => [...prev, userMsg]);
      setInput('');
      setIsAiTyping(true);

      const response = await chatWithAI(userMsg.text, `User Role: ${user.role}, Dept: ${user.department}`);
      
      const botMsg: LocalMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: response,
        timestamp: Date.now()
      };
      
      setAiMessages(prev => [...prev, botMsg]);
      setIsAiTyping(false);
    } else {
      // Team Chat (WebSocket)
      if (chatClientRef.current) {
        // Simulating sending for demo UI if server isn't running:
        const userMsg: LocalMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text: input,
            timestamp: Date.now()
        };
        setTeamMessages(prev => [...prev, userMsg]);
        
        // Attempt actual send
        try {
            chatClientRef.current.sendBroadcast(input);
        } catch (e) {
            console.error("Failed to send", e);
        }
      }
      setInput('');
    }
  };

  const clearChat = () => {
      if (activeTab === 'ai') {
          setAiMessages([{ id: Date.now().toString(), sender: 'bot', text: `Chat cleared. How can I help you?`, timestamp: Date.now() }]);
      } else {
          setTeamMessages([{ id: Date.now().toString(), sender: 'system', text: `Chat history cleared locally.`, timestamp: Date.now() }]);
      }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-[#456882] text-white rounded-full shadow-lg hover:bg-[#375368] transition-all z-50 animate-bounce-subtle"
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  const currentMessages = activeTab === 'ai' ? aiMessages : teamMessages;

  return (
    <div className="fixed bottom-6 right-6 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-[#456882] text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <div className="p-1.5 bg-[#2f4759] rounded-lg">
             {activeTab === 'ai' ? <Bot size={18} /> : <UserIcon size={18} />}
           </div>
           <div>
             <h3 className="font-bold text-sm">NexGen Assistant</h3>
             <div className="text-xs text-slate-200 flex items-center gap-1">
               {activeTab === 'ai' ? (
                 <><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Online</>
               ) : (
                 isConnected ? 
                   <><Wifi size={12} className="text-green-400" /> Connected</> : 
                   <><WifiOff size={12} className="text-red-400" /> Disconnected</>
               )}
             </div>
           </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={clearChat} className="p-1 hover:bg-[#375368] rounded text-xs"><RefreshCw size={14} /></button>
           <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-[#375368] rounded"><Minus size={18} /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-[#E3E3E3]">
        <button 
          onClick={() => setActiveTab('ai')} 
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'ai' ? 'text-[#456882] border-b-2 border-[#456882] bg-white' : 'text-slate-500 hover:text-slate-700'}`}
        >
           AI Support
        </button>
        <button 
          onClick={() => setActiveTab('team')} 
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'team' ? 'text-[#456882] border-b-2 border-[#456882] bg-white' : 'text-slate-500 hover:text-slate-700'}`}
        >
           Team Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {currentMessages.map(msg => (
           <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-[#456882] text-white rounded-br-none' 
                  : msg.sender === 'system'
                  ? 'bg-slate-200 text-slate-600 text-xs w-full text-center'
                  : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
              }`}>
                 {msg.text}
              </div>
           </div>
        ))}
        {isAiTyping && activeTab === 'ai' && (
           <div className="flex justify-start">
             <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none p-3 shadow-sm flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
         <input 
           className="flex-1 px-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#456882]"
           placeholder={activeTab === 'ai' ? "Ask AI..." : "Message team..."}
           value={input}
           onChange={(e) => setInput(e.target.value)}
           onKeyPress={(e) => e.key === 'Enter' && handleSend()}
         />
         <button 
           onClick={handleSend}
           disabled={!input.trim()}
           className="p-2 bg-[#456882] text-white rounded-full hover:bg-[#375368] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
         >
            <Send size={18} />
         </button>
      </div>
    </div>
  );
};
