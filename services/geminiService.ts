import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY;

let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey: apiKey });
} else {
  console.warn("Gemini API Key not found. AI features will be disabled.");
}

export const generateDailyVibe = async (): Promise<string> => {
  if (!ai) return "Welcome back, Commander. System is online.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Generate a very short, witty, cyberpunk-style system status message welcoming the user back to their home server. Max 15 words.",
    });
    
    return response.text || "System Online.";
  } catch (error) {
    console.error("Error generating vibe:", error);
    return "System status: Online. AI module offline.";
  }
};