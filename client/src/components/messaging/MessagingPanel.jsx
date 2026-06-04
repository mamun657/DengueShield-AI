import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useMessaging } from "../../context/MessagingContext";

const MessagingPanel = () => {
  const {
    isPanelOpen,
    closePanel,
    activeConversation,
    messages,
    sendMessage,
    isSending,
    typingUser,
    isAdmin,
    socketConnected,
    messagesEndRef,
    emitTyping,
  } = useMessaging();
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState("");
  const myId = user?.id || user?._id;
  const canSend = Boolean(activeConversation?._id) && Boolean(draft.trim()) && !isSending;

  if (!isPanelOpen) return null;

  const peer = isAdmin
    ? activeConversation?.patientId
    : activeConversation?.adminId;
  const peerName = peer?.name || (isAdmin ? "Patient" : "Care Team");

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || isSending) return;
    if (!activeConversation?._id) {
      setSendError("Chat is still loading. Please wait a moment and try again.");
      return;
    }

    const previousDraft = draft;
    setSendError("");
    setDraft("");
    emitTyping(false);

    try {
      await sendMessage(text);
    } catch (error) {
      setDraft(previousDraft);
      setSendError(error?.message || "Failed to send message. Please try again.");
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[min(520px,78vh)] w-[min(380px,92vw)] flex-col overflow-hidden rounded-2xl border border-cyan-200/15 bg-[#0f172a] shadow-[0_20px_48px_rgba(2,6,23,0.65)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Messages</p>
          <p className="text-xs text-slate-400">{peerName}</p>
        </div>
        <button
          type="button"
          onClick={closePanel}
          className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
        >
          Close
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-400">
            No messages yet. Start the conversation.
          </p>
        )}
        {messages.map((msg) => {
          const isMine = String(msg.senderId?._id || msg.senderId) === String(myId);
          return (
            <div
              key={msg._id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  isMine ? "bg-blue-600 text-white" : "bg-white/10 text-slate-200"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <p className="mt-1 text-[10px] opacity-70">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        {typingUser && (
          <p className="text-xs text-cyan-300">{typingUser} is typing...</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-white/10 p-3">
        {sendError && <p className="mb-2 text-xs text-rose-300">{sendError}</p>}
        {!activeConversation?._id && (
          <p className="mb-2 text-xs text-amber-300">Connecting conversation...</p>
        )}
        {!socketConnected && activeConversation?._id && (
          <p className="mb-2 text-xs text-slate-400">Reconnecting to chat server...</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (sendError) setSendError("");
              emitTyping(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border border-white/10 bg-[#111c33] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessagingPanel;
