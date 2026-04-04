import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["data", "items", "results", "logs", "recommendations", "calendar", "events", "farms", "regions", "planting_logs"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}
