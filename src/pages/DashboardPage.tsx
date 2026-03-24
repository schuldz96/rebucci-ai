import { motion } from "framer-motion";
import {
  Users,
  MessageSquare,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
} from "lucide-react";

const stats = [
  { label: "Total Leads", value: "1.247", change: "+12.5%", up: true, icon: Users, color: "text-primary" },
  { label: "Conversas Ativas", value: "89", change: "+8.2%", up: true, icon: MessageSquare, color: "text-accent" },
  { label: "Receita Mensal", value: "R$ 47.8k", change: "+23.1%", up: true, icon: DollarSign, color: "text-success" },
  { label: "Taxa de Conversão", value: "34.2%", change: "-2.4%", up: false, icon: TrendingUp, color: "text-warning" },
];

const recentActivities = [
  { text: "Ana Silva avançou para 'Qualificado'", time: "5 min atrás" },
  { text: "Nova mensagem de Carlos Mendes", time: "12 min atrás" },
  { text: "Negócio 'Consultoria IA' fechado - R$ 12.000", time: "1h atrás" },
  { text: "Agente IA respondeu 23 mensagens", time: "2h atrás" },
  { text: "Nova base RAG criada: 'Base Vendas'", time: "3h atrás" },
  { text: "Roberto Alves abriu ticket de suporte", time: "4h atrás" },
];

const DashboardPage = () => {
  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do seu CRM</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="surface-elevated p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className={`text-xs font-medium flex items-center gap-0.5 ${stat.up ? "text-success" : "text-destructive"}`}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="surface-elevated p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Atividade Recente</h2>
          <div className="space-y-4">
            {recentActivities.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                <div>
                  <p className="text-sm text-foreground">{a.text}</p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* AI Summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="surface-elevated p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Resumo IA</h2>
          </div>
          <div className="space-y-4 text-sm text-secondary-foreground">
            <p>
              📊 Hoje seus agentes responderam <strong className="text-foreground">47 mensagens</strong> automaticamente com taxa de satisfação de <strong className="text-foreground">94%</strong>.
            </p>
            <p>
              🔥 <strong className="text-foreground">3 leads quentes</strong> identificados — Ana Silva, Carlos Mendes e Pedro Santos estão prontos para conversão.
            </p>
            <p>
              💡 Sugestão: O lead "Juliana Costa" não recebeu follow-up há 48h. Recomendo ativação do agente de reengajamento.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
