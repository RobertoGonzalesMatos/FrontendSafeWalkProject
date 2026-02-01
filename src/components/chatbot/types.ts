import type { Coordinates } from "../../services/geminiService";

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface ChatbotProps {
  /** User's current location coordinates */
  userLocation: Coordinates | null;
  /** Destination coordinates */
  destination: Coordinates | null;
  /** Human-readable pickup location label */
  pickupLabel?: string;
  /** Human-readable destination label */
  destinationLabel?: string;
}

export const CHATBOT_COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  border: "#334155",
  text: "#FFFFFF",
  muted: "#94A3B8",
  yellow: "#F4C430",
  yellowDark: "#D9A800",
  blue: "#1E90FF",
  inputBg: "#0B1C2D",
  userBubble: "#F4C430",
  botBubble: "#1E293B",
  overlay: "rgba(0,0,0,0.5)",
} as const;
