"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type UserRole = "employee" | "manager" | "chro" | "admin";

interface DemoUser {
  name: string;
  role: UserRole;
  title: string;
  email: string;
  initials: string;
  color: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    name: "Tanya Sharma",
    role: "employee",
    title: "Senior Account Manager",
    email: "tanya@nexgen.demo",
    initials: "TS",
    color: "bg-purple-500",
  },
  {
    name: "Mihir Desai",
    role: "manager",
    title: "Engineering Manager",
    email: "mihir@nexgen.demo",
    initials: "MD",
    color: "bg-blue-500",
  },
  {
    name: "Chitra Nair",
    role: "chro",
    title: "Chief HR Officer",
    email: "chitra@nexgen.demo",
    initials: "CN",
    color: "bg-green-600",
  },
  {
    name: "System Admin",
    role: "admin",
    title: "System Administrator",
    email: "admin@nexgen.demo",
    initials: "SA",
    color: "bg-gray-500",
  },
];

const DEMO_PASSWORD = "demo1234";

function getRedirectPath(role: UserRole): string {
  return role === "employee" ? "/chat" : "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  async function handleLogin(user: DemoUser) {
    if (loadingEmail) return;

    setLoadingEmail(user.email);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: DEMO_PASSWORD,
      });

      if (error) {
        toast.error("Login failed", {
          description: error.message,
        });
        setLoadingEmail(null);
        return;
      }

      toast.success(`Welcome, ${user.name}!`);
      const next = searchParams.get("next");
      const redirectTo = next && next.startsWith("/") ? next : getRedirectPath(user.role);
      router.push(redirectTo);
      router.refresh();
    } catch {
      toast.error("Something went wrong", {
        description: "Please try again.",
      });
      setLoadingEmail(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-2xl">
        {/* Branding */}
        <div className="mb-10 text-center">
          <div className="mb-2 inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F8844]">
              <span className="text-lg font-bold text-white">E</span>
            </div>
            <span className="text-sm font-medium tracking-wide text-[#1F8844]">
              ema
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            NexGen Industries
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            T&amp;E AI Employee &mdash; Powered by Ema
          </p>
        </div>

        {/* User Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {DEMO_USERS.map((user) => {
            const isLoading = loadingEmail === user.email;
            const isDisabled = loadingEmail !== null;

            return (
              <button
                key={user.email}
                onClick={() => handleLogin(user)}
                disabled={isDisabled}
                className="group relative flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:border-[#1F8844]/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#1F8844]/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {/* Avatar */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${user.color}`}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    user.initials
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {user.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {user.email}
                  </p>
                </div>

                {/* Role badge */}
                <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-600">
                  {user.role}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-400">
          Demo environment &mdash; click any card to sign in
        </p>
      </div>
    </div>
  );
}
