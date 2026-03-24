import { useState } from "react";
import { mockRAGBases, mockInstances } from "@/data/mockData";
import { motion } from "framer-motion";
import { Database, Plus, Send, Bot } from "lucide-react";

const AIRagPage = () => {
  const [testQuestion, setTestQuestion] = useState("");
  const [testAnswer, setTestAnswer] = useState("");
  const [testing, setTesting] = useState(false);
  const [newBaseName, setNewBaseName] = useState("");
  const [selectedInstance, setSelectedInstance] = useState("");

  const handleTest = async () => {
    if (!testQuestion.trim()) return;
    setTesting(true);
    setTestAnswer("");
    await new Promise((r) => setTimeout(r, 1500));
    setTestAnswer(
      `Com base na análise do histórico de conversas, posso informar que: A maioria dos clientes (67%) busca informações sobre planos premium. O tempo médio de resposta é de 2.3 minutos. As principais objeções são preço (45%) e prazo de implementação (28%). Recomendação: Criar uma campanha focada em ROI para reduzir objeção de preço.`
    );
    setTesting(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">IA / RAG</h1>
        <p className="text-muted-foreground mt-1">Bases de conhecimento e teste de inteligência artificial</p>
      </div>

      {/* Existing Bases */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="surface-elevated p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Bases Criadas</h2>
        </div>
        <div className="space-y-3">
          {mockRAGBases.map((base) => (
            <div key={base.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">{base.name}</p>
                <p className="text-xs text-muted-foreground">{base.origin} • {base.documentCount} documentos</p>
              </div>
              <p className="text-xs text-muted-foreground">{base.createdAt}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Create RAG */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="surface-elevated p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">Criar Base RAG</h2>
        </div>
        <div className="space-y-4">
          <input value={newBaseName} onChange={(e) => setNewBaseName(e.target.value)} placeholder="Nome da base" className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          <select value={selectedInstance} onChange={(e) => setSelectedInstance(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground">
            <option value="">Selecionar instância...</option>
            {mockInstances.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.phone})</option>)}
          </select>
          <div className="flex gap-3">
            <button className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Gerar base com histórico</button>
            <button className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">Atualizar base</button>
          </div>
        </div>
      </motion.div>

      {/* Test AI */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="surface-elevated p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Teste de IA</h2>
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={testQuestion} onChange={(e) => setTestQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleTest()} placeholder="Faça uma pergunta..." className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            <button onClick={handleTest} disabled={testing} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
              <Send className="w-4 h-4" /> Perguntar
            </button>
          </div>
          {testing && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse_dot" />
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse_dot" style={{ animationDelay: "0.3s" }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse_dot" style={{ animationDelay: "0.6s" }} />
              <span>Pensando...</span>
            </div>
          )}
          {testAnswer && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-secondary/50 border border-border">
              <p className="text-sm text-foreground leading-relaxed">{testAnswer}</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AIRagPage;
