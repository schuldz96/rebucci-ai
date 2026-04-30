import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewMode = "month" | "week" | "day";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const getDaysInMonth = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { date: number; month: "prev" | "current" | "next" }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: prevMonthDays - i, month: "prev" });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: d, month: "current" });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: d, month: "next" });
  }
  return cells;
};

const SchedulePage = () => {
  const today = new Date();
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const cells = getDaysInMonth(year, month);

  const navigate = (dir: -1 | 1) => {
    setCurrentDate(new Date(year, month + dir, 1));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Minha Agenda</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie suas consultas, retornos, feedbacks e compromissos
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <CheckSquare className="w-4 h-4" />
            Seleção em massa
          </Button>
        </div>

        {/* Controles de navegação */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-base font-semibold text-foreground ml-2">
              {MONTHS[month]} de {year}
            </span>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["month", "week", "day"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium transition-colors",
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendário */}
      <div className="flex-1 overflow-auto p-4">
        {view === "month" && (
          <div className="h-full flex flex-col">
            {/* Header dias da semana */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Grade de dias */}
            <div className="grid grid-cols-7 flex-1 border-l border-t border-border">
              {cells.map((cell, idx) => {
                const isToday =
                  cell.month === "current" &&
                  cell.date === today.getDate() &&
                  month === today.getMonth() &&
                  year === today.getFullYear();

                return (
                  <div
                    key={idx}
                    className={cn(
                      "border-r border-b border-border p-1.5 min-h-[100px] relative",
                      cell.month !== "current" && "bg-muted/30"
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ml-auto",
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : cell.month === "current"
                          ? "text-foreground"
                          : "text-muted-foreground/50"
                      )}
                    >
                      {cell.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view !== "month" && (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Visão de {view === "week" ? "semana" : "dia"} em implementação</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulePage;
