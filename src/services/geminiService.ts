import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY } from "../config";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DirectionsContext {
  userLocation: Coordinates | null;
  destination: Coordinates | null;
  pickupLabel?: string;
  destinationLabel?: string;
}

/**
 * Generates walking directions using Gemini AI based on coordinates and user message
 */
export async function getDirections(
  context: DirectionsContext,
  userMessage: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const locationInfo = context.userLocation
    ? `Current Location: ${context.userLocation.lat.toFixed(6)}, ${context.userLocation.lng.toFixed(6)}${context.pickupLabel ? ` (${context.pickupLabel})` : ""}`
    : "Current Location: Not available";

  const destInfo = context.destination
    ? `Destination: ${context.destination.lat.toFixed(6)}, ${context.destination.lng.toFixed(6)}${context.destinationLabel ? ` (${context.destinationLabel})` : ""}`
    : "Destination: Not specified";

  const systemPrompt = `You are a helpful walking directions assistant for SafeWalk, a campus safety escort service at Brown University in Providence, RI.

Your role is to provide:
- Clear, step-by-step walking directions based on coordinates
- Safety tips for nighttime walking on campus
- Estimated walking times
- Landmark references when possible (buildings, streets, notable locations)

Context:
${locationInfo}
${destInfo}

Guidelines:
- Be concise but thorough
- Prioritize well-lit paths and main walkways
- Mention any notable landmarks or buildings along the route
- If coordinates aren't available, provide general campus navigation tips
- Always maintain a friendly, reassuring tone

User question: ${userMessage}`;

  try {
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini API error:", error);
    throw new Error(
      error.message || "Unable to get directions. Please try again."
    );
  }
}

/**
 * Generates a welcome message based on current context
 */
export function getWelcomeMessage(context: DirectionsContext): string {
  if (context.userLocation && context.destination) {
    return `Hi! I can help you with walking directions from ${context.pickupLabel || "your location"} to ${context.destinationLabel || "your destination"}. Ask me anything about the route!`;
  } else if (context.destination) {
    return `Hi! I can help you navigate to ${context.destinationLabel || "your destination"}. What would you like to know?`;
  }
  return "Hi! I'm your SafeWalk directions assistant. Once your walk is active, I can help you with route guidance and safety tips!";
}
