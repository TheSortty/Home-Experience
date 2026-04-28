'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { IoSendOutline, IoChatbubblesOutline } from 'react-icons/io5';
import { postLessonComment } from '../../actions';

export interface ChatMessage {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name: string;
  author_initials: string;
  is_own: boolean;
}

interface Props {
  courseId: string;
  lessonId: string;
  initialMessages: ChatMessage[];
  currentUserName: string;
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Ayer';
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export default function LessonChat({
  courseId,
  lessonId,
  initialMessages,
  currentUserName,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const body = input.trim();
    if (!body || isPending) return;

    // Optimistic add
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: '',
      body,
      created_at: new Date().toISOString(),
      author_name: currentUserName,
      author_initials: currentUserName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
      is_own: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    inputRef.current?.focus();

    startTransition(async () => {
      const result = await postLessonComment(courseId, lessonId, body);
      if (result.error) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    });
  };

  return (
    <div className="flex flex-col h-[400px]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1 py-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3">
              <IoChatbubblesOutline size={28} />
            </div>
            <p className="text-sm font-bold text-slate-700 mb-1">
              Debate de esta clase
            </p>
            <p className="text-xs text-slate-500 max-w-xs">
              Escribí tu primera pregunta o comentario sobre el contenido de esta clase.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.is_own ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  msg.is_own
                    ? 'bg-[#00A9CE] text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {msg.author_initials}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[75%] ${
                  msg.is_own ? 'text-right' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-xs font-bold ${
                      msg.is_own ? 'text-[#00A9CE] ml-auto' : 'text-slate-700'
                    }`}
                  >
                    {msg.is_own ? 'Vos' : msg.author_name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {timeAgo(msg.created_at)}
                  </span>
                </div>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.is_own
                      ? 'bg-[#00A9CE] text-white rounded-br-md'
                      : 'bg-slate-100 text-slate-800 rounded-bl-md'
                  }`}
                >
                  {msg.body}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-slate-200 pt-3 mt-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escribí tu comentario..."
            maxLength={2000}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#00A9CE] focus:ring-2 focus:ring-[#00A9CE]/20 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isPending}
            className={`p-2.5 rounded-xl transition-all ${
              input.trim() && !isPending
                ? 'bg-[#00A9CE] text-white hover:bg-blue-600 shadow-sm cursor-pointer'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
          >
            <IoSendOutline size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
