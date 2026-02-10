'use client';

import { useState } from 'react';
import { Search, Send, Paperclip, MoreHorizontal, Phone, Video, Circle } from 'lucide-react';

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
  role: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  timestamp: string;
  isOwn: boolean;
}

const CONVERSATIONS: Conversation[] = [
  { id: 'c1', name: 'Alice Chen', avatar: 'AC', lastMessage: 'Thanks for the update on the interview schedule!', timestamp: '2 min ago', unread: 2, online: true, role: 'Candidate' },
  { id: 'c2', name: 'Bob Martinez', avatar: 'BM', lastMessage: 'I have a few questions about the role...', timestamp: '15 min ago', unread: 1, online: true, role: 'Candidate' },
  { id: 'c3', name: 'Sarah Wilson', avatar: 'SW', lastMessage: 'The candidate looks great for the position', timestamp: '1 hour ago', unread: 0, online: false, role: 'Recruiter' },
  { id: 'c4', name: 'David Kim', avatar: 'DK', lastMessage: 'When can we schedule the technical interview?', timestamp: '3 hours ago', unread: 0, online: true, role: 'Candidate' },
  { id: 'c5', name: 'Eva Johnson', avatar: 'EJ', lastMessage: 'My availability for next week is flexible', timestamp: '1 day ago', unread: 0, online: false, role: 'Candidate' },
  { id: 'c6', name: 'Mike Thompson', avatar: 'MT', lastMessage: 'Scorecard submitted for the last interview', timestamp: '2 days ago', unread: 0, online: false, role: 'Interviewer' },
];

const MOCK_MESSAGES: Message[] = [
  { id: 'm1', senderId: 'other', senderName: 'Alice Chen', body: 'Hi! I wanted to follow up on my application for the Senior Frontend Engineer position.', timestamp: '10:30 AM', isOwn: false },
  { id: 'm2', senderId: 'me', senderName: 'You', body: 'Hi Alice! Thanks for reaching out. Your application looks great. We\'d love to move forward with a technical interview.', timestamp: '10:35 AM', isOwn: true },
  { id: 'm3', senderId: 'other', senderName: 'Alice Chen', body: 'That sounds wonderful! What does the interview process look like?', timestamp: '10:38 AM', isOwn: false },
  { id: 'm4', senderId: 'me', senderName: 'You', body: 'It\'s a 60-minute session with our engineering team. You\'ll work through a system design problem and some coding challenges. Nothing too tricky — we want to see how you think through problems.', timestamp: '10:42 AM', isOwn: true },
  { id: 'm5', senderId: 'other', senderName: 'Alice Chen', body: 'Perfect, I\'m looking forward to it. What times work for next week?', timestamp: '10:45 AM', isOwn: false },
  { id: 'm6', senderId: 'me', senderName: 'You', body: 'I\'ll send you a scheduling link shortly. We have slots available Tuesday through Thursday.', timestamp: '10:48 AM', isOwn: true },
  { id: 'm7', senderId: 'other', senderName: 'Alice Chen', body: 'Thanks for the update on the interview schedule!', timestamp: '10:50 AM', isOwn: false },
];

export default function MessagesPage() {
  const [selectedConvo, setSelectedConvo] = useState<string>('c1');
  const [search, setSearch] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const filteredConvos = CONVERSATIONS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const selected = CONVERSATIONS.find((c) => c.id === selectedConvo);

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Sidebar */}
      <div className="flex w-80 shrink-0 flex-col border-r">
        <div className="border-b p-4">
          <h2 className="mb-3 text-lg font-semibold">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConvos.map((convo) => (
            <button
              key={convo.id}
              onClick={() => setSelectedConvo(convo.id)}
              className={`flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors ${
                selectedConvo === convo.id ? 'bg-primary/5' : 'hover:bg-muted/50'
              }`}
            >
              <div className="relative shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {convo.avatar}
                </div>
                {convo.online && (
                  <Circle className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 fill-emerald-500 text-card" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{convo.name}</p>
                  <span className="text-[11px] text-muted-foreground">{convo.timestamp}</span>
                </div>
                <p className="text-xs text-muted-foreground">{convo.role}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{convo.lastMessage}</p>
              </div>
              {convo.unread > 0 && (
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {convo.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {selected.avatar}
                  </div>
                  {selected.online && (
                    <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-emerald-500 text-card" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">{selected.online ? 'Online' : 'Offline'}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  <Phone className="h-4 w-4" />
                </button>
                <button className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  <Video className="h-4 w-4" />
                </button>
                <button className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {MOCK_MESSAGES.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      msg.isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.body}</p>
                      <p className={`mt-1 text-[10px] ${msg.isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t px-6 py-4">
              <div className="flex items-end gap-2">
                <button className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  <Paperclip className="h-5 w-5" />
                </button>
                <div className="flex-1">
                  <textarea
                    rows={1}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        setNewMessage('');
                      }
                    }}
                  />
                </div>
                <button
                  className="shrink-0 rounded-lg bg-primary p-2.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
