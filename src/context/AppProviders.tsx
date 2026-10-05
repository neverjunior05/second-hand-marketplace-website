"use client";

/**
 * Context API providers for auth + cart state (single account buys AND sells).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiError } from "@/services/api";
import { auth, cartService, type SessionUser } from "@/services";

type AuthState = {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  signup: (payload: { name: string; email: string; password: string; city?: string }) => Promise<SessionUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AppProviders");
  return ctx;
}

type CartState = {
  count: number;
  loading: boolean;
  refresh: () => Promise<void>;
  add: (bookId: number, quantity?: number) => Promise<string>;
  update: (id: number, quantity: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
  clearLocal: () => void;
};

const CartContext = createContext<CartState | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside AppProviders");
  return ctx;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [cartLoading, setCartLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setUser(await auth.me());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshCart = useCallback(async () => {
    setCartLoading(true);
    try {
      const data = await cartService.get();
      setCount(data.items.length);
    } catch {
      setCount(0);
    } finally {
      setCartLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (user) void refreshCart();
    else setCount(0);
  }, [user, refreshCart]);

  const login = useCallback(
    async (email: string, password: string) => {
      const next = await auth.login({ email, password });
      setUser(next);
      return next;
    },
    [],
  );

  const signup = useCallback(async (payload: { name: string; email: string; password: string; city?: string }) => {
    const next = await auth.signup(payload);
    setUser(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch (error) {
      throw new Error(apiError(error));
    } finally {
      setUser(null);
      setCount(0);
    }
  }, []);

  const add = useCallback(
    async (bookId: number, quantity = 1) => {
      if (!user) throw new Error("Sign in to add books to your cart.");
      const data = await cartService.add(bookId, quantity);
      setCount(data.cartCount);
      return "Added to your cart.";
    },
    [user],
  );

  const update = useCallback(async (id: number, quantity: number) => {
    await cartService.update(id, quantity);
    const data = await cartService.get();
    setCount(data.items.length);
  }, []);

  const remove = useCallback(async (id: number) => {
    await cartService.remove(id);
    const data = await cartService.get();
    setCount(data.items.length);
  }, []);

  const authValue = useMemo<AuthState>(
    () => ({ user, loading, login, signup, logout, refresh }),
    [user, loading, login, signup, logout, refresh],
  );

  const cartValue = useMemo<CartState>(
    () => ({
      count,
      loading: cartLoading,
      refresh: refreshCart,
      add,
      update,
      remove,
      clearLocal: () => setCount(0),
    }),
    [count, cartLoading, refreshCart, add, update, remove],
  );

  return (
    <AuthContext.Provider value={authValue}>
      <CartContext.Provider value={cartValue}>{children}</CartContext.Provider>
    </AuthContext.Provider>
  );
}
