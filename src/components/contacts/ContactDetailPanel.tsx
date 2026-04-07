import { useState, useRef } from "react";
import { type Contact } from "@/data/mockData";
import { useContactStore } from "@/store/contactStore";
import { useDealStore } from "@/store/dealStore";
import { ChevronLeft, Pencil, Check, Kanban } from "lucide-react";
import { cn, formatPhone } from "@/lib/utils";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

type EditKey = keyof Omit<Contact, "id">;

const statusColors: Record<string, string> = {
  active: "bg-success/20 text-success",
  inactive: "bg-muted text-muted-foreground",
  lead: "bg-primary/20 text-primary",
};
const statusLabels: Record<string, string> = { active: "Ativo", inactive: "Inativo", lead: "Lead" };

interface Props {
  contact: Contact;
  onClose: () => void;
}

const ContactDetailPanel = ({ contact, onClose }: Props) => {
  const { updateContact } = useContactStore();
  const { deals } = useDealStore();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<EditKey | null>(null);
  const [editVal, setEditVal] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const linkedDeals = deals.filter((d) => d.contactId === contact.id);

  const startEdit = (key: EditKey, val: string) => {
    setEditing(key);
    setEditVal(val);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const saveEdit = async () => {
    if (!editing) return;
    await updateContact(contact.id, { [editing]: editVal || undefined });
    setEditing(null);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") setEditing(null);
  };

  const EditableRow = ({
    label,
    fieldKey,
    display,
    rawVal,
    type = "text",
    options,
  }: {
    label: string;
    fieldKey: EditKey;
    display: string;
    rawVal: string;
    type?: "text" | "date" | "select";
    options?: { value: string; label: string }[];
  }) => {
    const isEditing = editing === fieldKey;
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-border/50 group">
        <span className="text-xs text-muted-foreground w-36 shrink-0">{label}</span>
        {isEditing ? (
          <div className="flex items-center gap-1.5 flex-1 justify-end">
            {type === "select" && options ? (
              <select
                ref={inputRef as React.RefObject<HTMLSelectElement>}
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onBlur={saveEdit}
                className="px-2 py-1 rounded-lg bg-background border border-ring text-xs text-foreground focus:outline-none"
              >
                {options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type={type}
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={handleKey}
                className="px-2 py-1 rounded-lg bg-background border border-ring text-xs text-foreground focus:outline-none w-44"
              />
            )}
            <button onClick={saveEdit} className="text-primary hover:text-primary/80">
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={cn("text-xs font-medium text-foreground text-right", !display || display === "—" ? "text-muted-foreground" : "")}>
              {display || "—"}
            </span>
            <button
              onClick={() => startEdit(fieldKey, rawVal)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex bg-background/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -20, opacity: 0 }}
        className="w-full max-w-lg mx-auto my-4 ml-4 rounded-2xl overflow-hidden border border-border bg-card shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-3">
            <button onClick={onClose} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
            <span className="text-xs text-muted-foreground font-mono">#{contact.id}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-lg font-bold shrink-0">
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{contact.name}</h2>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[contact.status])}>
                {statusLabels[contact.status]}
              </span>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Informações */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Informações</p>
            <EditableRow label="Nome" fieldKey="name" display={contact.name} rawVal={contact.name} />
            <EditableRow label="Email" fieldKey="email" display={contact.email} rawVal={contact.email} />
            <EditableRow label="Telefone" fieldKey="phone" display={formatPhone(contact.phone)} rawVal={contact.phone} />
            <EditableRow label="Plano" fieldKey="company" display={contact.company || "—"} rawVal={contact.company || ""} />
            <EditableRow
              label="Status"
              fieldKey="status"
              display={statusLabels[contact.status]}
              rawVal={contact.status}
              type="select"
              options={[
                { value: "lead", label: "Lead" },
                { value: "active", label: "Ativo" },
                { value: "inactive", label: "Inativo" },
              ]}
            />
          </div>

          {/* Datas */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Datas</p>
            <EditableRow label="Criado em" fieldKey="createdAt" display={contact.createdAt || "—"} rawVal={contact.createdAt || ""} type="date" />
            <EditableRow label="Ativação" fieldKey="activationDate" display={contact.activationDate || "—"} rawVal={contact.activationDate || ""} type="date" />
            <EditableRow label="Término" fieldKey="endDate" display={contact.endDate || "—"} rawVal={contact.endDate || ""} type="date" />
            <EditableRow label="Último Feedback" fieldKey="lastFeedback" display={contact.lastFeedback || "—"} rawVal={contact.lastFeedback || ""} type="date" />
            <EditableRow label="Próximo Feedback" fieldKey="nextFeedback" display={contact.nextFeedback || "—"} rawVal={contact.nextFeedback || ""} type="date" />
          </div>

          {/* Negócios vinculados */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Negócios vinculados {linkedDeals.length > 0 && <span className="text-primary">({linkedDeals.length})</span>}
            </p>
            {linkedDeals.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum negócio vinculado</p>
            ) : (
              <div className="space-y-2">
                {linkedDeals.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => navigate(`/deals/${d.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary border border-border hover:border-primary/30 transition-colors text-left"
                  >
                    <Kanban className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                      <p className="text-xs text-muted-foreground">{d.stage}</p>
                    </div>
                    <span className={cn(
                      "ml-auto text-[10px] px-2 py-0.5 rounded-full border shrink-0",
                      d.priority === "high" ? "bg-destructive/20 text-destructive border-destructive/30"
                        : d.priority === "medium" ? "bg-warning/20 text-warning border-warning/30"
                        : "bg-muted text-muted-foreground border-border"
                    )}>
                      {d.priority === "high" ? "Alta" : d.priority === "medium" ? "Média" : "Baixa"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ContactDetailPanel;
