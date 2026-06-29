import NewEventForm from "./NewEventForm";

// 6장 /events/new: 일정 생성 폼. 접근은 proxy 게이트가 보호한다.
export default function NewEventPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
      <h1 className="text-xl font-bold tracking-tight">새 일정</h1>
      <NewEventForm />
    </main>
  );
}
