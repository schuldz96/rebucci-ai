import { useState, useEffect } from "react";
import { X, Check, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Props {
  onClose: () => void;
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50";

const ProfileModal = ({ onClose }: Props) => {
  const { user } = useAuthStore();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Carrega phone do crm_users
  useEffect(() => {
    if (!user?.email) return;
    setLoadingProfile(true);
    supabase.from("crm_users").select("phone").eq("email", user.email).maybeSingle().then(({ data }) => {
      if (data?.phone) setPhone(data.phone);
      setLoadingProfile(false);
    });
  }, [user?.email]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      // Atualiza metadados no Supabase Auth
      const { error: authErr } = await supabase.auth.updateUser({ data: { name } });
      if (authErr) throw authErr;
      // Atualiza crm_users
      await supabase.from("crm_users").update({ name, phone }).eq("email", user.email);
      setProfileMsg({ ok: true, text: "Perfil atualizado com sucesso." });
    } catch (e) {
      setProfileMsg({ ok: false, text: e instanceof Error ? e.message : "Erro ao salvar." });
    }
    setSavingProfile(false);
  };

  const handleSavePassword = async () => {
    if (!user) return;
    setPwdMsg(null);
    if (!currentPwd || !newPwd || !confirmPwd) { setPwdMsg({ ok: false, text: "Preencha todos os campos." }); return; }
    if (newPwd !== confirmPwd) { setPwdMsg({ ok: false, text: "Nova senha e confirmação não coincidem." }); return; }
    if (newPwd.length < 6) { setPwdMsg({ ok: false, text: "A nova senha deve ter pelo menos 6 caracteres." }); return; }
    setSavingPwd(true);
    try {
      // Reautentica para validar senha atual
      const { error: reAuthErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPwd });
      if (reAuthErr) throw new Error("Senha atual incorreta.");
      // Atualiza senha
      const { error: updErr } = await supabase.auth.updateUser({ password: newPwd });
      if (updErr) throw updErr;
      setPwdMsg({ ok: true, text: "Senha alterada com sucesso." });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (e) {
      setPwdMsg({ ok: false, text: e instanceof Error ? e.message : "Erro ao alterar senha." });
    }
    setSavingPwd(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Meu Perfil</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Avatar + identidade */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold shrink-0">
              {(name || user?.name || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <span className="text-[10px] px-2 py-0.5 mt-1 inline-block rounded-full bg-primary/20 text-primary font-medium">{user?.role}</span>
            </div>
          </div>

          {/* Dados do perfil */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informações</p>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Seu nome" disabled={loadingProfile} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">E-mail</label>
              <input value={user?.email ?? ""} className={cn(inputCls, "cursor-not-allowed opacity-60")} disabled readOnly />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Telefone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="(00) 00000-0000" disabled={loadingProfile} />
            </div>
            {profileMsg && (
              <p className={cn("text-xs", profileMsg.ok ? "text-success" : "text-destructive")}>{profileMsg.text}</p>
            )}
            <button onClick={handleSaveProfile} disabled={savingProfile || loadingProfile}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40">
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar alterações
            </button>
          </div>

          {/* Alterar senha */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alterar senha</p>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Senha atual</label>
              <div className="relative">
                <input type={showCurrent ? "text" : "password"} value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)}
                  className={cn(inputCls, "pr-10")} placeholder="••••••••" />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nova senha</label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                  className={cn(inputCls, "pr-10")} placeholder="••••••••" />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Confirmar nova senha</label>
              <div className="relative">
                <input type={showConfirm ? "text" : "password"} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                  className={cn(inputCls, "pr-10")} placeholder="••••••••" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {pwdMsg && (
              <p className={cn("text-xs", pwdMsg.ok ? "text-success" : "text-destructive")}>{pwdMsg.text}</p>
            )}
            <button onClick={handleSavePassword} disabled={savingPwd}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-40">
              {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Alterar senha
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileModal;
