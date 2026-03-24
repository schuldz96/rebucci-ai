import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// Mock bcrypt-like hash comparison
const mockHashCompare = (input: string, storedHash: string): boolean => {
  // In production, this would use bcrypt.compare()
  // Simple mock: hash the input and compare
  const hash = `$2b$10$mock_${btoa(input)}`;
  return hash === storedHash;
};

// Pre-compute the mock hash for the default password
const DEFAULT_PASSWORD_HASH = `$2b$10$mock_${btoa("Violeiro12")}`;

const MOCK_USERS = [
  {
    id: "usr-1",
    email: "marcos.schuldz@gmail.com",
    passwordHash: DEFAULT_PASSWORD_HASH,
    name: "Marcos Schuldz",
    role: "Supervisor",
  },
];

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (email: string, password: string) => {
    // Simulate API call delay
    await new Promise((r) => setTimeout(r, 800));
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const found = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === normalizedEmail && mockHashCompare(normalizedPassword, u.passwordHash)
    );
    if (found) {
      set({
        user: { id: found.id, email: found.email, name: found.name, role: found.role },
        isAuthenticated: true,
      });
      return true;
    }
    return false;
  },
  logout: () => set({ user: null, isAuthenticated: false }),
}));
