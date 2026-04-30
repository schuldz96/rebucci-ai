import { useState, useEffect } from "react";
import { Trophy, Star, Target, Users, MessageCircle, TrendingUp, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";

interface Stats {
  totalStudents: number;
  activeStudents: number;
  totalFeedbacks: number;
  answeredFeedbacks: number;
  totalRevenue: number;
}

interface Award {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  check: (s: Stats) => boolean;
  progress: (s: Stats) => { current: number; target: number };
  xp: number;
}

const AWARDS: Award[] = [
  {
    id: "first_student",
    title: "Primeiro Passo",
    description: "Cadastre seu primeiro aluno",
    icon: Users,
    color: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    check: (s) => s.totalStudents >= 1,
    progress: (s) => ({ current: Math.min(s.totalStudents, 1), target: 1 }),
    xp: 50,
  },
  {
    id: "five_students",
    title: "Treinador em Crescimento",
    description: "Tenha 5 alunos cadastrados",
    icon: Users,
    color: "text-violet-400 bg-violet-400/10 border-violet-400/30",
    check: (s) => s.totalStudents >= 5,
    progress: (s) => ({ current: Math.min(s.totalStudents, 5), target: 5 }),
    xp: 150,
  },
  {
    id: "twenty_students",
    title: "Turma Cheia",
    description: "Tenha 20 alunos ativos simultaneamente",
    icon: Users,
    color: "text-green-400 bg-green-400/10 border-green-400/30",
    check: (s) => s.activeStudents >= 20,
    progress: (s) => ({ current: Math.min(s.activeStudents, 20), target: 20 }),
    xp: 500,
  },
  {
    id: "fifty_students",
    title: "Coach Elite",
    description: "Tenha 50 alunos ativos",
    icon: Trophy,
    color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    check: (s) => s.activeStudents >= 50,
    progress: (s) => ({ current: Math.min(s.activeStudents, 50), target: 50 }),
    xp: 2000,
  },
  {
    id: "first_feedback",
    title: "Ouvinte Ativo",
    description: "Receba seu primeiro feedback respondido",
    icon: MessageCircle,
    color: "text-teal-400 bg-teal-400/10 border-teal-400/30",
    check: (s) => s.answeredFeedbacks >= 1,
    progress: (s) => ({ current: Math.min(s.answeredFeedbacks, 1), target: 1 }),
    xp: 50,
  },
  {
    id: "ten_feedbacks",
    title: "Coach Engajado",
    description: "Receba 10 feedbacks respondidos",
    icon: MessageCircle,
    color: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    check: (s) => s.answeredFeedbacks >= 10,
    progress: (s) => ({ current: Math.min(s.answeredFeedbacks, 10), target: 10 }),
    xp: 200,
  },
  {
    id: "fifty_feedbacks",
    title: "Mestre do Feedback",
    description: "Receba 50 feedbacks respondidos",
    icon: Star,
    color: "text-orange-400 bg-orange-400/10 border-orange-400/30",
    check: (s) => s.answeredFeedbacks >= 50,
    progress: (s) => ({ current: Math.min(s.answeredFeedbacks, 50), target: 50 }),
    xp: 1000,
  },
  {
    id: "revenue_1k",
    title: "Primeira Renda",
    description: "Fature R$ 1.000 em consultorias",
    icon: TrendingUp,
    color: "text-green-400 bg-green-400/10 border-green-400/30",
    check: (s) => s.totalRevenue >= 1000,
    progress: (s) => ({ current: Math.min(s.totalRevenue, 1000), target: 1000 }),
    xp: 300,
  },
  {
    id: "revenue_10k",
    title: "Negócio Sólido",
    description: "Fature R$ 10.000 em consultorias",
    icon: Trophy,
    color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    check: (s) => s.totalRevenue >= 10000,
    progress: (s) => ({ current: Math.min(s.totalRevenue, 10000), target: 10000 }),
    xp: 2000,
  },
  {
    id: "hundred_students",
    title: "Lenda do Coaching",
    description: "Tenha 100 alunos ativos",
    icon: Trophy,
    color: "text-orange-400 bg-orange-400/10 border-orange-400/30",
    check: (s) => s.activeStudents >= 100,
    progress: (s) => ({ current: Math.min(s.activeStudents, 100), target: 100 }),
    xp: 5000,
  },
];

const LEVELS = [
  { name: "Iniciante",  minXp: 0,     color: "text-muted-foreground" },
  { name: "Bronze",     minXp: 100,   color: "text-orange-700" },
  { name: "Prata",      minXp: 500,   color: "text-slate-400" },
  { name: "Ouro",       minXp: 2000,  color: "text-yellow-400" },
  { name: "Platina",    minXp: 5000,  color: "text-teal-400" },
  { name: "Diamante",   minXp: 10000, color: "text-blue-400" },
];

const AwardsPage = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [
        { count: totalStudents },
        { count: activeStudents },
        { count: totalFeedbacks },
        { count: answeredFeedbacks },
        { data: revenueData },
      ] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
        supabase.from("consultorias").select("id", { count: "exact", head: true }).eq("coach_id", user.id).eq("status", "active"),
        supabase.from("feedbacks").select("id", { count: "exact", head: true }).eq("coach_id", user.id),
        supabase.from("feedbacks").select("id", { count: "exact", head: true }).eq("coach_id", user.id).eq("status", "answered"),
        supabase.from("consultorias").select("value").eq("coach_id", user.id).eq("payment_status", "paid"),
      ]);
      const totalRevenue = (revenueData ?? []).reduce((s: number, r: any) => s + (r.value ?? 0), 0);
      setStats({
        totalStudents: totalStudents ?? 0,
        activeStudents: activeStudents ?? 0,
        totalFeedbacks: totalFeedbacks ?? 0,
        answeredFeedbacks: answeredFeedbacks ?? 0,
        totalRevenue,
      });
      setLoading(false);
    })();
  }, [user]);

  if (loading) return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Conquistas</h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    </div>
  );

  const earnedAwards = AWARDS.filter((a) => stats && a.check(stats));
  const totalXp = earnedAwards.reduce((s, a) => s + a.xp, 0);
  const currentLevel = [...LEVELS].reverse().find((l) => totalXp >= l.minXp) ?? LEVELS[0];
  const nextLevel = LEVELS[LEVELS.findIndex((l) => l.name === currentLevel.name) + 1];
  const levelProgress = nextLevel ? Math.round(((totalXp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)) * 100) : 100;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Conquistas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Desbloqueie medalhas conforme evolui na plataforma</p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Nível e XP */}
        <div className="rounded-xl border border-border p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Trophy className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={cn("font-bold text-lg", currentLevel.color)}>{currentLevel.name}</p>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{totalXp} XP</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {nextLevel ? `Próximo nível: ${nextLevel.name} (${nextLevel.minXp} XP)` : "Nível máximo atingido!"}
              </p>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${levelProgress}%` }} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-foreground">{earnedAwards.length}</p>
              <p className="text-xs text-muted-foreground">de {AWARDS.length}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total de alunos", value: stats?.totalStudents ?? 0, icon: Users },
            { label: "Alunos ativos", value: stats?.activeStudents ?? 0, icon: Target },
            { label: "Feedbacks recebidos", value: stats?.answeredFeedbacks ?? 0, icon: MessageCircle },
            { label: "Receita total", value: `R$ ${(stats?.totalRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-border p-3 text-center">
              <Icon className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Conquistas */}
        <div>
          <h3 className="font-semibold text-foreground mb-3">Medalhas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AWARDS.map((award) => {
              const earned = stats ? award.check(stats) : false;
              const prog = stats ? award.progress(stats) : { current: 0, target: 1 };
              const pct = Math.round((prog.current / prog.target) * 100);
              const Icon = award.icon;

              return (
                <div
                  key={award.id}
                  className={cn(
                    "rounded-xl border p-4 flex items-start gap-3 transition-all",
                    earned ? award.color : "border-border opacity-60"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", earned ? award.color : "bg-muted text-muted-foreground")}>
                    {earned ? <Icon className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={cn("font-semibold text-sm", earned ? "text-foreground" : "text-muted-foreground")}>{award.title}</p>
                      <span className="text-xs text-muted-foreground">{award.xp} XP</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{award.description}</p>
                    {!earned && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                          <span>{prog.current} / {prog.target}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/50 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                    {earned && <p className="text-[10px] text-green-400 mt-1 font-semibold">✓ Conquistado</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AwardsPage;
