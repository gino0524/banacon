"use client";

import { useActionState } from "react";
import { createEvent, type EventFormState } from "@/app/actions";

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-500";

export default function NewEventForm() {
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(
    createEvent,
    {},
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium">
          제목
        </label>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={80}
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="startAt" className="text-sm font-medium">
          시작 일시 <span className="text-zinc-400">(KST 기준)</span>
        </label>
        <input
          id="startAt"
          name="startAt"
          type="datetime-local"
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="endAt" className="text-sm font-medium">
          종료 일시 <span className="text-zinc-400">(선택, KST 기준)</span>
        </label>
        <input
          id="endAt"
          name="endAt"
          type="datetime-local"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="location" className="text-sm font-medium">
          장소 <span className="text-zinc-400">(선택)</span>
        </label>
        <input id="location" name="location" type="text" className={inputClass} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-sm font-medium">
          설명 <span className="text-zinc-400">(선택)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className={inputClass}
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "만드는 중…" : "일정 만들기"}
      </button>
    </form>
  );
}
