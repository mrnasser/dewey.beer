import { GoogleGenAI, SchemaType } from "@google/genai";

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

export const generateBeerCreative = async (name: string, style: string, abv: number, notes: string): Promise<any> => {
  if (!ai) return null;

  try {
    const prompt = `
      I have a beer on tap.
      Name: ${name}
      Style: ${style}
      ABV: ${abv}%
      Notes: ${notes}

      Please generate the following in JSON format:
      1. A creative, catchy name for this beer (if the current name is generic, otherwise keep it or enhance it slightly).
      2. A enticing 2-sentence description suitable for a menu.
      3. A short suggested food pairing.
      
      Return JSON structure: { "name": string, "description": string, "foodPairing": string }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error generating beer creative:", error);
    return null;
  }
};