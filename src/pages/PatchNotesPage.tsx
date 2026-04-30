import { Sparkles, Bug, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PatchNote {
  version: string;
  date: string;
  label: "novo" | "melhoria" | "correção";
  items: string[];
}

const PATCH_NOTES: PatchNote[] = [
  {
    version: "1.3.0",
    date: "29/04/2026",
    label: "novo",
    items: [
      "Conquistas e sistema de XP para coaches",
      "Central de notificações com histórico completo",
      "Notas de atualização (esta página!)",
      "Integração Digital Manager Guru via webhook",
      "Configurações da conta: perfil, coaching, automações e financeiro",
      "Assinatura com planos Starter, Pro e Elite",
    ],
  },
  {
    version: "1.2.0",
    date: "28/04/2026",
    label: "novo",
    items: [
      "Perfil completo do aluno com 11 abas funcionais",
      "Anamnese com formulário de saúde salvo no banco",
      "Avaliações físicas com histórico de medidas",
      "Atribuição de treinos e dietas da biblioteca ao aluno",
      "Registros de cardio com tipo, duração e distância",
      "Exames com link para arquivo externo",
      "Fotos de progresso por ângulo e data",
      "Agendamentos por aluno integrados à agenda",
    ],
  },
  {
    version: "1.1.0",
    date: "27/04/2026",
    label: "novo",
    items: [
      "Módulo de afiliados com código único e rastreio de comissão",
      "Recuperação de carrinho abandonado com pipeline de status",
      "Importação em lote de clientes via CSV",
      "Importação de protocolos de treino/dieta via CSV",
      "Grupos de alunos com CRUD completo",
      "Engajamento dos alunos com score calculado em tempo real",
      "Alunos inativos com reativação em 1 clique",
    ],
  },
  {
    version: "1.0.0",
    date: "26/04/2026",
    label: "novo",
    items: [
      "Dashboard com 7 cards clicáveis e indicadores em tempo real",
      "Agenda com calendário mensal, criação de compromissos e toggle de conclusão",
      "Módulo financeiro com controle de receitas, despesas e cobranças",
      "Biblioteca de treinos com CRUD, duplicação e filtros",
      "Biblioteca de dietas com macros e filtros",
      "Gestão de produtos/planos com editor em 7 etapas",
      "Formulário público de feedback com validação de token",
      "Página de feedbacks com filtros por status, fotos e sort",
    ],
  },
];

const LABEL_CONFIG = {
  novo:      { label: "Novo",     icon: Sparkles, color: "text-primary bg-primary/10 border-primary/30" },
  melhoria:  { label: "Melhoria", icon: Zap,      color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  "correção":{ label: "Correção", icon: Bug,      color: "text-green-400 bg-green-400/10 border-green-400/30" },
};

const PatchNotesPage = () => (
  <div className="flex flex-col h-full overflow-hidden">
    <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
      <h1 className="text-2xl font-bold text-foreground">Notas de Atualização</h1>
      <p className="text-sm text-muted-foreground mt-0.5">Histórico de versões e novidades da plataforma</p>
    </div>

    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl space-y-6">
        {PATCH_NOTES.map((note, i) => {
          const cfg = LABEL_CONFIG[note.label];
          const Icon = cfg.icon;
          return (
            <div key={note.version} className={cn("rounded-xl border p-5", i === 0 ? "border-primary/40 bg-primary/5" : "border-border")}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-foreground">v{note.version}</span>
                  <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", cfg.color)}>
                    <Icon className="w-3 h-3" />{cfg.label}
                  </span>
                  {i === 0 && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/30">Atual</span>}
                </div>
                <span className="text-xs text-muted-foreground">{note.date}</span>
              </div>
              <ul className="space-y-1.5">
                {note.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

export default PatchNotesPage;
