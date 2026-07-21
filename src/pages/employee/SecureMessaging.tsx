
// src/pages/employee/SecureMessaging.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Paperclip, Pencil, Search, Send, Smile, X, Download, Check, CheckCheck, ArrowLeft } from "lucide-react";
import messageApi from "../../api/employee/message.api";
import type { Conversation, Message } from "../../types/employee/message.types";
import { getUiSession } from "../../utils/uiSession";
import { getFileUrl } from "../../utils/fileUrl";

// ── Message sound + browser popup ────────────────────────────────────────────

let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

function playMessageSound() {
  const ctx = getAudioContext();
  if (!ctx || ctx.state === "suspended") return;
  try {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.setValueAtTime(900,  ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch { /* silent */ }
}

function showMessagePopup(senderName: string, content: string, convId: string) {
  if (Notification.permission !== "granted") return;
  if (document.hasFocus()) return;
  const n = new Notification(`💬 ${senderName}`, {
    body:     content.length > 80 ? content.slice(0, 80) + "…" : content,
    icon:     "/logo192.png",
    tag:      `msg-${convId}`,
    renotify: true,
  } as NotificationOptions & { renotify: boolean });
  n.onclick = () => { window.focus(); n.close(); };
  setTimeout(() => n.close(), 8000);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const getInitials = (name?: string) =>
  (name ?? "?").split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase();

const formatTime = (date?: string) =>
  date ? new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";

const formatDateDivider = (date?: string) => {
  if (!date) return "";
  const d    = new Date(date);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
};

const fmtConvTime = (date?: string) => {
  if (!date) return "";
  const d    = new Date(date);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 1)    return "now";
  if (diff < 60)   return `${diff}m`;
  if (diff < 1440) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
};

const fmtLastSeen = (iso?: string): string => {
  if (!iso) return "a while ago";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
};

const isSameDay = (a?: string, b?: string) =>
  !!a && !!b && new Date(a).toDateString() === new Date(b).toDateString();

const isImageFile = (name?: string | null) =>
  /\.(jpg|jpeg|png|gif|webp)$/i.test(name ?? "");

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, url, online, size = 44 }: {
  name?: string; url?: string | null; online?: boolean; size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const src  = getFileUrl(url ?? null);
  const sz   = `${size}px`;
  const COLORS = ["bg-violet-500","bg-orange-500","bg-emerald-600","bg-blue-500","bg-pink-500","bg-amber-500","bg-teal-500","bg-rose-500"];
  const color  = COLORS[(name ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

  return (
    <div className="relative shrink-0" style={{ width: sz, height: sz }}>
      {src && !failed ? (
        <img src={src} alt={name ?? ""} onError={() => setFailed(true)}
          className="rounded-full object-cover w-full h-full" />
      ) : (
        <div className={`${color} rounded-full flex items-center justify-center text-white font-semibold w-full h-full`}
          style={{ fontSize: size * 0.38 }}>
          {getInitials(name)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 border-2 border-white rounded-full ${online ? "bg-emerald-400" : "bg-slate-300"}`}
          style={{ width: size * 0.27, height: size * 0.27 }}
        />
      )}
    </div>
  );
}

// ── Ticks (WhatsApp-style) ────────────────────────────────────────────────────
function Ticks({ isRead }: { isRead: boolean }) {
  if (isRead) return <CheckCheck size={14} className="shrink-0" style={{ color: "var(--theme-primary)" }} />;
  return <Check size={14} className="text-slate-400 shrink-0" />;
}

// ── Protected image ───────────────────────────────────────────────────────────
function ProtectedImage({ documentId, name, onClick }: {
  documentId: string; name?: string; onClick: (url: string) => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    messageApi.getFileObjectUrl(documentId)
      .then(({ url }) => { if (!cancelled) { setBlobUrl(url); blobRef.current = url; } })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; if (blobRef.current) URL.revokeObjectURL(blobRef.current); };
  }, [documentId]);

  if (loading) return (
    <div className="w-[200px] h-[150px] rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center">
      <span className="text-xs text-slate-400">Loading…</span>
    </div>
  );
  if (error || !blobUrl) return (
    <div className="flex items-center gap-2 bg-white/60 rounded-xl px-3 py-2 text-sm text-slate-500">
      <Paperclip size={14} /><span className="truncate max-w-[160px]">{name ?? "Image"}</span>
    </div>
  );
  return (
    <img src={blobUrl} alt={name ?? ""}
      className="max-w-[260px] max-h-[260px] rounded-2xl object-cover cursor-pointer shadow-sm hover:opacity-95 transition"
      onClick={() => onClick(blobUrl)} />
  );
}

// ── File download card ────────────────────────────────────────────────────────
function FileCard({ documentId, name, size, isMine }: {
  documentId: string; name?: string; size?: string; isMine: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    try {
      const { url, fileName } = await messageApi.getFileObjectUrl(documentId);
      const a = document.createElement("a");
      a.href = url; a.download = fileName || name || "file"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch { /* silent */ } finally { setLoading(false); }
  };
  return (
    <button type="button" onClick={handleClick} disabled={loading}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition disabled:opacity-60 max-w-[260px] w-full ${
        isMine ? "bg-white/20 hover:bg-white/30" : "bg-white hover:bg-slate-50 border border-slate-100 shadow-sm"
      }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isMine ? "bg-white/25" : "bg-[var(--theme-light)]"}`}>
        <Paperclip size={16} className={isMine ? "text-white" : "text-[var(--theme-dark)]"} />
      </div>
      <div className="min-w-0 text-left flex-1">
        <p className={`font-medium truncate max-w-[160px] text-[13px] ${isMine ? "text-white" : "text-slate-700"}`}>{name ?? "File"}</p>
        {size && <p className={`text-xs mt-0.5 ${isMine ? "text-white/70" : "text-slate-400"}`}>{size}</p>}
      </div>
      <Download size={14} className={isMine ? "text-white/80" : "text-slate-400"} />
    </button>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button type="button" className="absolute top-4 right-5 text-white/80 hover:text-white" onClick={onClose}>
        <X size={28} />
      </button>
      <img src={src} alt="Preview"
        className="max-w-[92vw] max-h-[88vh] rounded-xl object-contain"
        onClick={e => e.stopPropagation()} />
    </div>
  );
}

// ── Emoji picker ──────────────────────────────────────────────────────────────
const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: "Smileys",  emojis: ["😀","😂","😊","😍","🥰","😎","🤔","😢","😡","🥳","😇","🤩","😴","🤯","😤","🫠","😶","🤭","🫢","🙄"] },
  { label: "Gestures", emojis: ["👍","👎","👏","🙏","🤝","💪","👋","🫡","✌️","🤞","🫶","❤️","🔥","✅","⚠️","💯","🎯","🏆","⭐","💎"] },
  { label: "Objects",  emojis: ["📎","📄","📅","⏰","🔔","💬","🌟","✍️","📧","🗂️","💡","🔍","🎉","🚀","💼","📊","🔒","🌐","📱","💻"] },
];

function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div ref={ref}
      className="absolute bottom-[56px] left-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
      style={{ width: 300 }}>
      <div className="flex border-b border-slate-100">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button key={cat.label} type="button" onClick={() => setTab(i)}
            className={`flex-1 py-2 text-xs font-medium transition ${
              tab === i
                ? "border-b-2 border-[var(--theme-primary)] text-[var(--theme-dark)] bg-[var(--theme-light)]"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}>
            {cat.label}
          </button>
        ))}
      </div>
      <div className="p-2 grid grid-cols-10 gap-0.5">
        {EMOJI_CATEGORIES[tab].emojis.map(e => (
          <button key={e} type="button" onClick={() => { onPick(e); onClose(); }}
            className="text-[20px] w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--theme-light)] transition">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── New conversation modal ────────────────────────────────────────────────────
type StaffUser = { id: string; name: string; role?: string; avatar_url?: string };

function NewConvModal({ onClose, onCreate, isHR }: {
  onClose: () => void; onCreate: (userId: string) => void; isHR: boolean;
}) {
  const [users,    setUsers]    = useState<StaffUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (isHR) {
      import("../../api/hr/employees.api")
        .then(({ employeesApi }) => employeesApi.list({ is_active: true, limit: 100 }))
        .then(res => setUsers((res.items ?? []).map((e: any) => ({
          id: e.employee_id, name: e.full_name,
          role: e.job_title ?? "Employee", avatar_url: e.profile_picture_url,
        }))))
        .catch(() => setUsers([]))
        .finally(() => setLoading(false));
    } else {
      messageApi.listStaff()
        .then(items => setUsers(items.map(s => ({
          id: s.id, name: `${s.first_name} ${s.last_name}`,
          role: s.role, avatar_url: s.profile_picture_url ?? s.avatar_url,
        }))))
        .catch(() => setUsers([]))
        .finally(() => setLoading(false));
    }
  }, [isHR]);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[380px] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-[15px] text-slate-900">New Conversation</h3>
          <button onClick={onClose} type="button" className="text-slate-400 hover:text-slate-700 transition">
            <X size={18} />
          </button>
        </div>
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input autoFocus type="text"
              placeholder={isHR ? "Search employees…" : "Search staff…"}
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-9 bg-slate-50 border border-slate-100 rounded-xl pl-8 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-[var(--theme-light)] focus:border-[var(--theme-primary)] transition" />
          </div>
        </div>
        <div className="overflow-y-auto max-h-[280px] px-3 pb-3">
          {loading
            ? <p className="text-center text-slate-400 text-sm py-8">Loading…</p>
            : filtered.length === 0
              ? <p className="text-center text-slate-400 text-sm py-8">No results</p>
              : filtered.map(u => (
                <button key={u.id} type="button"
                  onClick={() => setSelected(u.id === selected ? null : u.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-left mb-0.5 ${
                    selected === u.id ? "bg-[var(--theme-light)] ring-1 ring-[var(--theme-border,#c7d2fe)]" : "hover:bg-slate-50"
                  }`}>
                  <Avatar name={u.name} url={u.avatar_url} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{u.name}</p>
                    <p className="text-[11px] text-slate-500 capitalize">{u.role}</p>
                  </div>
                  {selected === u.id && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--theme-primary)" }}>
                      <Check size={11} className="text-white" />
                    </div>
                  )}
                </button>
              ))
          }
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 h-9 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-medium hover:bg-slate-50 transition">
            Cancel
          </button>
          <button type="button" disabled={!selected} onClick={() => selected && onCreate(selected)}
            className="flex-1 h-9 rounded-xl text-white text-[13px] font-semibold hover:opacity-90 transition disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
            Start Chat
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const SecureMessaging: React.FC = () => {
  const session = getUiSession();
  const isHR    = session?.roles?.includes("hr") ?? false;

  const currentUserId = useMemo((): string => {
    if (session?.user_id) return session.user_id;
    try {
      for (const cookie of document.cookie.split("; ")) {
        const val = cookie.split("=").slice(1).join("=");
        if (!val) continue;
        const parts = decodeURIComponent(val).split(".");
        if (parts.length !== 3) continue;
        try {
          const p = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          if (p?.sub && p?.type === "access") return p.sub;
        } catch { continue; }
      }
    } catch { /* silent */ }
    return "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user_id]);

  // ── State ─────────────────────────────────────────────────────────────────
  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [selectedConv,   setSelectedConv]   = useState<Conversation | null>(null);
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [search,         setSearch]         = useState("");
  const [filter,         setFilter]         = useState<"all" | "unread" | "archived">("all");
  const [text,           setText]           = useState("");
  const [selectedFile,   setSelectedFile]   = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [loadingConvs,   setLoadingConvs]   = useState(true);
  const [loadingMsgs,    setLoadingMsgs]    = useState(false);
  const [sending,        setSending]        = useState(false);
  const [lightboxSrc,    setLightboxSrc]    = useState<string | null>(null);
  const [showEmoji,      setShowEmoji]      = useState(false);
  const [showNewConv,    setShowNewConv]    = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const activeIdRef  = useRef<string | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const isGroup = (selectedConv as any)?.thread_type === "group";

  const filteredConvs = useMemo(() => conversations.filter(c => {
    const m = c.participant_name?.toLowerCase().includes(search.toLowerCase())
           || c.last_message?.toLowerCase().includes(search.toLowerCase());
    if (!m) return false;
    if (filter === "unread")   return c.unread_count > 0;
    if (filter === "archived") return c.is_archived;
    return !c.is_archived;
  }), [conversations, search, filter]);

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count ?? 0), 0);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const d = await messageApi.listConversations();
      setConversations(d);
    } catch { /* silent */ } finally { setLoadingConvs(false); }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    if (activeIdRef.current !== id) return;
    try {
      const d = await messageApi.listMessages(id);
      setMessages(prev => {
        const prevIds  = new Set(prev.map(m => m.id));
        const newMsgs  = d.filter(m => !prevIds.has(m.id));
        const incoming = newMsgs.filter(m => m.sender_id !== currentUserId);

        if (incoming.length > 0) {
          playMessageSound();
          const latest     = incoming[incoming.length - 1];
          const senderName = (latest as any).sender_name || selectedConv?.participant_name || "New message";
          const body       = latest.content || (latest.attachment_name ? `📎 ${latest.attachment_name}` : "Sent an attachment");
          showMessagePopup(senderName, body, id);
        }
        return d;
      });
    } catch { /* silent */ }
  }, [currentUserId, selectedConv?.participant_name]);

  const selectConv = useCallback(async (conv: Conversation) => {
    unlockAudio();
    setSelectedConv(conv);
    setMobileChatOpen(true);
    activeIdRef.current = conv.id;
    setMessages([]);
    setLoadingMsgs(true);
    try {
      const d = await messageApi.listMessages(conv.id);
      setMessages(d);
      await messageApi.markRead(conv.id);
      setConversations(p => p.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    } catch { /* silent */ } finally { setLoadingMsgs(false); }
  }, []);

  const handleBackToList = useCallback(() => {
    setMobileChatOpen(false);
    setSelectedConv(null);
    activeIdRef.current = null;
  }, []);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    unlockAudio();
    if (!selectedConv || sending || (!text.trim() && !selectedFile)) return;
    setSending(true);
    try {
      const msg = selectedFile
        ? await messageApi.sendFile(selectedConv.id, text.trim() || undefined, selectedFile)
        : await messageApi.sendText(selectedConv.id, text.trim());
      setMessages(p => p.find(m => m.id === msg.id) ? p : [...p, msg]);
      setConversations(p => p.map(c => c.id === selectedConv.id
        ? { ...c, last_message: msg.content ?? (msg.attachment_name ? `📎 ${msg.attachment_name}` : c.last_message), last_message_at: msg.created_at }
        : c));
      setText("");
      setSelectedFile(null);
      setFilePreviewUrl(null);
      setShowEmoji(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) { console.error(e); } finally { setSending(false); }
  }, [selectedConv, text, selectedFile, sending]);

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(file?.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  };

  const handleCreateConv = useCallback(async (userId: string) => {
    try {
      const thread = await messageApi.createConversation({ thread_type: "direct", participant_ids: [userId] });
      setConversations(p => p.find(c => c.id === thread.id) ? p : [thread, ...p]);
      await selectConv(thread);
      setShowNewConv(false);
    } catch { /* silent */ }
  }, [selectConv]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
  }, [text]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const t = setInterval(loadConversations, 10_000);
    return () => clearInterval(t);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConv) return;
    const t = setInterval(() => loadMessages(selectedConv.id), 3_000);
    return () => clearInterval(t);
  }, [selectedConv, loadMessages]);

  // ── Sidebar panel ─────────────────────────────────────────────────────────
  const SidebarPanel = (
    <aside
      className={`
        flex flex-col bg-white border-r border-slate-100
        md:w-[340px] md:shrink-0 md:relative md:flex
        w-full absolute inset-0 z-10 h-full
        ${mobileChatOpen ? "hidden md:flex" : "flex"}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Avatar
            name={`${session?.first_name ?? ""} ${session?.last_name ?? ""}`}
            url={session?.profile}
            size={40}
          />
          <span className="font-semibold text-[15px] text-slate-800">Chats</span>
        </div>
        <button type="button" onClick={() => setShowNewConv(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition hover:bg-[var(--theme-light)] text-[var(--theme-dark)]"
          title="New chat">
          <Pencil size={18} />
        </button>
      </div>

<<<<<<< Updated upstream
      {/* Search */}
      <div className="px-3 py-2 bg-white">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[var(--theme-light)] transition" />
        </div>
      </div>
=======
      {/* ══ LEFT PANEL — chat list ═════════════════════════════════════════
           MOBILE (< md): full-width; hidden as soon as a conversation is
             picked so the message thread takes over the whole screen.
           DESKTOP (md+): fixed 340px column, always visible alongside the
             thread pane. */}
      <aside
        className={`w-full md:w-[340px] md:shrink-0 flex-col bg-white border-r border-slate-100 ${
          selectedConv ? 'hidden md:flex' : 'flex'
        }`}
      >
>>>>>>> Stashed changes

      {/* Filter tabs */}
      <div className="flex border-b border-slate-100">
        {(["all", "unread", "archived"] as const).map(tab => (
          <button key={tab} type="button" onClick={() => setFilter(tab)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition flex items-center justify-center gap-1.5 ${
              filter === tab
                ? "border-b-2 border-[var(--theme-primary)] text-[var(--theme-dark)]"
                : "text-slate-500 hover:text-slate-700"
            }`}>
            {tab}
            {tab === "unread" && totalUnread > 0 && (
              <span className="text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-1" style={{ background: "var(--theme-primary)" }}>
                {totalUnread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loadingConvs && (
          <p className="text-xs text-slate-400 text-center py-8">Loading…</p>
        )}
        {!loadingConvs && filteredConvs.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8">No conversations</p>
        )}
        {filteredConvs.map(conv => (
          <button key={conv.id} type="button" onClick={() => selectConv(conv)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-b border-slate-50 ${
              selectedConv?.id === conv.id ? "bg-[var(--theme-light)] text-[var(--theme-dark)]" : "hover:bg-slate-50"
            }`}>
            <Avatar name={conv.participant_name} url={conv.avatar_url} online={conv.is_online} size={48} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-medium text-slate-900 truncate">{conv.participant_name}</p>
                <span className={`text-[11px] shrink-0 ml-2 ${conv.unread_count > 0 ? "font-semibold text-[var(--theme-dark)]" : "text-slate-400"}`}>
                  {fmtConvTime(conv.last_message_at)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className={`text-[13px] truncate ${conv.unread_count > 0 ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                  {conv.last_message ?? "No messages yet"}
                </p>
                {conv.unread_count > 0 && (
                  <span className="text-white text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 shrink-0 ml-2" style={{ background: "var(--theme-primary)" }}>
                    {conv.unread_count}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );

  // ── Chat panel ─────────────────────────────────────────────────────────────
  const ChatPanel = (
    <main
      className={`
        flex-1 flex flex-col min-w-0 h-full
        md:flex
        ${mobileChatOpen ? "flex w-full" : "hidden md:flex"}
      `}
    >
      {!selectedConv ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 min-h-0">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: "var(--theme-light)" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                stroke="var(--theme-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-[18px] font-semibold text-slate-700">VisaFlow Messaging</h3>
          <p className="text-slate-400 text-[13px] mt-2">Select a conversation to start chatting</p>
        </div>
      ) : (
        <>
          {/* Chat header */}
          <div className="h-[60px] bg-white border-b border-slate-200 px-4 flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleBackToList}
              aria-label="Back to chats"
              className="md:hidden -ml-1 w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <Avatar
              name={selectedConv.participant_name}
              url={selectedConv.avatar_url}
              online={selectedConv.is_online}
              size={40}
            />
<<<<<<< Updated upstream
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-slate-900 leading-tight truncate">
                {selectedConv.participant_name}
              </p>
              <p className="text-[12px] leading-tight mt-0.5">
                {selectedConv.is_online
                  ? <span className="font-medium" style={{ color: "var(--theme-primary)" }}>online</span>
                  : (selectedConv as any).last_seen_at
                    ? <span className="text-slate-400">last seen {fmtLastSeen((selectedConv as any).last_seen_at)}</span>
                    : <span className="text-slate-400 capitalize">{selectedConv.participant_role ?? "offline"}</span>
=======
            <span className="font-semibold text-[15px] text-slate-800">Chats</span>
          </div>
          <button type="button" onClick={() => setShowNewConv(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition hover:bg-[var(--theme-light)] text-[var(--theme-dark)]"
            title="New chat">
            <Pencil size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 bg-white">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search or start new chat"
              className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[var(--theme-light)] transition" />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-slate-100">
          {(["all", "unread", "archived"] as const).map(tab => (
            <button key={tab} type="button" onClick={() => setFilter(tab)}
              className={`flex-1 py-2 text-xs font-medium capitalize transition flex items-center justify-center gap-1.5 ${
                filter === tab
                  ? "border-b-2 border-[var(--theme-primary)] text-[var(--theme-dark)]"
                  : "text-slate-500 hover:text-slate-700"
              }`}>
              {tab}
              {tab === "unread" && totalUnread > 0 && (
                <span className="text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-1" style={{ background: "var(--theme-primary)" }}>
                  {totalUnread}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs && (
            <p className="text-xs text-slate-400 text-center py-8">Loading…</p>
          )}
          {!loadingConvs && filteredConvs.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8">No conversations</p>
          )}
          {filteredConvs.map(conv => (
            <button key={conv.id} type="button" onClick={() => selectConv(conv)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-b border-slate-50 ${
                selectedConv?.id === conv.id ? "bg-[var(--theme-light)] text-[var(--theme-dark)]" : "hover:bg-slate-50"
              }`}>
              <Avatar name={conv.participant_name} url={conv.avatar_url} online={conv.is_online} size={48} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-medium text-slate-900 truncate">{conv.participant_name}</p>
                  <span className={`text-[11px] shrink-0 ml-2 ${conv.unread_count > 0 ? "font-semibold text-[var(--theme-dark)]" : "text-slate-400"}`}>
                    {fmtConvTime(conv.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className={`text-[13px] truncate ${conv.unread_count > 0 ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                    {conv.last_message ?? "No messages yet"}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="text-white text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 shrink-0 ml-2" style={{ background: "var(--theme-primary)" }}>
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ══ RIGHT PANEL — message thread ═══════════════════════════════════
           MOBILE (< md): hidden until a conversation is selected, then it
             takes over the full width and the chat-header shows a Back
             arrow that clears the selection to return to the list.
           DESKTOP (md+): always visible.  When nothing is selected it
             shows the "Select a conversation" empty state. */}
      <main
        className={`flex-1 flex-col min-w-0 ${
          selectedConv ? 'flex' : 'hidden md:flex'
        }`}
      >
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: "var(--theme-light)" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                  stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-[18px] font-semibold text-slate-700">VisaFlow Messaging</h3>
            <p className="text-slate-400 text-[13px] mt-2">Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="h-[60px] bg-white border-b border-slate-200 px-4 flex items-center gap-3 shrink-0">
              {/* Mobile-only back arrow — returns the user to the chat list.
                  Hidden on md+ where both panes render side-by-side. */}
              <button
                type="button"
                onClick={() => setSelectedConv(null)}
                aria-label="Back to chats"
                className="md:hidden -ml-1 w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100"
              >
                <ArrowLeft size={20} />
              </button>
              <Avatar
                name={selectedConv.participant_name}
                url={selectedConv.avatar_url}
                online={selectedConv.is_online}
                size={40}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-slate-900 leading-tight">
                  {selectedConv.participant_name}
                </p>
                <p className="text-[12px] leading-tight mt-0.5">
                  {selectedConv.is_online
                    ? <span className="font-medium" style={{ color: "var(--theme-primary)" }}>online</span>
                    : (selectedConv as any).last_seen_at
                      ? <span className="text-slate-400">last seen {fmtLastSeen((selectedConv as any).last_seen_at)}</span>
                      : <span className="text-slate-400 capitalize">{selectedConv.participant_role ?? "offline"}</span>
                  }
                </p>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4"
              style={{
                background: "#f8fafc",
              }}>
              {loadingMsgs && (
                <p className="text-xs text-slate-500 text-center py-4">Loading messages…</p>
              )}

              <div className="flex flex-col gap-1 max-w-[800px] mx-auto">
                {messages.map((msg, idx) => {
                  const isMine         = msg.sender_id === currentUserId;
                  const prev           = messages[idx - 1];
                  const showDate       = idx === 0 || !isSameDay(prev?.created_at, msg.created_at);
                  const isLastFromSender = !messages[idx + 1] || messages[idx + 1].sender_id !== msg.sender_id;
                  const hasImage       = msg.message_type === "file_attachment" && msg.document_id
                                         && ((msg as any).is_image || isImageFile(msg.attachment_name));
                  const hasFile        = msg.message_type === "file_attachment" && msg.document_id && !hasImage;

                  return (
                    <React.Fragment key={msg.id}>
                      {/* Date divider */}
                      {showDate && (
                        <div className="flex items-center justify-center my-3">
                          <span className="bg-white border border-slate-200 text-slate-400 text-[11px] font-medium px-4 py-1 rounded-full shadow-sm">
                            {formatDateDivider(msg.created_at)}
                          </span>
                        </div>
                      )}

                      {/* System notification */}
                      {msg.message_type === "system_notification" && (
                        <div className="flex justify-center my-2">
                          <div className="bg-[#fff3cd] text-[#856404] text-[11px] px-4 py-1.5 rounded-full max-w-[80%] text-center shadow-sm">
                            {msg.content}
                          </div>
                        </div>
                      )}

                      {/* Regular message */}
                      {msg.message_type !== "system_notification" && (
                        <div
                          className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                          style={{ marginBottom: isLastFromSender ? "6px" : "1px" }}>

                          {/* Receiver avatar — only on last message in a group */}
                          {!isMine && (
                            <div className="shrink-0 mb-1">
                              {isLastFromSender
                                ? <Avatar name={selectedConv.participant_name} url={selectedConv.avatar_url} size={28} />
                                : <div style={{ width: 28 }} />
                              }
                            </div>
                          )}

                          {/* Bubble */}
                          <div className={`flex flex-col max-w-[65%] ${isMine ? "items-end" : "items-start"}`}>
                            <div
                              className={`px-3 pt-2 pb-1.5 rounded-2xl shadow-sm ${
                                isMine
                                  ? "rounded-tr-sm border border-[var(--theme-border,#e0e7ff)]"
                                  : "bg-white rounded-tl-sm border border-slate-100"
                              }`}
                              style={isMine ? {
                                background: "#ffffff",
                              } : undefined}>

                              {/* Text */}
                              {msg.content && (
                                <p className={`text-[14px] leading-[1.5] whitespace-pre-wrap break-words ${
                                  "text-slate-900"
                                }`}>
                                  {msg.content}
                                </p>
                              )}

                              {/* Image attachment */}
                              {hasImage && (
                                <div className={msg.content ? "mt-1.5" : ""}>
                                  <ProtectedImage
                                    documentId={msg.document_id!}
                                    name={msg.attachment_name ?? undefined}
                                    onClick={setLightboxSrc}
                                  />
                                </div>
                              )}

                              {/* File attachment */}
                              {hasFile && (
                                <div className={msg.content ? "mt-1.5" : ""}>
                                  <FileCard
                                    documentId={msg.document_id!}
                                    name={msg.attachment_name ?? undefined}
                                    size={msg.attachment_size ?? undefined}
                                    isMine={isMine}
                                  />
                                </div>
                              )}

                              {/* Timestamp + ticks — always on its own line below content */}
                              <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : "justify-end"}`}>
                                <span className={`text-[10px] whitespace-nowrap ${
                                  "text-slate-400"
                                }`}>
                                  {formatTime(msg.created_at)}
                                </span>
                                {isMine && <Ticks isRead={msg.is_read} />}
                              </div>
                            </div>
                          </div>

                          {/* Spacer on sender side */}
                          {isMine && <div style={{ width: 0 }} className="shrink-0" />}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* File preview strip */}
            {selectedFile && (
              <div className="bg-white border-t border-slate-100 px-4 py-2 flex items-center gap-3">
                {filePreviewUrl
                  ? <img src={filePreviewUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200" />
                  : (
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--theme-light)" }}>
                      <Paperclip size={16} style={{ color: "var(--theme-primary)" }} />
                    </div>
                  )
>>>>>>> Stashed changes
                }
              </p>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 min-h-0" style={{ background: "#f8fafc" }}>
            {loadingMsgs && (
              <p className="text-xs text-slate-500 text-center py-4">Loading messages…</p>
            )}

            <div className="flex flex-col gap-1 max-w-[800px] mx-auto">
              {messages.map((msg, idx) => {
                const isMine             = msg.sender_id === currentUserId;
                const prev               = messages[idx - 1];
                const next               = messages[idx + 1];
                const showDate           = idx === 0 || !isSameDay(prev?.created_at, msg.created_at);
                const isFirstFromSender  = !prev || prev.sender_id !== msg.sender_id || !isSameDay(prev.created_at, msg.created_at);
                const isLastFromSender   = !next || next.sender_id !== msg.sender_id;
                const hasImage           = msg.message_type === "file_attachment" && msg.document_id
                                           && ((msg as any).is_image || isImageFile(msg.attachment_name));
                const hasFile            = msg.message_type === "file_attachment" && msg.document_id && !hasImage;
                const showSenderName     = isGroup && !isMine && isFirstFromSender;
                const senderName: string = (msg as any).sender_name ?? (msg as any).sender_full_name ?? "";

                return (
                  <React.Fragment key={msg.id}>
                    {/* Date divider */}
                    {showDate && (
                      <div className="flex items-center justify-center my-3">
                        <span className="bg-white border border-slate-200 text-slate-400 text-[11px] font-medium px-4 py-1 rounded-full shadow-sm">
                          {formatDateDivider(msg.created_at)}
                        </span>
                      </div>
                    )}

                    {/* System notification */}
                    {msg.message_type === "system_notification" && (
                      <div className="flex justify-center my-2">
                        <div className="bg-[#fff3cd] text-[#856404] text-[11px] px-4 py-1.5 rounded-full max-w-[80%] text-center shadow-sm">
                          {msg.content}
                        </div>
                      </div>
                    )}

                    {/* Regular message */}
                    {msg.message_type !== "system_notification" && (
                      <div
                        className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                        style={{ marginBottom: isLastFromSender ? "6px" : "1px" }}>

                        {/* Receiver avatar — only on last message in a run */}
                        {!isMine && (
                          <div className="shrink-0 mb-1">
                            {isLastFromSender
                              ? <Avatar name={senderName || selectedConv.participant_name} url={isGroup ? (msg as any).sender_avatar : selectedConv.avatar_url} size={28} />
                              : <div style={{ width: 28 }} />
                            }
                          </div>
                        )}

                        {/* Bubble column */}
                        <div className={`flex flex-col max-w-[75%] sm:max-w-[65%] ${isMine ? "items-end" : "items-start"}`}>
                          <div
                            className={`px-3 pt-2 pb-1.5 rounded-2xl shadow-sm ${
                              isMine
                                ? "rounded-tr-sm border border-[var(--theme-border,#e0e7ff)]"
                                : "bg-white rounded-tl-sm border border-slate-100"
                            }`}
                            style={isMine ? { background: "#ffffff" } : undefined}>

                            {/* Sender name inside bubble — group threads only */}
                            {showSenderName && senderName && (
                              <p className="text-[11px] font-semibold leading-tight mb-1" style={{ color: "var(--theme-primary)" }}>
                                {senderName}
                              </p>
                            )}

                            {/* Text */}
                            {msg.content && (
                              <p className="text-[14px] leading-[1.5] whitespace-pre-wrap break-words text-slate-900">
                                {msg.content}
                              </p>
                            )}

                            {/* Image attachment */}
                            {hasImage && (
                              <div className={msg.content ? "mt-1.5" : ""}>
                                <ProtectedImage
                                  documentId={msg.document_id!}
                                  name={msg.attachment_name ?? undefined}
                                  onClick={setLightboxSrc}
                                />
                              </div>
                            )}

                            {/* File attachment */}
                            {hasFile && (
                              <div className={msg.content ? "mt-1.5" : ""}>
                                <FileCard
                                  documentId={msg.document_id!}
                                  name={msg.attachment_name ?? undefined}
                                  size={msg.attachment_size ?? undefined}
                                  isMine={isMine}
                                />
                              </div>
                            )}

                            {/* Timestamp + ticks */}
                            <div className="flex items-center gap-1 mt-0.5 justify-end">
                              <span className="text-[10px] whitespace-nowrap text-slate-400">
                                {formatTime(msg.created_at)}
                              </span>
                              {isMine && <Ticks isRead={msg.is_read} />}
                            </div>
                          </div>
                        </div>

                        {/* Spacer on sender side */}
                        {isMine && <div style={{ width: 0 }} className="shrink-0" />}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* File preview strip */}
          {selectedFile && (
            <div className="bg-white border-t border-slate-100 px-4 py-2 flex items-center gap-3 shrink-0">
              {filePreviewUrl
                ? <img src={filePreviewUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200" />
                : (
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--theme-light)" }}>
                    <Paperclip size={16} style={{ color: "var(--theme-primary)" }} />
                  </div>
                )
              }
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-slate-700 font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-400">
                  {selectedFile.size > 1048576
                    ? `${(selectedFile.size / 1048576).toFixed(1)} MB`
                    : `${Math.round(selectedFile.size / 1024)} KB`}
                </p>
              </div>
              <button type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setFilePreviewUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-slate-400 hover:text-red-500 transition p-1 shrink-0">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Compose bar */}
          <div className="bg-white border-t border-slate-200 px-2 sm:px-3 py-2 flex items-end gap-1.5 sm:gap-2 shrink-0">
            {/* Emoji */}
            <div className="relative">
              <button type="button" onClick={() => setShowEmoji(v => !v)}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition ${
                  showEmoji ? "bg-[var(--theme-light)] text-[var(--theme-dark)]" : "text-slate-500 hover:bg-slate-100"
                }`}>
                <Smile size={20} />
              </button>
              {showEmoji && (
                <EmojiPicker
                  onPick={e => setText(t => t + e)}
                  onClose={() => setShowEmoji(false)}
                />
              )}
            </div>

            {/* Attach file */}
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition">
              <Paperclip size={20} />
            </button>
            <input ref={fileInputRef} type="file" className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={e => handleFileChange(e.target.files?.[0] ?? null)} />

            {/* Text input */}
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 sm:px-4 py-2.5 focus-within:bg-white focus-within:border-[var(--theme-primary)] focus-within:ring-2 focus-within:ring-[var(--theme-light)] transition">
              <textarea ref={textareaRef} rows={1} value={text}
                onChange={e => { unlockAudio(); setText(e.target.value); }}
                onKeyDown={e => {
                  unlockAudio();
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Type a message"
                className="w-full bg-transparent text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none leading-[22px] max-h-[100px] overflow-y-auto" />
            </div>

            {/* Send */}
            <button type="button" onClick={handleSend}
              disabled={sending || (!text.trim() && !selectedFile)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white flex items-center justify-center transition disabled:opacity-40 shrink-0 shadow-md hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
              {sending ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </>
      )}
    </main>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex overflow-hidden relative w-full"
      style={{ fontFamily: "Inter, sans-serif", background: "#f8fafc", height: "calc(100dvh - 56px)" }}
    >
      {SidebarPanel}
      {ChatPanel}

      {/* Lightbox */}
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* New conversation modal */}
      {showNewConv && (
        <NewConvModal isHR={isHR} onClose={() => setShowNewConv(false)} onCreate={handleCreateConv} />
      )}
    </div>
  );
};

export default SecureMessaging;