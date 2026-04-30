import { useAuthStore } from "@/store/authStore";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Package,
  Users,
  Library,
  Wrench,
  DollarSign,
  Grid2X2,
  UserCircle,
  HelpCircle,
  MessageSquare,
  Bot,
  Kanban,
  Settings,
  LogOut,
  ChevronDown,
  ShoppingCart,
  Network,
  BookOpen,
  Upload,
  UsersRound,
  UserCheck,
  MessageCircleWarning,
  List,
  BarChart3,
  UserMinus,
  Dumbbell,
  Salad,
  CreditCard,
  User,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import ProfileModal from "./ProfileModal";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SubItem {
  label: string;
  path: string;
  badge?: number;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: SubItem[];
  badge?: number;
}

// ─── Navegação principal (Coaching) ──────────────────────────────────────────

const coachingNav: NavGroup[] = [
  {
    label: "Resumo",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    label: "Agenda",
    icon: Calendar,
    path: "/schedule",
  },
  {
    label: "Produtos",
    icon: Package,
    children: [
      { label: "Meus Produtos", path: "/products/list" },
      { label: "Carrinho Abandonado", path: "/products/cart-recovery" },
      { label: "Afiliados", path: "/products/affiliates" },
    ],
  },
  {
    label: "Clientes",
    icon: Users,
    children: [
      { label: "Ativos", path: "/customers/actives" },
      { label: "Feedbacks", path: "/customers/feedbacks" },
      { label: "Todos os clientes", path: "/customers/list" },
      { label: "Engajamento", path: "/customers/engagement" },
      { label: "Desistências", path: "/customers/dropouts" },
    ],
  },
  {
    label: "Bibliotecas",
    icon: Library,
    children: [
      { label: "Treinos", path: "/library/workout" },
      { label: "Dietas", path: "/library/diet" },
    ],
  },
  {
    label: "Ferramentas",
    icon: Wrench,
    children: [
      { label: "Importar Clientes", path: "/tools/import/customers" },
      { label: "Importar Treinos/Dietas", path: "/tools/import/protocols" },
      { label: "Grupos", path: "/tools/groups" },
    ],
  },
  {
    label: "Financeiro",
    icon: DollarSign,
    path: "/finance",
  },
  {
    label: "Apps",
    icon: Grid2X2,
    path: "/apps",
  },
  {
    label: "Minha Conta",
    icon: UserCircle,
    children: [
      { label: "Configurações", path: "/account/settings" },
      { label: "Assinatura", path: "/account/subscription" },
    ],
  },
  {
    label: "Suporte",
    icon: HelpCircle,
    path: "/support",
  },
];

// ─── Navegação CRM (módulo existente) ─────────────────────────────────────────

const crmNav: NavGroup[] = [
  { label: "WhatsApp", icon: MessageSquare, path: "/whatsapp" },
  { label: "IA / RAG", icon: Bot, path: "/ai-rag" },
  { label: "Negócios", icon: Kanban, path: "/deals" },
  { label: "Contatos CRM", icon: UsersRound, path: "/contacts" },
  { label: "Config. CRM", icon: Settings, path: "/settings/geral" },
];

// ─── Ícones dos sub-items ──────────────────────────────────────────────────────

const subIconMap: Record<string, React.ElementType> = {
  "/customers/actives": UserCheck,
  "/customers/feedbacks": MessageCircleWarning,
  "/customers/list": List,
  "/customers/engagement": BarChart3,
  "/customers/dropouts": UserMinus,
  "/products/list": Package,
  "/products/cart-recovery": ShoppingCart,
  "/products/affiliates": Network,
  "/library/workout": Dumbbell,
  "/library/diet": Salad,
  "/tools/import/customers": Upload,
  "/tools/import/protocols": Upload,
  "/tools/groups": UsersRound,
  "/account/settings": User,
  "/account/subscription": CreditCard,
};

// ─── Componente NavItem com submenu ───────────────────────────────────────────

const NavItem = ({
  group,
  feedbackBadge,
}: {
  group: NavGroup;
  feedbackBadge: number;
}) => {
  const location = useLocation();

  const isChildActive = group.children?.some((c) =>
    location.pathname.startsWith(c.path)
  );
  const isActive =
    group.path !== undefined &&
    (group.path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(group.path));

  const [open, setOpen] = useState(isChildActive ?? false);

  // Abre automaticamente se um filho estiver ativo
  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [isChildActive]);

  const savedKey = `sidebar_open_${group.label}`;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem(savedKey, String(next));
  };

  // Item simples (sem submenu)
  if (group.path !== undefined && !group.children) {
    return (
      <NavLink
        to={group.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        )}
      >
        <group.icon className="w-5 h-5 shrink-0" />
        <span className="flex-1">{group.label}</span>
      </NavLink>
    );
  }

  // Item com submenu
  return (
    <div>
      <button
        onClick={toggle}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
          isChildActive
            ? "bg-sidebar-accent/30 text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        )}
      >
        <group.icon className="w-5 h-5 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 opacity-60" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-1 ml-4 pl-3 border-l border-sidebar-border space-y-0.5">
              {group.children!.map((child) => {
                const SubIcon = subIconMap[child.path];
                const childActive = location.pathname.startsWith(child.path);
                const isFeedbacks = child.path === "/customers/feedbacks";

                return (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150",
                      childActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {SubIcon && <SubIcon className="w-4 h-4 shrink-0 opacity-70" />}
                    <span className="flex-1">{child.label}</span>
                    {isFeedbacks && feedbackBadge > 0 && (
                      <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                        {feedbackBadge > 99 ? "99+" : feedbackBadge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── AppSidebar ───────────────────────────────────────────────────────────────

const AppSidebar = () => {
  const { user, logout } = useAuthStore();
  const [showProfile, setShowProfile] = useState(false);

  // Badge de feedbacks pendentes — será substituído por Supabase Realtime no Sprint 3
  const feedbackBadge = 0;

  return (
    <aside className="h-screen flex flex-col bg-sidebar border-r border-sidebar-border shrink-0 w-[240px]">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2 px-4 border-b border-sidebar-border shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-foreground whitespace-nowrap">
          Rebucci<span className="text-gradient">AI</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {/* Seção Coaching */}
        <p className="px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Coaching
        </p>
        {coachingNav.map((group) => (
          <NavItem key={group.label} group={group} feedbackBadge={feedbackBadge} />
        ))}

        {/* Separador CRM */}
        <div className="pt-3 pb-1">
          <div className="border-t border-sidebar-border" />
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            CRM
          </p>
        </div>
        {crmNav.map((group) => (
          <NavItem key={group.label} group={group} feedbackBadge={0} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        {user && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 flex-1 min-w-0 rounded-xl px-2 py-1.5 hover:bg-sidebar-accent/50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.role}</p>
              </div>
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-xl text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors shrink-0"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
        <AnimatePresence>
          {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
        </AnimatePresence>
      </div>
    </aside>
  );
};

export default AppSidebar;
