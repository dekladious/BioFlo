// Protocol tracking utilities

export type ProtocolStatus = "not_started" | "in_progress" | "completed" | "paused";

export interface ProtocolDay {
  date: string; // ISO date string
  completed: boolean;
  notes?: string;
}

export interface TrackedProtocol {
  id: string;
  name: string;
  description: string;
  startDate: string;
  duration: number; // days
  status: ProtocolStatus;
  days: ProtocolDay[];
  createdAt: string;
  updatedAt: string;
}

export function createProtocol(name: string, description: string, duration: number): TrackedProtocol {
  const today = new Date().toISOString().split("T")[0];
  const days: ProtocolDay[] = [];
  
  for (let i = 0; i < duration; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    days.push({
      date: date.toISOString().split("T")[0],
      completed: false,
    });
  }
  
  return {
    id: crypto.randomUUID(),
    name,
    description,
    startDate: today,
    duration,
    status: "in_progress",
    days,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function markDayComplete(protocol: TrackedProtocol, date: string): TrackedProtocol {
  const updatedDays = protocol.days.map((day) =>
    day.date === date ? { ...day, completed: true } : day
  );
  
  const completedCount = updatedDays.filter((d) => d.completed).length;
  const status: ProtocolStatus =
    completedCount === protocol.duration
      ? "completed"
      : completedCount > 0
      ? "in_progress"
      : "not_started";
  
  return {
    ...protocol,
    days: updatedDays,
    status,
    updatedAt: new Date().toISOString(),
  };
}

export function getProtocolProgress(protocol: TrackedProtocol): number {
  const completed = protocol.days.filter((d) => d.completed).length;
  return Math.round((completed / protocol.duration) * 100);
}

