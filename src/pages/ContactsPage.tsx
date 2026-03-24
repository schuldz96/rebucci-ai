import { useState } from "react";
import { mockContacts, type Contact } from "@/data/mockData";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  active: "bg-success/20 text-success",
  inactive: "bg-muted text-muted-foreground",
  lead: "bg-primary/20 text-primary",
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  lead: "Lead",
};

const ContactsPage = () => {
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "", company: "", status: "lead" as Contact["status"] });

  const filtered = contacts
    .filter((c) => (statusFilter === "all" ? true : c.status === statusFilter))
    .filter((c) =>
      search
        ? c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()) ||
          c.company.toLowerCase().includes(search.toLowerCase())
        : true
    );

  const handleCreate = () => {
    if (!newContact.name) return;
    setContacts([
      ...contacts,
      {
        ...newContact,
        id: `ct-${Date.now()}`,
        createdAt: new Date().toISOString().split("T")[0],
      },
    ]);
    setNewContact({ name: "", email: "", phone: "", company: "", status: "lead" });
    setShowModal(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
          <p className="text-muted-foreground mt-1">{contacts.length} contatos cadastrados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Novo Contato
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contatos..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-muted-foreground mr-1" />
          {["all", "active", "lead", "inactive"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg transition-colors",
                statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {s === "all" ? "Todos" : statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="surface-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Telefone</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Empresa</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                >
                  <td className="px-5 py-3.5 text-sm font-medium text-foreground">{c.name}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{c.email}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{c.phone}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{c.company}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn("text-xs px-2.5 py-1 rounded-lg font-medium", statusColors[c.status])}>
                      {statusLabels[c.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{c.createdAt}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="surface-elevated p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-foreground">Novo Contato</h3>
                <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {(["name", "email", "phone", "company"] as const).map((field) => (
                  <input
                    key={field}
                    value={newContact[field]}
                    onChange={(e) => setNewContact({ ...newContact, [field]: e.target.value })}
                    placeholder={{ name: "Nome", email: "Email", phone: "Telefone", company: "Empresa" }[field]}
                    className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                ))}
                <select
                  value={newContact.status}
                  onChange={(e) => setNewContact({ ...newContact, status: e.target.value as Contact["status"] })}
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground"
                >
                  <option value="lead">Lead</option>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
                <button
                  onClick={handleCreate}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Criar Contato
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContactsPage;
