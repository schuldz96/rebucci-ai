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
  addDays, addWeeks, subWeeks, isSameMonth, isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Appointment {
  id: string;
  title: string;
  date: string;
  time?: string;
  status: "scheduled" | "completed" | "cancelled" | "pending" | "done";
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

// ─── Tipos auxiliares ─────────────────────────────────────────────────────────

interface CustomerOption {
  id: string;
  name: string;
  consultoria_id: string | null;
  consultoria_status: string | null;
}

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
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("consultorias")
        .select("id, status, customers(id, name)")
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false });

      if (!data) return;

      const seen = new Set<string>();
      const options: CustomerOption[] = [];
      for (const c of data) {
        const customer = c.customers as any;
        if (!customer || seen.has(customer.id)) continue;
        seen.add(customer.id);
        options.push({
          id: customer.id,
          name: customer.name,
          consultoria_id: c.id,
          consultoria_status: c.status,
        });
      }
      setCustomers(options);
    };
    if (form.type === "feedback") load();
  }, [form.type, coachId]);

  const visibleCustomers = customers.filter((c) =>
    showInactive ? true : c.consultoria_status === "active"
  );

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: "Título é obrigatório", variant: "destructive" }); return; }
    if (form.type === "feedback" && !selectedCustomerId) {
      toast({ title: "Selecione um cliente para o feedback", variant: "destructive" });
      return;
    }
    setSaving(true);
    const scheduled_at = `${form.date}T${form.time || "00:00"}`;

    const { error } = await supabase.from("appointments").insert({
      coach_id: coachId,
      title: form.title,
      scheduled_at,
      type: form.type,
      status: "scheduled",
      customer_id: form.type === "feedback" ? selectedCustomerId : null,
      notes: form.notes || null,
    });

    if (!error && form.type === "feedback") {
      const customer = customers.find((c) => c.id === selectedCustomerId);
      await supabase.from("feedbacks").insert({
        coach_id: coachId,
        customer_id: selectedCustomerId,
        consultoria_id: customer?.consultoria_id ?? null,
        scheduled_for: `${form.date}T${form.time || "00:00"}`,
        status: "pending",
        has_photos: false,
      });
    }

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
              onChange={(e) => { set("type", e.target.value); setSelectedCustomerId(""); }}
            >
              <option value="consultation">Consulta</option>
              <option value="feedback">Feedback</option>
              <option value="return">Retorno</option>
              <option value="other">Outro</option>
            </select>
          </div>

          {form.type === "feedback" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-foreground">Cliente *</label>
                <button
                  type="button"
                  onClick={() => setShowInactive((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showInactive ? "Mostrar apenas ativos" : "Incluir inativos"}
                </button>
              </div>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
              >
                <option value="">Selecione um cliente...</option>
                {visibleCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.consultoria_status !== "active" ? " (inativo)" : ""}
                  </option>
                ))}
              </select>
              {visibleCustomers.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {showInactive ? "Nenhum cliente encontrado." : "Nenhum cliente ativo. Clique em \"Incluir inativos\" para ver todos."}
                </p>
              )}
            </div>
          )}

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
    const monthStart = format(startOfMonth(currentDate), "yyyy-MM-dd'T'00:00:00");
    const monthEnd = format(endOfMonth(currentDate), "yyyy-MM-dd'T'23:59:59");

    const { data } = await supabase
      .from("appointments")
      .select("*, customers(name)")
      .eq("coach_id", user.id)
      .gte("scheduled_at", monthStart)
      .lte("scheduled_at", monthEnd)
      .order("scheduled_at", { ascending: true });

    setAppointments(
      (data ?? []).map((a) => {
        const dt = a.scheduled_at ? parseISO(a.scheduled_at) : null;
        return {
          id: a.id,
          title: a.title,
          date: dt ? format(dt, "yyyy-MM-dd") : (a.date ?? ""),
          time: dt ? format(dt, "HH:mm") : (a.time ?? ""),
          status: a.status,
          type: a.type ?? "other",
          customer_id: a.customer_id,
          customer_name: (a.customers as any)?.name,
        };
      })
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
    const newStatus = appt.status === "completed" ? "scheduled" : "completed";
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
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
              if (view === "month") setCurrentDate(subMonths(currentDate, 1));
              else if (view === "week") { const d = subWeeks(currentDate, 1); setCurrentDate(d); setSelectedDay(d); }
              else { const d = addDays(selectedDay, -1); setSelectedDay(d); setCurrentDate(d); }
            }}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date()); }}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
              if (view === "month") setCurrentDate(addMonths(currentDate, 1));
              else if (view === "week") { const d = addWeeks(currentDate, 1); setCurrentDate(d); setSelectedDay(d); }
              else { const d = addDays(selectedDay, 1); setSelectedDay(d); setCurrentDate(d); }
            }}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-base font-semibold text-foreground ml-2 capitalize">
              {view === "month"
                ? format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
                : view === "week"
                ? `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), "d MMM", { locale: ptBR })} – ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), "d MMM yyyy", { locale: ptBR })}`
                : format(selectedDay, "d 'de' MMMM yyyy", { locale: ptBR })
              }
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
                              (a.status === "done" || a.status === "completed") && "opacity-50 line-through"
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

          {view === "week" && (() => {
            const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
            const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
            const HOURS = Array.from({ length: 24 }, (_, i) => i);
            return (
              <div className="flex flex-col h-full">
                {/* Cabeçalho dias */}
                <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-border shrink-0">
                  <div />
                  {weekDays.map((d, i) => (
                    <div
                      key={i}
                      onClick={() => { setSelectedDay(d); setView("day"); }}
                      className={cn(
                        "text-center py-2 cursor-pointer hover:bg-muted/30 transition-colors",
                        isSameDay(d, today) && "text-primary"
                      )}
                    >
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase">{WEEKDAYS[i]}</p>
                      <p className={cn(
                        "text-sm font-bold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full mx-auto",
                        isSameDay(d, today) ? "bg-primary text-primary-foreground" : "text-foreground"
                      )}>
                        {format(d, "d")}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Grade de horas */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-[48px_repeat(7,1fr)]">
                    {HOURS.map((h) => (
                      <>
                        <div key={`h-${h}`} className="text-[10px] text-muted-foreground text-right pr-2 pt-0.5 border-t border-border/40 h-14 shrink-0">
                          {h > 0 ? `${String(h).padStart(2, "0")}:00` : ""}
                        </div>
                        {weekDays.map((d, di) => {
                          const slotAppts = appointments.filter((a) => {
                            if (!isSameDay(parseISO(a.date), d)) return false;
                            const apptH = a.time ? parseInt(a.time.slice(0, 2)) : -1;
                            return apptH === h;
                          });
                          return (
                            <div
                              key={`${h}-${di}`}
                              onClick={() => setSelectedDay(d)}
                              className={cn(
                                "border-t border-l border-border/40 h-14 p-0.5 relative cursor-pointer hover:bg-muted/10 transition-colors",
                                isSameDay(d, selectedDay) && "bg-primary/5"
                              )}
                            >
                              {slotAppts.map((a) => (
                                <div
                                  key={a.id}
                                  className={cn(
                                    "text-[10px] px-1 py-0.5 rounded text-white font-medium truncate",
                                    TYPE_COLOR[a.type],
                                    (a.status === "completed" || a.status === "done") && "opacity-50"
                                  )}
                                  title={a.title}
                                >
                                  {a.time?.slice(0, 5)} {a.title}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {view === "day" && (() => {
            const HOURS = Array.from({ length: 24 }, (_, i) => i);
            const dayAppts = getAppointmentsForDay(selectedDay);
            return (
              <div className="flex flex-col h-full">
                {/* Cabeçalho */}
                <div className="shrink-0 px-4 py-3 border-b border-border text-center">
                  <p className={cn("text-sm font-bold", isSameDay(selectedDay, today) && "text-primary")}>
                    {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
                {/* Grade de horas */}
                <div className="flex-1 overflow-y-auto">
                  {HOURS.map((h) => {
                    const slotAppts = dayAppts.filter((a) => {
                      const apptH = a.time ? parseInt(a.time.slice(0, 2)) : -1;
                      return apptH === h;
                    });
                    return (
                      <div key={h} className="flex border-t border-border/40 min-h-[56px]">
                        <div className="w-16 shrink-0 text-[11px] text-muted-foreground text-right pr-3 pt-1">
                          {h > 0 ? `${String(h).padStart(2, "0")}:00` : ""}
                        </div>
                        <div className="flex-1 p-1 space-y-1">
                          {slotAppts.map((a) => (
                            <div
                              key={a.id}
                              className={cn(
                                "rounded-lg px-3 py-2 text-white text-sm font-medium flex items-center justify-between gap-2",
                                TYPE_COLOR[a.type],
                                (a.status === "completed" || a.status === "done") && "opacity-50"
                              )}
                            >
                              <div className="min-w-0">
                                <p className={cn("font-semibold truncate", (a.status === "completed" || a.status === "done") && "line-through")}>
                                  {a.time?.slice(0, 5)} · {a.title}
                                </p>
                                {a.customer_name && (
                                  <p className="text-xs opacity-80 truncate">{a.customer_name}</p>
                                )}
                              </div>
                              <button
                                onClick={() => toggleDone(a)}
                                className="shrink-0 opacity-80 hover:opacity-100"
                              >
                                {(a.status === "completed" || a.status === "done")
                                  ? <CheckCircle2 className="w-4 h-4" />
                                  : <Circle className="w-4 h-4" />
                                }
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
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
                    (a.status === "done" || a.status === "completed") ? "border-border opacity-60" : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", TYPE_COLOR[a.type])} />
                      <p className={cn("text-sm font-medium text-foreground truncate", (a.status === "done" || a.status === "completed") && "line-through")}>
                        {a.title}
                      </p>
                    </div>
                    <button onClick={() => toggleDone(a)} className="shrink-0">
                      {(a.status === "done" || a.status === "completed")
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
