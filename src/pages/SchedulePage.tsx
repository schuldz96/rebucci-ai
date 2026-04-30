import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Calendar, Plus, X,
  Clock, User, CheckCircle2, Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import {
  format, parseISO, isSameDay, startOfMonth, endOfMonth,
  eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths,
  addDays, isSameMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Appointment {
  id: string;
  title: string;
  date: string;
  time?: string;
  status: "pending" | "done" | "cancelled";
  customer_id?: string;
  customer_name?: string;
  type: "feedback" | "consultation" | "return" | "other";
}

type ViewMode = "month" | "week" | "day";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_FULL = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const TYPE_COLOR: Record<string, string> = {
  feedback: "bg-blue-500",
  consultation: "bg-violet-500",
  return: "bg-green-500",
  other: "bg-gray-500",
};

const TYPE_LABEL: Record<string, string> = {
  feedback: "Feedback",
  consultation: "Consulta",
  return: "Retorno",
  other: "Outro",
};

// ─── Modal de novo agendamento ────────────────────────────────────────────────

const NewAppointmentModal = ({
  date,
  coachId,
  onClose,
  onSaved,
}: {
  date: Date;
  coachId: string;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: "",
    date: format(date, "yyyy-MM-dd"),
    time: "09:00",
    type: "consultation",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: "Título é obrigatório", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("appointments").insert({
      coach_id: coachId,
      title: form.title,
      date: form.date,
      time: form.time || null,
      type: form.type,
      status: "pending",
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast({ title: "Erro ao criar agendamento", variant: "destructive" }); return; }
    toast({ title: "Agendamento criado!" });
    onSaved();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Novo Agendamento</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Título *</label>
            <Input className="mt-1" placeholder="Ex: Consulta de retorno" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Data</label>
              <Input className="mt-1" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Horário</label>
              <Input className="mt-1" type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Tipo</label>
            <select
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
            >
              <option value="consultation">Consulta</option>
              <option value="feedback">Feedback</option>
              <option value="return">Retorno</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Observações</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              placeholder="Opcional..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Criar agendamento"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const SchedulePage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const today = new Date();

  const fetchAppointments = async () => {
    if (!user) return;
    setLoading(true);
    const monthStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");

    const { data } = await supabase
      .from("appointments")
      .select("*, customers(name)")
      .eq("coach_id", user.id)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    setAppointments(
      (data ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        date: a.date,
        time: a.time,
        status: a.status,
        type: a.type ?? "other",
        customer_id: a.customer_id,
        customer_name: (a.customers as any)?.name,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, [user, currentDate]);

  const getAppointmentsForDay = (date: Date) =>
    appointments.filter((a) => isSameDay(parseISO(a.date), date));

  const selectedDayAppointments = getAppointmentsForDay(selectedDay);

  // Gera dias do grid mensal (6 semanas)
  const monthDays = (() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  })();

  const toggleDone = async (appt: Appointment) => {
    const newStatus = appt.status === "done" ? "pending" : "done";
    await supabase.from("appointments").update({ status: newStatus }).eq("id", appt.id);
    setAppointments((prev) => prev.map((a) => a.id === appt.id ? { ...a, status: newStatus } : a));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Minha Agenda</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Consultas, retornos, feedbacks e compromissos</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </Button>
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date()); }}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-base font-semibold text-foreground ml-2 capitalize">
              {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>

          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["month", "week", "day"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium transition-colors",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-hidden flex">
        {/* Calendário */}
        <div className="flex-1 overflow-auto">
          {view === "month" && (
            <div className="h-full flex flex-col p-2">
              {/* Cabeçalho dias */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS_FULL.map((d) => (
                  <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 flex-1 border-l border-t border-border">
                {monthDays.map((day, idx) => {
                  const dayAppts = getAppointmentsForDay(day);
                  const isToday = isSameDay(day, today);
                  const isSelected = isSameDay(day, selectedDay);
                  const isCurrentMonth = isSameMonth(day, currentDate);

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "border-r border-b border-border p-1.5 min-h-[90px] cursor-pointer transition-colors",
                        !isCurrentMonth && "bg-muted/20",
                        isSelected && "bg-primary/5",
                        "hover:bg-muted/30"
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                          isToday ? "bg-primary text-primary-foreground" :
                          !isCurrentMonth ? "text-muted-foreground/40" :
                          "text-foreground"
                        )}
                      >
                        {format(day, "d")}
                      </span>

                      {/* Eventos */}
                      <div className="mt-0.5 space-y-0.5">
                        {dayAppts.slice(0, 2).map((a) => (
                          <div
                            key={a.id}
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-medium text-white truncate",
                              TYPE_COLOR[a.type],
                              a.status === "done" && "opacity-50 line-through"
                            )}
                          >
                            {a.time ? `${a.time.slice(0, 5)} ` : ""}{a.title}
                          </div>
                        ))}
                        {dayAppts.length > 2 && (
                          <p className="text-[10px] text-muted-foreground px-1">+{dayAppts.length - 2} mais</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view !== "month" && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Visão de {view === "week" ? "semana" : "dia"} em implementação</p>
              </div>
            </div>
          )}
        </div>

        {/* Painel lateral — dia selecionado */}
        <div className="w-72 border-l border-border flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground capitalize">
              {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
            {isSameDay(selectedDay, today) && (
              <span className="text-xs text-primary">Hoje</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedDayAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Calendar className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs text-center">Nenhum agendamento neste dia</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  + Adicionar
                </button>
              </div>
            ) : (
              selectedDayAppointments.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "rounded-xl border p-3 space-y-1.5 transition-colors",
                    a.status === "done" ? "border-border opacity-60" : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", TYPE_COLOR[a.type])} />
                      <p className={cn("text-sm font-medium text-foreground truncate", a.status === "done" && "line-through")}>
                        {a.title}
                      </p>
                    </div>
                    <button onClick={() => toggleDone(a)} className="shrink-0">
                      {a.status === "done"
                        ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                        : <Circle className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                      }
                    </button>
                  </div>

                  {a.time && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {a.time.slice(0, 5)}
                    </p>
                  )}

                  {a.customer_name && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {a.customer_name}
                    </p>
                  )}

                  <span className="inline-block text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {TYPE_LABEL[a.type]}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-border">
            <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setShowModal(true)}>
              <Plus className="w-3.5 h-3.5" />
              Novo agendamento
            </Button>
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && user && (
          <NewAppointmentModal
            date={selectedDay}
            coachId={user.id}
            onClose={() => setShowModal(false)}
            onSaved={() => { setShowModal(false); fetchAppointments(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SchedulePage;
