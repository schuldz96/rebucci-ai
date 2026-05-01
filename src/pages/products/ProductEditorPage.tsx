import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";

const STEPS = [
  { n: 1, label: "Tipo de Produto" },
  { n: 2, label: "Configurações Iniciais" },
  { n: 3, label: "Modalidade" },
  { n: 4, label: "O que está incluso" },
  { n: 5, label: "Informações Básicas" },
  { n: 6, label: "Precificação" },
  { n: 7, label: "Configurações Avançadas" },
  { n: 8, label: "Integração" },
  { n: 9, label: "Upsell" },
];

const DURATION_OPTIONS = [
  { label: "Mensal (30 dias)", value: 30 },
  { label: "Bimestral (60 dias)", value: 60 },
  { label: "Trimestral (90 dias)", value: 90 },
  { label: "Semestral (180 dias)", value: 180 },
  { label: "Anual (365 dias)", value: 365 },
  { label: "Personalizado", value: 0 },
];

const PRESET_VALUES = [30, 60, 90, 180, 365];

const PLATFORM_OPTIONS = [
  { value: "manual", label: "Manual (sem integração)" },
  { value: "hotmart", label: "Hotmart" },
  { value: "kiwify", label: "Kiwify" },
  { value: "perfectpay", label: "PerfectPay" },
  { value: "outro", label: "Outro" },
];

const ProductEditorPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const isEdit = !!id;

  // Form state
  const [productType, setProductType] = useState<"plan" | "event" | "link" | "">("");
  const [planCategory, setPlanCategory] = useState<"principal" | "extension" | "addon">("principal");
  const [modality, setModality] = useState<"online" | "personal" | "consulta" | "">("");
  const [includes, setIncludes] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState(90);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [autoFeedbacks, setAutoFeedbacks] = useState(false);
  const [feedbackFreq, setFeedbackFreq] = useState(14);
  const [active, setActive] = useState(true);
  const [deliveryDays, setDeliveryDays] = useState(5);
  const [platform, setPlatform] = useState("manual");
  const [externalProductId, setExternalProductId] = useState("");

  const toggleInclude = (v: string) =>
    setIncludes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("plans").select("*").eq("id", id).maybeSingle();
      if (data) {
        setName(data.name ?? "");
        setDescription(data.description ?? "");
        setPrice(String(data.price ?? ""));
        const d = data.duration_days ?? 90;
        setDurationDays(d);
        setIsCustomDuration(!PRESET_VALUES.includes(d));
        setModality(data.modality ?? "");
        setAutoFeedbacks(data.auto_schedule_feedbacks ?? false);
        setFeedbackFreq(data.feedback_frequency_days ?? 14);
        setActive(data.active ?? true);
        setDeliveryDays(data.delivery_days ?? 5);
        const inc: string[] = [];
        if (data.includes_diet) inc.push("diet");
        if (data.includes_workout) inc.push("workout");
        setIncludes(inc);
        setProductType("plan");
        setPlanCategory(data.plan_category ?? "principal");
        setPlatform(data.platform ?? "manual");
        setExternalProductId(data.external_product_id ?? "");
      }
      setLoading(false);
    })();
  }, [id]);

  const save = async () => {
    if (!name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    if (!user) return;
    setSaving(true);
    const payload = {
      coach_id: user.id,
      name,
      description: description || null,
      price: parseFloat(price) || 0,
      duration_days: durationDays,
      modality: modality || "online",
      active,
      auto_schedule_feedbacks: autoFeedbacks,
      feedback_frequency_days: feedbackFreq,
      delivery_days: deliveryDays,
      includes_diet: includes.includes("diet"),
      includes_workout: includes.includes("workout"),
      plan_category: planCategory,
      platform,
      external_product_id: externalProductId || null,
    };
    const { error } = isEdit
      ? await supabase.from("plans").update(payload).eq("id", id!)
      : await supabase.from("plans").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    toast({ title: isEdit ? "Produto atualizado!" : "Produto criado!" });
    navigate("/products/list");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <button onClick={() => navigate("/products/list")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar para produtos
        </button>
        <h1 className="text-2xl font-bold text-foreground">{isEdit ? "Editar Produto" : "Novo Produto"}</h1>

        {/* Steps */}
        <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => (isEdit || s.n < step) && setStep(s.n)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  step === s.n
                    ? "bg-primary text-primary-foreground"
                    : (isEdit || s.n < step)
                    ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                    : "bg-muted text-muted-foreground cursor-default"
                )}
              >
                {s.n < step ? <Check className="w-3 h-3" /> : <span>{s.n}</span>}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-border" />}
            </div>
          ))}
        </div>
      </div>

      {/* Conteúdo do step */}
      <div className="flex-1 overflow-auto p-6">
        {step === 1 && (
          <div className="max-w-lg space-y-6">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Selecione o tipo de produto</h2>
              {[
                { value: "plan", emoji: "📄", title: "Plano", desc: "Período e prazo definidos" },
                { value: "event", emoji: "📅", title: "Evento", desc: "Data, hora e local" },
                { value: "link", emoji: "🔗", title: "Link Avulso", desc: "Cobrança avulsa" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setProductType(opt.value as any)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                    productType === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  )}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <div>
                    <p className="font-semibold text-foreground">{opt.title}</p>
                    <p className="text-sm text-muted-foreground">{opt.desc}</p>
                  </div>
                  {productType === opt.value && <Check className="w-5 h-5 text-primary ml-auto" />}
                </button>
              ))}
            </div>

            {productType === "plan" && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Categoria do plano</h2>
                <p className="text-sm text-muted-foreground -mt-1">Define como este produto é utilizado quando adicionado a um aluno.</p>
                {[
                  {
                    value: "principal",
                    emoji: "🎯",
                    title: "Plano Principal",
                    desc: "Plano primário do aluno. Apenas um ativo por vez.",
                  },
                  {
                    value: "extension",
                    emoji: "📅",
                    title: "Extensão de Plano",
                    desc: "Adiciona dias ao plano atual do aluno (ex: renovação antecipada, bônus).",
                  },
                  {
                    value: "addon",
                    emoji: "➕",
                    title: "Produto Adicional",
                    desc: "Produto paralelo ao plano (ex: plano premium plus, acompanhamento extra).",
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPlanCategory(opt.value as any)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                      planCategory === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    )}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{opt.title}</p>
                      <p className="text-sm text-muted-foreground">{opt.desc}</p>
                    </div>
                    {planCategory === opt.value && <Check className="w-5 h-5 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="max-w-lg space-y-4">
            <h2 className="text-lg font-semibold">Configurações Iniciais</h2>
            <label className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/40 cursor-pointer transition-colors">
              <input type="checkbox" className="mt-0.5 accent-primary" checked={active} onChange={(e) => setActive(e.target.checked)} />
              <div>
                <p className="font-medium text-foreground">Habilitar produto</p>
                <p className="text-sm text-muted-foreground">Produto ficará disponível para venda</p>
              </div>
            </label>
            {[
              { id: "general", label: "Exibir em listagem geral", desc: "Aparecerá na listagem pública de produtos" },
              { id: "renewal", label: "Exibir em link de renovação", desc: "Disponível quando aluno for renovar" },
              { id: "exclusive", label: "Não exibir outros produtos no link de renovação", desc: "Exclusividade no link de renovação" },
            ].map((opt) => (
              <label key={opt.id} className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/40 cursor-pointer transition-colors">
                <input type="checkbox" className="mt-0.5 accent-primary" />
                <div>
                  <p className="font-medium text-foreground">{opt.label}</p>
                  <p className="text-sm text-muted-foreground">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="max-w-lg space-y-4">
            <h2 className="text-lg font-semibold">Modalidade do Produto</h2>
            {[
              { value: "online", emoji: "🌐", title: "Online", desc: "Apenas consultoria online" },
              { value: "personal", emoji: "🏋️", title: "Personal", desc: "Personal trainer" },
              { value: "consulta", emoji: "👤", title: "Consulta", desc: "Consulta nutricional" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setModality(opt.value as any)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                  modality === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <div>
                  <p className="font-semibold text-foreground">{opt.title}</p>
                  <p className="text-sm text-muted-foreground">{opt.desc}</p>
                </div>
                {modality === opt.value && <Check className="w-5 h-5 text-primary ml-auto" />}
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="max-w-lg space-y-4">
            <h2 className="text-lg font-semibold">O que está incluso</h2>
            {[
              { value: "diet", emoji: "🍴", title: "Dieta", desc: "Plano alimentar personalizado" },
              { value: "workout", emoji: "🏋️", title: "Treino", desc: "Plano de treino personalizado" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleInclude(opt.value)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                  includes.includes(opt.value) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <div>
                  <p className="font-semibold text-foreground">{opt.title}</p>
                  <p className="text-sm text-muted-foreground">{opt.desc}</p>
                </div>
                {includes.includes(opt.value) && <Check className="w-5 h-5 text-primary ml-auto" />}
              </button>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="max-w-lg space-y-4">
            <h2 className="text-lg font-semibold">Informações Básicas</h2>
            <div>
              <label className="text-sm font-medium text-foreground">Nome do produto *</label>
              <Input className="mt-1" placeholder="Ex: Consultoria Online Trimestral" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
              <p className="text-xs text-muted-foreground mt-1">{name.length}/100 caracteres</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Descrição</label>
              <textarea className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" rows={3} placeholder="Descreva o produto..." maxLength={250} value={description} onChange={(e) => setDescription(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">{description.length}/250 caracteres</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Prazo de entrega (dias)</label>
              <Input className="mt-1 w-32" type="number" min={1} max={50} value={deliveryDays} onChange={(e) => setDeliveryDays(parseInt(e.target.value) || 1)} />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="max-w-lg space-y-4">
            <h2 className="text-lg font-semibold">Precificação e Pagamento</h2>
            <div>
              <label className="text-sm font-medium text-foreground">Preço (R$)</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input className="pl-9" placeholder="0,00" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Período / Duração</label>
              <select
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={isCustomDuration ? 0 : durationDays}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (v === 0) {
                    setIsCustomDuration(true);
                    setDurationDays(366);
                  } else {
                    setIsCustomDuration(false);
                    setDurationDays(v);
                  }
                }}
              >
                {DURATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {isCustomDuration && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)}
                    className="w-32"
                    placeholder="Ex: 400"
                  />
                  <span className="text-sm text-muted-foreground">dias</span>
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-primary" checked={active} onChange={(e) => setActive(e.target.checked)} />
              <span className="text-sm text-foreground">Produto ativo (disponível para novos alunos)</span>
            </label>
          </div>
        )}

        {step === 7 && (
          <div className="max-w-lg space-y-4">
            <h2 className="text-lg font-semibold">Configurações Avançadas</h2>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 rounded-xl border border-border cursor-pointer hover:border-primary/40 transition-colors">
                <input type="checkbox" className="mt-0.5 accent-primary" checked={autoFeedbacks} onChange={(e) => setAutoFeedbacks(e.target.checked)} />
                <div>
                  <p className="font-medium text-foreground">Habilitar agendamento automático de feedbacks</p>
                  <p className="text-sm text-muted-foreground">Criar feedbacks automaticamente para alunos deste produto</p>
                </div>
              </label>
              {autoFeedbacks && (
                <div className="ml-8">
                  <label className="text-sm font-medium text-foreground">Frequência (dias)</label>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {[7, 14, 15, 21, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setFeedbackFreq(d)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border text-sm transition-colors",
                          feedbackFreq === d ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {d} dias
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { if ([7,14,15,21,30].includes(feedbackFreq)) setFeedbackFreq(0); }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-sm transition-colors",
                        ![7,14,15,21,30].includes(feedbackFreq) ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      Personalizado
                    </button>
                  </div>
                  {![7,14,15,21,30].includes(feedbackFreq) && (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="number"
                        min={1}
                        value={feedbackFreq || ""}
                        placeholder="Ex: 90"
                        onChange={(e) => setFeedbackFreq(parseInt(e.target.value) || 1)}
                        className="w-28"
                      />
                      <span className="text-sm text-muted-foreground">dias</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="max-w-lg space-y-5">
            <h2 className="text-lg font-semibold">Integração com Plataforma</h2>
            <p className="text-sm text-muted-foreground -mt-1">
              Configure a integração com plataformas de pagamento para que vendas automáticas ativem consultorias.
            </p>

            <div>
              <label className="text-sm font-medium text-foreground">Plataforma</label>
              <div className="grid gap-2 mt-2">
                {PLATFORM_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPlatform(opt.value)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left text-sm transition-all",
                      platform === opt.value ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <span className="font-medium">{opt.label}</span>
                    {platform === opt.value && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            {platform !== "manual" && (
              <div>
                <label className="text-sm font-medium text-foreground">
                  ID do Produto na {PLATFORM_OPTIONS.find(p => p.value === platform)?.label}
                </label>
                <Input
                  className="mt-1"
                  placeholder="Ex: HOT-12345 ou PROD_abc123"
                  value={externalProductId}
                  onChange={(e) => setExternalProductId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Este ID será usado para identificar o produto no webhook da plataforma.
                </p>
              </div>
            )}

            {platform === "manual" && (
              <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground">
                Sem integração automática. Vendas e ativações são gerenciadas manualmente no CRM.
              </div>
            )}
          </div>
        )}

        {step === 9 && (
          <div className="max-w-lg space-y-4">
            <h2 className="text-lg font-semibold">Oferta de Upsell</h2>
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-4 text-sm text-yellow-400">
              Disponível apenas para produtos Online e sem recorrência ativa.
            </div>
            <label className="flex items-start gap-3 p-4 rounded-xl border border-border cursor-pointer hover:border-primary/40 transition-colors">
              <input type="checkbox" className="mt-0.5 accent-primary" />
              <div>
                <p className="font-medium text-foreground">Ativar oferta de upsell</p>
                <p className="text-sm text-muted-foreground">Exibir upgrade no checkout deste produto</p>
              </div>
            </label>

            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-4 text-sm text-yellow-400 mt-6">
              As alterações realizadas neste produto não afetarão os clientes já adicionados. Modificações entram em vigor apenas para novas vendas.
            </div>
          </div>
        )}
      </div>

      {/* Footer fixo */}
      <div className="shrink-0 px-6 py-4 border-t border-border flex items-center justify-between bg-background">
        <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : navigate("/products/list")}>
          {step === 1 ? "Cancelar" : "Voltar"}
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Etapa {step} de {STEPS.length}</span>
          {isEdit ? (
            <>
              {step < STEPS.length && (
                <Button variant="outline" onClick={() => setStep(step + 1)}>Próximo</Button>
              )}
              <Button onClick={save} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</> : "Salvar alterações"}
              </Button>
            </>
          ) : step < STEPS.length ? (
            <Button onClick={() => setStep(step + 1)}>Próximo</Button>
          ) : (
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</> : "Criar produto"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductEditorPage;
