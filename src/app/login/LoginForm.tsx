"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "@/app/actions";

type User = { id: string; name: string; avatarColor: string | null };

export default function LoginForm({ users }: { users: User[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="inviteCode" className="text-sm font-medium">
          초대코드
        </label>
        <input
          id="inviteCode"
          name="inviteCode"
          type="password"
          autoComplete="off"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">이름</span>
        <input type="hidden" name="userId" value={selectedId} />
        <div className="grid grid-cols-3 gap-2">
          {users.map((u) => {
            const active = u.id === selectedId;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedId(u.id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-sm transition-colors ${
                  active
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: u.avatarColor ?? "#a1a1aa" }}
                />
                {u.name}
              </button>
            );
          })}
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || !selectedId}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "입장 중…" : "입장하기"}
      </button>
    </form>
  );
}
