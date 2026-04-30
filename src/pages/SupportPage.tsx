import { useState } from "react";
import { MessageSquare, BookOpen, Video, ChevronDown, ChevronRight, ExternalLink, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Como adicionar um novo aluno?",
    a: "Acesse Alunos → Todos os alunos e clique em 'Novo aluno'. Preencha os dados do aluno e selecione o plano. A consultoria será criada automaticamente.",
  },
  {
    q: "Como enviar um formulário de feedback?",
    a: "No perfil do aluno, acesse a aba Feedbacks e clique em 'Novo feedback'. Um link único será gerado e você pode enviá-lo via WhatsApp. O aluno preenche online e as respostas aparecem no CRM.",
  },
  {
    q: "Como integrar com o Digital Manager Guru?",
    a: "Vá em Apps & Integrações, clique em Digital Manager Guru e copie a URL do webhook. Cole essa URL no painel do Guru em Configurações → Webhooks, selecionando o evento 'Venda aprovada'.",
  },
  {
    q: "Como importar alunos em lote?",
    a: "Acesse Ferramentas → Importar Clientes. Baixe o template CSV, preencha com os dados dos alunos e faça o upload. O sistema validará cada linha antes de importar.",
  },
  {
    q: "O que é a recuperação de carrinho?",
    a: "É uma funcionalidade que recebe notificações de potenciais compradores que não finalizaram a compra (via webhook). Você pode marcar o status de cada lead e abrir o WhatsApp diretamente pelo CRM.",
  },
  {
    q: "Como funciona o sistema de afiliados?",
    a: "Acesse Produtos → Afiliados para cadastrar seus afiliados. Cada um recebe um código único. Você define a porcentagem de comissão e acompanha vendas e comissões geradas.",
  },
  {
    q: "Posso mudar meu plano a qualquer momento?",
    a: "Sim! Acesse Minha Conta → Assinatura para ver as opções disponíveis e fazer upgrade ou downgrade do seu plano.",
  },
];

const FaqItem = ({ item }: { item: (typeof FAQ_ITEMS)[0] }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 px-1 text-left gap-4"
      >
        <span className="text-sm font-medium text-foreground">{item.q}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <p className="text-sm text-muted-foreground pb-4 px-1 leading-relaxed">{item.a}</p>}
    </div>
  );
};

// ─── Contact Form ─────────────────────────────────────────────────────────────

const ContactForm = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      toast({ title: "Preencha assunto e mensagem", variant: "destructive" });
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    toast({ title: "Mensagem enviada!", description: "Nossa equipe responderá em até 24 horas." });
    setForm({ subject: "", message: "" });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-foreground">Assunto</label>
        <Input className="mt-1" placeholder="Ex: Dúvida sobre integração" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Mensagem</label>
        <textarea
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          rows={5}
          placeholder="Descreva sua dúvida ou problema..."
          value={form.message}
          onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
        />
      </div>
      <Button onClick={handleSend} disabled={sending} className="gap-2">
        {sending ? "Enviando..." : <><Send className="w-4 h-4" />Enviar mensagem</>}
      </Button>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const SupportPage = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState<"faq" | "contact">("faq");
  const [search, setSearch] = useState("");

  const filteredFaq = FAQ_ITEMS.filter(
    (item) => !search || item.q.toLowerCase().includes(search.toLowerCase()) || item.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Suporte</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Como podemos ajudar?</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* Cards de acesso rápido */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => window.open("https://wa.me/5511999999999")}
              className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/20 transition-all text-left"
            >
              <MessageSquare className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground text-sm">WhatsApp</p>
                <p className="text-xs text-muted-foreground mt-0.5">Resposta em minutos · Seg–Sex 9h–18h</p>
              </div>
            </button>
            <button
              onClick={() => toast({ title: "Documentação em breve", description: "Nossa base de conhecimento está sendo construída." })}
              className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/20 transition-all text-left"
            >
              <BookOpen className="w-6 h-6 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground text-sm">Documentação</p>
                <p className="text-xs text-muted-foreground mt-0.5">Guias e tutoriais completos</p>
              </div>
            </button>
            <button
              onClick={() => toast({ title: "Vídeos em breve", description: "Nossa biblioteca de vídeos está em produção." })}
              className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/20 transition-all text-left"
            >
              <Video className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground text-sm">Vídeos tutoriais</p>
                <p className="text-xs text-muted-foreground mt-0.5">Aprenda passo a passo</p>
              </div>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            {(["faq", "contact"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                  tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                {t === "faq" ? "Perguntas frequentes" : "Falar com suporte"}
              </button>
            ))}
          </div>

          {tab === "faq" && (
            <div className="space-y-4">
              <Input
                placeholder="Buscar nas perguntas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
              />
              {filteredFaq.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma pergunta encontrada</p>
              ) : (
                <div className="rounded-xl border border-border px-4">
                  {filteredFaq.map((item, i) => <FaqItem key={i} item={item} />)}
                </div>
              )}
            </div>
          )}

          {tab === "contact" && (
            <div className="rounded-xl border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">Enviar mensagem para o suporte</h3>
              <ContactForm />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
