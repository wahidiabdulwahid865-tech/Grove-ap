"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const sendLink = async (e) => {
    e.preventDefault();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#15120D" }}>
      <div className="w-full max-w-sm p-6 rounded-2xl" style={{ background: "#211C15", border: "1px solid #372F22" }}>
        <h1
          className="text-3xl mb-2"
          style={{ color: "#EDE6D8", fontFamily: "'Fraunces',serif", fontWeight: 600 }}
        >
          Grove
        </h1>
        <p className="text-sm mb-5" style={{ color: "#A79C89" }}>
          Sign in with your email — we'll send a magic link, no password needed.
        </p>
        {sent ? (
          <p className="text-sm" style={{ color: "#8FA663" }}>
            Check your inbox for a sign-in link.
          </p>
        ) : (
          <form onSubmit={sendLink} className="flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
              style={{ background: "#15120D", border: "1px solid #372F22", color: "#EDE6D8" }}
            />
            <button
              type="submit"
              className="w-full rounded-xl py-2.5 text-sm font-medium"
              style={{ background: "#E0A452", color: "#15120D" }}
            >
              Send magic link
            </button>
          </form>
        )}
      </div>
    </div>
  );
              }
