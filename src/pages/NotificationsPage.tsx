import { useState, useEffect } from "react";
import { Bell, CheckCheck, Loader2, RefreshCw, User, Calendar, MessageCircle, DollarSign, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  type: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
  customer_id?: string;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  feedback:  MessageCircle,
  birthday:  User,
  expiring:  AlertTriangle,
  payment:   DollarSign,
  schedule:  Calendar,
  default:   Bell,
};

const TYPE_COLOR: Record<string, string> = {
  feedback:  "text-blue-400 bg-blue-400/10",
  birthday:  "text-pink-400 bg-pink-400/10",
  expiring:  "text-orange-400 bg-orange-400/10",
  payment:   "text-green-400 bg-green-400/10",
  schedule:  "text-violet-400 bg-violet-400/10",
  default:   "text-muted-foreground bg-muted",
};

const NotificationsPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setNotifications(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    setMarkingAll(true);
    await supabase.from("notifications").update({ is_read: true }).eq("coach_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setMarkingAll(false);
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.is_read) await markRead(notif.id);
    if (notif.link) navigate(notif.link);
    else if (notif.customer_id) navigate(`/customers/${notif.customer_id}`);
  };

  const filtered = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {unreadCount > 0 ? `${unreadCount} não lida${unreadCount !== 1 ? "s" : ""}` : "Todas lidas"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={load}>
              <RefreshCw className="w-4 h-4" /> Atualizar
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead} disabled={markingAll}>
                <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                filter === f ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              {f === "all" ? "Todas" : `Não lidas ${unreadCount > 0 ? `(${unreadCount})` : ""}`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Bell className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">{filter === "unread" ? "Nenhuma notificação não lida" : "Nenhuma notificação ainda"}</p>
            <p className="text-xs mt-1">As notificações aparecem automaticamente conforme ações do sistema</p>
          </div>
        ) : (
          <div>
            {filtered.map((notif) => {
              const type = notif.type in TYPE_ICON ? notif.type : "default";
              const Icon = TYPE_ICON[type];
              const color = TYPE_COLOR[type];
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={cn(
                    "w-full flex items-start gap-4 px-6 py-4 border-b border-border text-left transition-colors hover:bg-muted/20",
                    !notif.is_read && "bg-primary/5"
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", !notif.is_read ? "font-semibold text-foreground" : "text-foreground/80")}>{notif.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(notif.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
