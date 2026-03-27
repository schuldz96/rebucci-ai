import { useAuthStore } from "@/store/authStore";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Kanban,
  Settings,
  LogOut,
  Bot,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import ProfileModal from "./ProfileModal";
import { AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Contatos", icon: Users, path: "/contacts" },
  { label: "Negócios", icon: Kanban, path: "/deals" },
  { label: "WhatsApp", icon: MessageSquare, path: "/whatsapp" },
  { label: "Configurações", icon: Settings, path: "/settings" },
];

const AppSidebar = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <aside className="h-screen flex flex-col bg-sidebar border-r border-sidebar-border shrink-0 w-[240px]">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-foreground whitespace-nowrap">
          Rebucci<span className="text-gradient">AI</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        {user && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 flex-1 min-w-0 rounded-xl px-2 py-1.5 hover:bg-sidebar-accent/50 transition-colors text-left">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.role}</p>
              </div>
            </button>
            <button onClick={logout}
              className="p-2 rounded-xl text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors shrink-0">
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
