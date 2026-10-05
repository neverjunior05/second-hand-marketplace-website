"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AppProviders";
import { apiError } from "@/services/api";

const demoAccounts = [
  { label: "Buyer demo", email: "rahul@bindery.test", password: "Password@123" },
  { label: "Seller demo", email: "priya@bindery.test", password: "Password@123" },
  { label: "Admin", email: "admin@bindery.test", password: "Admin@123" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(apiError(err, "Could not sign in."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 py-6 md:grid-cols-2">
      <form onSubmit={submit} className="card p-6">
        <h1 className="font-display text-2xl">Sign in</h1>
        <p className="mt-1 text-sm text-ink-soft">One account buys and sells.</p>
        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-[#F5484B]">{error}</p> : null}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-sm text-ink-soft">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-brand hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </form>

      <div className="card p-6">
        <h2 className="font-display text-xl">Demo accounts</h2>
        <p className="mt-1 text-sm text-ink-soft">Seeded data — click to fill the form.</p>
        <ul className="mt-4 flex flex-col gap-2">
          {demoAccounts.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                className="w-full rounded-xl border border-hairline bg-cream p-3 text-left text-sm hover:border-brand"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
              >
                <span className="font-semibold">{account.label}</span>
                <span className="block text-ink-soft">
                  {account.email} · {account.password}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
