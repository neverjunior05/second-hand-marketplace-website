"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AppProviders";
import { apiError } from "@/services/api";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", city: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signup(form);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(apiError(err, "Could not create the account."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl py-6">
      <form onSubmit={submit} className="card p-6">
        <h1 className="font-display text-2xl">Join Bindery</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Every account can buy <em>and</em> list books — no separate seller role. Only moderation is elevated.
        </p>
        <div className="mt-5 grid gap-4">
          <div>
            <label className="label" htmlFor="name">
              Full name
            </label>
            <input id="name" className="input" value={form.name} onChange={set("name")} required minLength={2} />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" className="input" type="email" value={form.email} onChange={set("email")} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="city">
                City (shown to buyers)
              </label>
              <input id="city" className="input" value={form.city} onChange={set("city")} />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password (8+ chars)
              </label>
              <input
                id="password"
                className="input"
                type="password"
                value={form.password}
                onChange={set("password")}
                required
                minLength={8}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-[#F5484B]">{error}</p> : null}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
          <p className="text-sm text-ink-soft">
            Already a member?{" "}
            <Link href="/login" className="font-semibold text-brand hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
