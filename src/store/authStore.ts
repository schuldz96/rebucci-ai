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
const mockHashCompare = (input: string, hash: string): boolean => {
  // In production, this would use bcrypt.compare()
  const mockHashes: Record<string, string> = {
    Violeiro12: "$2b$10$mockHashForVioleiro12",
  };
  return mockHashes[input] === hash;
};

const MOCK_USERS = [
  {
    id: "usr-1",
    email: "marcos.schuldz@gmail.com",
    passwordHash: "$2b$10$mockHashForVioleiro12",
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
    const found = MOCK_USERS.find(
      (u) => u.email === email && mockHashCompare(password, u.passwordHash)
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
