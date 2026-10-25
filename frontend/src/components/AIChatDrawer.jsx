import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Bot, X, Send, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';

export default function AIChatDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `Hello ${user?.email?.split('@')[0] || 'there'}! I am your HCM Lite AI Assistant. How can I help you today? You can ask me in English or Roman Urdu!`,
      isAi: true
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const sampleQuestions = user?.role === 'EMPLOYEE' ? [
    "How many sick leaves do I have left this year?",
    "What is the company grace period policy?",
    "What is colleague's salary?",
    "Mujhe aglay peer ko chutti chahiye"
  ] : [
    "Who is on leave today?",
    "Who came late most often this month?",
    "What is this month's attendance rate?",
    "What are our tax slabs?"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(textToSend) {
    const q = textToSend || input;
    if (!q.trim() || loading) return;

    const userMsg = { sender: 'user', text: q, isAi: false };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.aiChat(q);
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: res.reply,
          toolCalled: res.tool_called,
          isAi: true
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `Error: ${err.message || 'Failed to get AI response'}`,
          isAi: true,
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'flex-end',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        height: '100%',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
        animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-glass)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Bot size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>HCM Lite Assistant</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)', display: 'inline-block' }}></span>
                Live Scope Guard Active ({user?.role})
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn-secondary btn-sm" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Message history */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((m, idx) => (
            <div key={idx} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start'
            }}>
              <div style={{
                padding: '12px 14px',
                borderRadius: '14px',
                fontSize: '0.875rem',
                whiteSpace: 'pre-line',
                background: m.sender === 'user' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: m.sender === 'user' ? '#ffffff' : 'var(--text-main)',
                border: m.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {m.text}
              </div>
              {m.isAi && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Sparkles size={11} style={{ color: 'var(--accent-primary)' }} /> AI-generated
                  </span>
                  {m.toolCalled && (
                    <span className="badge badge-purple" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                      Tool: {m.toolCalled}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              <Bot size={16} className="animate-spin" /> Querying verified database...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Preset prompt pills */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>
            Quick Prompts
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {sampleQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input box */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Ask anything or request leave in plain words..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="form-input"
              style={{ flex: 1, padding: '10px 14px' }}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
