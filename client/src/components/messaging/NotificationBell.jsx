import { useState, useRef, useEffect } from "react";
import { useMessaging } from "../../context/MessagingContext";

const BellIcon = () => (
  <img 
    width="28" 
    height="28" 
    src="https://img.icons8.com/?size=100&id=4hyKlLz70nhJ&format=png&color=FFFFFF" 
    alt="appointment reminders" 
    className="h-7 w-7 object-contain"
  />
);

const NotificationBell = () => {
  const {
    unreadCount,
    notifications,
    conversations,
    openChat,
    refreshNotifications,
    markNotificationAsRead,
    isAdmin,
  } = useMessaging();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleNotificationClick = async (item) => {
    setOpen(false);

    if (item?._id && !item.read) {
      await markNotificationAsRead(item._id);
    }

    if (item.conversationId) {
      const conv = conversations.find((c) => String(c._id) === String(item.conversationId));
      if (conv) {
        await openChat({ conversation: conv });
        return;
      }
      await openChat({ conversationId: item.conversationId });
      return;
    }
    if (isAdmin && item.relatedUserId) {
      await openChat({ patientId: item.relatedUserId });
      return;
    }
    if (!isAdmin) {
      await openChat();
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          refreshNotifications();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-200 transition hover:bg-white/10 hover:text-white"
        aria-label="Notifications and messages"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-white/10 bg-[#0f172a] shadow-[0_16px_40px_rgba(2,6,23,0.65)]">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
            <p className="text-xs text-slate-400">{unreadCount} unread</p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-slate-400">No notifications yet</p>
            )}
            {notifications.slice(0, 12).map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => handleNotificationClick(item)}
                className={`w-full border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5 ${
                  !item.read ? "bg-cyan-500/5" : ""
                }`}
              >
                <p className="text-xs font-semibold text-white">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{item.body}</p>
              </button>
            ))}
          </div>
          {!isAdmin && (
            <div className="border-t border-white/10 px-4 py-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openChat();
                }}
                className="w-full rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-100 hover:bg-cyan-500/20"
              >
                Message care team
              </button>
            </div>
          )}
          {conversations.length > 0 && (
            <div className="border-t border-white/10 px-4 py-2">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Recent chats
              </p>
              {conversations.slice(0, 4).map((conv) => {
                const peer = isAdmin ? conv.patientId : conv.adminId;
                const unread = isAdmin ? conv.unreadForAdmin : conv.unreadForPatient;
                return (
                  <button
                    key={conv._id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      openChat({ conversation: conv });
                    }}
                    className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs text-slate-200 hover:bg-white/5"
                  >
                    <span>{peer?.name || "Conversation"}</span>
                    {unread > 0 && (
                      <span className="rounded-full bg-rose-500/80 px-2 py-0.5 text-[10px] text-white">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
