'use client';

import { Hash, LogOut, ChevronDown } from 'lucide-react';

interface SidebarUser {
  name: string;
  role: string;
  avatar_initials: string;
  email: string;
}

interface SidebarProps {
  user: SidebarUser | null;
  onLogout: () => void;
}

const channels = [
  { name: 'general', active: false },
  { name: 'expense-reports', active: true },
  { name: 'policy-updates', active: false },
];

export default function Sidebar({ user, onLogout }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 flex h-screen w-[240px] flex-col bg-[#1A1A1A] text-white">
      {/* Logo & Workspace */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1F8844] text-sm font-bold text-white">
            E
          </div>
          <span className="text-lg font-semibold tracking-tight">ema</span>
        </div>
        <p className="mt-1 text-xs text-white/50">NexGen Industries</p>
      </div>

      {/* Channels */}
      <div className="mt-4 flex-1 overflow-y-auto px-2">
        <button className="flex w-full items-center gap-1 px-2 py-1 text-xs font-medium uppercase tracking-wide text-white/40">
          <ChevronDown className="h-3 w-3" />
          Channels
        </button>

        <ul className="mt-1 space-y-0.5">
          {channels.map((channel) => (
            <li key={channel.name}>
              <button
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  channel.active
                    ? 'bg-white/10 font-medium text-white'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                }`}
              >
                <Hash className="h-4 w-4 shrink-0" />
                {channel.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* User Footer */}
      {user && (
        <div className="border-t border-white/10 px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
              {user.avatar_initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">
                {user.name}
              </p>
              <span className="inline-block rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/60">
                {user.role}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="shrink-0 rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
