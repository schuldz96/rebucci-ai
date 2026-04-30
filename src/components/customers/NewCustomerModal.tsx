import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { useCustomerStore, Plan } from "@/store/customerStore";
import { useToast } from "@/hooks/use-toast";
import { addDays, format } from "date-fns";

interface Props {
  plans: Plan[];
  onClose: () => void;
  onCreated: () => void;
}

const NewCustomerModal = ({ plans, onClose, onCreated }: Props) => {
  const { user } = useAuthStore();
  const { createCustomer } = useCustomerStore();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    gender: "",
    birthdate: "",
    height_cm: "",
    plan_id: "",
    start_date: today,
    duration: "90",
    value: "",
    payment_method: "pix",
  });

  const set = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const endDate = () => {
    const d = parseInt(form.duration) || 90;
    return format(addDays(new Date(form.start_date), d), "yyyy-MM-dd");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: "Nome é obrigatório", variant: "destructive" }); return; }
    if (!user) return;

    setSaving(true);
    const result = await createCustomer(user.id, {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      whatsapp: form.whatsapp || undefined,
      gender: form.gender || undefined,
      birthdate: form.birthdate || undefined,
      height_cm: form.height_cm ? parseFloat(form.height_cm) : undefined,
      plan_id: form.plan_id || undefined,
      start_date: form.start_date,
      end_date: endDate(),
      value: parseFloat(form.value) || 0,
      payment_method: form.payment_method,
    });
    setSaving(false);

    if (result.success) {
      toast({ title: "Aluno adicionado com sucesso!" });
      onCreated();
    } else {
      toast({ title: "Erro ao criar aluno", description: result.error, variant: "destructive" });
    }
  };

  return (
    <AnimatePresence>
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
          className="w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Novo Aluno</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[70vh]">
            <div className="px-6 py-4 space-y-4">
              {/* Dados pessoais */}
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Dados pessoais</p>
              <div>
                <label className="text-sm font-medium text-foreground">Nome completo *</label>
                <Input className="mt-1" placeholder="Nome do aluno" value={form.name} onChange={(e) => set("name", e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground">E-mail</label>
                  <Input className="mt-1" type="email" placeholder="email@exemplo.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">WhatsApp</label>
                  <Input className="mt-1" placeholder="+55 (11) 99999-9999" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Sexo</label>
                  <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                    <option value="">Selecionar</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Nascimento</label>
                  <Input className="mt-1" type="date" value={form.birthdate} onChange={(e) => set("birthdate", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Altura (cm)</label>
                  <Input className="mt-1" type="number" placeholder="175" value={form.height_cm} onChange={(e) => set("height_cm", e.target.value)} />
                </div>
              </div>

              {/* Consultoria */}
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 pt-2">Consultoria</p>
              <div>
                <label className="text-sm font-medium text-foreground">Plano</label>
                <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.plan_id} onChange={(e) => {
                  const p = plans.find(x => x.id === e.target.value);
                  set("plan_id", e.target.value);
                  if (p) set("duration", String(p.duration_days));
                }}>
                  <option value="">Sem plano específico</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — R$ {p.price.toFixed(2)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Data de início</label>
                  <Input className="mt-1" type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Duração (dias)</label>
                  <Input className="mt-1" type="number" min={1} value={form.duration} onChange={(e) => set("duration", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Valor cobrado (R$)</label>
                  <Input className="mt-1" type="number" step="0.01" placeholder="0,00" value={form.value} onChange={(e) => set("value", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Forma de pagamento</label>
                  <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)}>
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="boleto">Boleto</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Término previsto: <strong>{endDate()}</strong></p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</> : "Adicionar aluno"}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NewCustomerModal;
