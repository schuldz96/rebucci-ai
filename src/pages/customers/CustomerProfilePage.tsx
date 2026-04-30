import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Calendar, ClipboardList, Star, Salad, Dumbbell, Activity, FlaskConical, MessageCircle, Camera, StickyNote, Check, Eye, Mail, CalendarDays, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "progress", label: "Progresso", icon: TrendingUp },
  { id: "scheduling", label: "Agendamentos", icon: Calendar },
  { id: "anamnesis", label: "Anamnese", icon: ClipboardList },
  { id: "evaluations", label: "Avaliações", icon: Star },
  { id: "diets", label: "Dietas", icon: Salad },
  { id: "workouts", label: "Treinos", icon: Dumbbell },
  { id: "cardio", label: "Cardio", icon: Activity },
  { id: "exams", label: "Exames", icon: FlaskConical },
  { id: "feedbacks", label: "Feedbacks", icon: MessageCircle },
  { id: "photos", label: "Fotos", icon: Camera },
  { id: "notes", label: "Notas", icon: StickyNote },
];

const CustomerProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("progress");

  const initials = "AL";
  const bannerColor = "from-blue-600 to-blue-800";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header com banner */}
      <div className="shrink-0">
        {/* Voltar */}
        <div className="px-6 pt-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>

        {/* Banner */}
        <div className={`h-28 bg-gradient-to-r ${bannerColor} relative mx-6 mt-3 rounded-xl`} />

        {/* Info do aluno */}
        <div className="px-6 pb-0 -mt-8">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground border-4 border-background shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">Aluno #{id}</h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">App instalado</span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span>-- kg</span>
                <span>-- cm</span>
                <span>-- anos</span>
                <span>IMC --</span>
              </div>
            </div>
            {/* Botões de ação */}
            <div className="flex items-center gap-1.5 pb-2 shrink-0">
              {[
                { icon: Check, title: "Marcar como entregue" },
                { icon: Eye, title: "Ver formulário do aluno" },
                { icon: Mail, title: "Enviar e-mail" },
                { icon: CalendarDays, title: "Agendar" },
                { icon: MessageSquare, title: "WhatsApp" },
              ].map(({ icon: Icon, title }) => (
                <button key={title} title={title} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 px-6 border-b border-border">
          <div className="flex gap-0 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo da aba */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "progress" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Evolução de Peso</h3>
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                Gráfico de peso — será implementado no Sprint 2
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["Hidratação", "% Gordura Corporal", "Avaliações"].map((section) => (
                <div key={section} className="rounded-xl border border-border p-4">
                  <h4 className="font-medium text-sm text-foreground mb-2">{section}</h4>
                  <p className="text-xs text-muted-foreground">Sem dados registrados</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Progressão de Exercícios por Grupo Muscular</h3>
              <p className="text-sm text-muted-foreground">Nenhum exercício registrado</p>
            </div>
          </div>
        )}

        {activeTab !== "progress" && (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              {(() => { const tab = TABS.find(t => t.id === activeTab); return tab ? <tab.icon className="w-10 h-10 mx-auto mb-2 opacity-30" /> : null; })()}
              <p className="text-sm font-medium">{TABS.find(t => t.id === activeTab)?.label} — Sprint 2</p>
              <p className="text-xs mt-1 opacity-60">Conteúdo em implementação</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerProfilePage;
