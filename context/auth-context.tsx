import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { db } from '../db/client';
import { users, type User } from '../db/schema';
import { seedForUser } from '../db/seed';

const SESSION_KEY = 'tripper.session';

export type PublicUser = Omit<User, 'passwordHash'>;

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  register: (name: string, email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

function toPublic(u: User): PublicUser {
  const { passwordHash: _drop, ...rest } = u;
  return rest;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as { userId: number };
          const [found] = await db.select().from(users).where(eq(users.id, parsed.userId));
          if (found) setUser(toPublic(found));
        }
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistSession = async (u: User) => {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ userId: u.id }));
    setUser(toPublic(u));
  };

  const register: AuthContextValue['register'] = async (name, email, password) => {
    const cleanEmail = normaliseEmail(email);
    const cleanName = name.trim();
    if (!cleanName) return { ok: false, error: 'Please enter your name.' };
    if (!cleanEmail.includes('@')) return { ok: false, error: 'Please enter a valid email.' };
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

    const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (existing.length > 0) return { ok: false, error: 'An account with that email already exists.' };

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const now = new Date().toISOString();
    const [inserted] = await db
      .insert(users)
      .values({ name: cleanName, email: cleanEmail, passwordHash, createdAt: now })
      .returning();

    await seedForUser(inserted.id, db);
    await persistSession(inserted);
    return { ok: true };
  };

  const login: AuthContextValue['login'] = async (email, password) => {
    const cleanEmail = normaliseEmail(email);
    const [found] = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (!found) return { ok: false, error: 'No account found with that email.' };
    const ok = bcrypt.compareSync(password, found.passwordHash);
    if (!ok) return { ok: false, error: 'Incorrect password.' };
    await persistSession(found);
    return { ok: true };
  };

  const logout: AuthContextValue['logout'] = async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  const deleteAccount: AuthContextValue['deleteAccount'] = async () => {
    if (!user) return;
    await db.delete(users).where(eq(users.id, user.id));
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, register, login, logout, deleteAccount }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
