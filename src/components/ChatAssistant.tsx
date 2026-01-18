import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User, Loader2 } from 'lucide-react';
import { chatAssistant } from '../services/geminiService';

interface ChatAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyText: (text: string) => void;
    initialContext?: string;
}

export default function ChatAssistant({ isOpen, onClose, onApplyText, initialContext }: ChatAssistantProps) {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{ role: 'assistant', content: "Hello! I'm your Nexus AI assistant. How can I help you with your project description today?" }]);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user' as const, content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await chatAssistant([...messages, userMsg]);
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I had trouble connecting. Please check your API key." }]);
        } finally {
            setLoading(false);
        }
    };

    const extractContent = (text: string) => {
        const match = text.match(/\[CONTENT\]([\s\S]*?)\[\/CONTENT\]/);
        return match ? match[1].trim() : text;
    };

    const stripTags = (text: string) => {
        return text.replace(/\[CONTENT\]/g, '').replace(/\[\/CONTENT\]/g, '');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed top-0 right-0 w-80 h-full bg-white shadow-2xl z-[60] flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b bg-purple-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Bot size={20} />
                    <span className="font-bold">Project Assistant</span>
                </div>
                <button onClick={onClose} className="hover:bg-purple-700 p-1 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${m.role === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                            }`}>
                            <div className="whitespace-pre-wrap">{stripTags(m.content)}</div>
                            {m.role === 'assistant' && i > 0 && (
                                <button
                                    onClick={() => onApplyText(extractContent(m.content))}
                                    className="block mt-2 text-[10px] uppercase font-bold text-purple-600 hover:text-purple-800 underline"
                                >
                                    Use this description
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white p-3 rounded-2xl border border-gray-100 rounded-tl-none shadow-sm">
                            <Loader2 size={16} className="animate-spin text-purple-600" />
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t bg-white">
                <div className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="Type your message..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading}
                        className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
