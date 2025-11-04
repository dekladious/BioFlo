import ChatInterface from "@/components/ChatInterface";

export default function ChatPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">BioFlo Chat</h1>
      <ChatInterface />
    </main>
  );
}
