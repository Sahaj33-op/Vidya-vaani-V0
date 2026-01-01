import { v4 as uuidv4 } from "uuid";
import { createLogger } from "./logger";

const logger = createLogger("ChatUtils");

/**
 * Generates a unique session ID for tracking conversations
 */
export function generateSessionId(): string {
  return uuidv4();
}

/**
 * Returns flag emoji for a given language code
 */
export function getLanguageFlag(code: string): string {
  const flags: Record<string, string> = {
    en: "🇬🇧",
    hi: "🇮🇳",
    mr: "🇮🇳",
    mwr: "🇮🇳",
  };
  return flags[code] || "🌐";
}

/**
 * Returns language name for a given code
 */
export function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: "English",
    hi: "Hindi",
    mr: "Marathi",
    mwr: "Marwari",
  };
  return names[code] || "Unknown";
}

/**
 * Formats timestamp as relative time or absolute
 */
export function formatTimestamp(date: Date, short: boolean = false): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (short) {
    if (seconds < 60) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  }

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}

/**
 * Message interface for chat
 */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  language: string;
}

const STORAGE_KEY = "vidya-vaani-chat";
const LANGUAGE_KEY = "vidya-vaani-language";

/**
 * Save messages to localStorage
 */
export function saveMessagesToLocalStorage(messages: Message[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    logger.error("Failed to save to localStorage", error);
  }
}

/**
 * Load messages from localStorage
 */
export function loadMessagesFromLocalStorage(): Message[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const messages = JSON.parse(data);
    // Convert timestamp strings back to Date objects
    return messages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
  } catch (error) {
    logger.error("Failed to load from localStorage", error);
    return [];
  }
}

/**
 * Clear messages from localStorage
 */
export function clearMessagesFromLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    logger.error("Failed to clear localStorage", error);
  }
}

/**
 * Save language preference
 */
export function saveLanguagePreference(language: string): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    logger.error("Failed to save language preference", error);
  }
}

/**
 * Load language preference
 */
export function loadLanguagePreference(): string {
  try {
    return localStorage.getItem(LANGUAGE_KEY) || "en";
  } catch (error) {
    logger.error("Failed to load language preference", error);
    return "en";
  }
}
