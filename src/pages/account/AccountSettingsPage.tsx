import { useState, useEffect } from "react";
import { User, Dumbbell, Zap, DollarSign, Plug, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";

const SECTIONS = [
  { id: "profile", label: "Perfil do Coach", icon: User },
  { id: "coaching", label: "Coaching", icon: Dumbbell },
  { id: "automations", label: "Automações", icon: Zap },
  { id: "financial", label: "Financeiro", icon: DollarSign },
  { id: "integrations", label: "Integrações", icon: Plug },
];

const FEEDBACK_FREQ_OPTIONS = [7, 14, 15, 21, 30];

// ─── Profile Section ──────────────────────────────────────────────────────────

const ProfileSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", bio: "", specialty: "" });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, phone, bio, specialty")
        .eq("id", coachId)
        .maybeSingle();
      if (data) setForm({ name: data.name ?? "", phone: data.phone ?? "", bio: data.bio ?? "", specialty: data.specialty ?? "" });
      setLoading(false);
    };
    load();
  }, [coachId]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: coachId, name: form.name, phone: form.phone || null, bio: form.bio || null, specialty: form.specialty || null });
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
    toast({ title: "Perfil salvo com sucesso!" });
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Perfil do Coach</h2>
      <div>
        <label className="text-sm font-medium text-foreground">Nome completo</label>
        <Input className="mt-1" placeholder="Seu nome completo" value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Telefone / WhatsApp</label>
        <Input className="mt-1" placeholder="+55 11 99999-9999" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Especialidade</label>
        <Input className="mt-1" placeholder="Ex: Personal Trainer, Nutricionista..." value={form.specialty} onChange={(e) => set("specialty", e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Bio</label>
        <textarea
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          rows={4}
          placeholder="Conte um pouco sobre você, sua experiência e abordagem..."
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
        />
      </div>
      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Save className="w-4 h-4" />Salvar alterações</>}
      </Button>
    </div>
  );
};

// ─── Coaching Section ─────────────────────────────────────────────────────────

const CoachingSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackFreq, setFeedbackFreq] = useState(14);
  const [autoSend, setAutoSend] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("coach_settings")
        .select("feedback_freq_days, auto_send_feedback")
        .eq("coach_id", coachId)
        .maybeSingle();
      if (data) {
        setFeedbackFreq(data.feedback_freq_days ?? 14);
        setAutoSend(data.auto_send_feedback ?? true);
      }
      setLoading(false);
    };
    load();
  }, [coachId]);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("coach_settings").upsert({
      coach_id: coachId,
      feedback_freq_days: feedbackFreq,
      auto_send_feedback: autoSend,
    });
    setSaving(false);
    toast({ title: "Configurações de coaching salvas!" });
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-md space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Configurações de Coaching</h2>

      <div>
        <label className="text-sm font-medium text-foreground">Frequência padrão de feedback</label>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">Intervalo padrão ao criar novos planos</p>
        <div className="flex items-center gap-2 flex-wrap">
          {FEEDBACK_FREQ_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setFeedbackFreq(d)}
              className={cn(
                "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                feedbackFreq === d
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              {d} dias
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl border border-border">
        <div>
          <p className="text-sm font-medium text-foreground">Envio automático de feedback</p>
          <p className="text-xs text-muted-foreground mt-0.5">Envia o formulário automaticamente na data configurada</p>
        </div>
        <button
          onClick={() => setAutoSend((v) => !v)}
          className={cn(
            "w-10 h-6 rounded-full transition-colors relative shrink-0",
            autoSend ? "bg-primary" : "bg-muted"
          )}
        >
          <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", autoSend ? "translate-x-4" : "translate-x-0.5")} />
        </button>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Save className="w-4 h-4" />Salvar</>}
      </Button>
    </div>
  );
};

// ─── Automations Section ──────────────────────────────────────────────────────

const AutomationsSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [birthdayMsg, setBirthdayMsg] = useState(true);
  const [expiringMsg, setExpiringMsg] = useState(true);
  const [expiringDays, setExpiringDays] = useState("7");

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("coach_settings").upsert({
      coach_id: coachId,
      auto_birthday_msg: birthdayMsg,
      auto_expiring_msg: expiringMsg,
      expiring_alert_days: parseInt(expiringDays) || 7,
    });
    setSaving(false);
    toast({ title: "Automações salvas!" });
  };

  const Toggle = ({ value, onChange, label, desc }: { value: boolean; onChange: () => void; label: string; desc: string }) => (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <button
        onClick={onChange}
        className={cn("w-10 h-6 rounded-full transition-colors relative shrink-0", value ? "bg-primary" : "bg-muted")}
      >
        <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", value ? "translate-x-4" : "translate-x-0.5")} />
      </button>
    </div>
  );

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Automações</h2>
      <Toggle value={birthdayMsg} onChange={() => setBirthdayMsg((v) => !v)} label="Mensagem de aniversário" desc="Envia parabéns automático no WhatsApp do aluno" />
      <Toggle value={expiringMsg} onChange={() => setExpiringMsg((v) => !v)} label="Alerta de vencimento próximo" desc="Notifica o aluno antes do plano expirar" />
      {expiringMsg && (
        <div>
          <label className="text-sm font-medium text-foreground">Avisar quantos dias antes?</label>
          <div className="flex items-center gap-2 mt-2">
            {[3, 5, 7, 14].map((d) => (
              <button
                key={d}
                onClick={() => setExpiringDays(String(d))}
                className={cn("px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                  expiringDays === String(d) ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:border-primary/40"
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      )}
      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Save className="w-4 h-4" />Salvar</>}
      </Button>
    </div>
  );
};

// ─── Financial Section ────────────────────────────────────────────────────────

const FinancialSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [defaultMethod, setDefaultMethod] = useState("pix");

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("coach_settings").upsert({
      coach_id: coachId,
      pix_key: pixKey || null,
      default_payment_method: defaultMethod,
    });
    setSaving(false);
    toast({ title: "Configurações financeiras salvas!" });
  };

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Configurações Financeiras</h2>
      <div>
        <label className="text-sm font-medium text-foreground">Chave PIX</label>
        <Input className="mt-1" placeholder="CPF, e-mail, telefone ou chave aleatória" value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Método de pagamento padrão</label>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {["pix", "cartao", "boleto", "dinheiro"].map((m) => (
            <button
              key={m}
              onClick={() => setDefaultMethod(m)}
              className={cn("px-3 py-1.5 rounded-lg border text-sm font-medium capitalize transition-colors",
                defaultMethod === m ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              {m === "cartao" ? "Cartão" : m === "boleto" ? "Boleto" : m === "dinheiro" ? "Dinheiro" : "PIX"}
            </button>
          ))}
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Save className="w-4 h-4" />Salvar</>}
      </Button>
    </div>
  );
};

// ─── Integrations Section ─────────────────────────────────────────────────────

const IntegrationsSection = ({ coachId }: { coachId: string }) => {
  const { toast } = useToast();
  const webhookUrl = `${window.location.origin}/api/webhook/${coachId}`;

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: "URL copiada!" });
  };

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Integrações</h2>

      <div className="rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💳</span>
          <div>
            <p className="font-semibold text-foreground">Digital Manager Guru</p>
            <p className="text-xs text-muted-foreground">Webhook de venda → cria aluno automaticamente</p>
          </div>
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full text-green-400 bg-green-400/10">Ativo</span>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">URL do Webhook</label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg font-mono text-foreground truncate">{webhookUrl}</code>
            <Button variant="outline" size="sm" onClick={copyWebhook}>Copiar</Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Cole esta URL no campo "Webhook de compra" no painel do Digital Manager Guru. Ao receber uma venda, o aluno e a consultoria serão criados automaticamente.</p>
      </div>

      {[
        { name: "Hotmart", icon: "🔥", desc: "Integração via webhook de compra" },
        { name: "Eduzz", icon: "📦", desc: "Integração via webhook de compra" },
        { name: "Portal do Aluno", icon: "👤", desc: "Link único para o aluno ver treinos e feedbacks" },
      ].map((app) => (
        <div key={app.name} className="rounded-xl border border-border p-5 opacity-60">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{app.icon}</span>
            <div>
              <p className="font-semibold text-foreground">{app.name}</p>
              <p className="text-xs text-muted-foreground">{app.desc}</p>
            </div>
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full text-muted-foreground bg-muted">Em breve</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const AccountSettingsPage = () => {
  const { user } = useAuthStore();
  const [section, setSection] = useState("profile");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Minha Conta</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configurações do coach e da plataforma</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 border-r border-border shrink-0 py-4 px-2 space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors",
                section === s.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <s.icon className="w-4 h-4 shrink-0" />
              {s.label}
            </button>
          ))}
        </aside>

        <div className="flex-1 overflow-auto p-6">
          {user && (
            <>
              {section === "profile" && <ProfileSection coachId={user.id} />}
              {section === "coaching" && <CoachingSection coachId={user.id} />}
              {section === "automations" && <AutomationsSection coachId={user.id} />}
              {section === "financial" && <FinancialSection coachId={user.id} />}
              {section === "integrations" && <IntegrationsSection coachId={user.id} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;
