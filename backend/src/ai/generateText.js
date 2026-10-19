import { GoogleGenAI } from "@google/genai";
import env from "../config/env.js";

const ai = new GoogleGenAI({
  apiKey: env.geminiApiKey,
});

const generateJson = async (prompt) => {

  //  Validate prompt
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("AI prompt is required.");
  }

  // Prevent unnecessarily large prompts
  if (prompt.length > 10000) {
    throw new Error("AI prompt is too long.");
  }

  // Check API key configuration
  if (!env.geminiApiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  // Call Gemini
  try {
    const response = await ai.models.generateContent({
      model: env.geminiModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    // Check Gemini response
    if (!response || !response.text) {
      throw new Error("Gemini returned an empty response.");
    }

    // Convert JSON text into JavaScript object
    try {

      return JSON.parse(response.text);
      
    } catch (error) {
      throw new Error("Gemini returned invalid JSON.");
    }
  } catch (error) {
    console.error("Gemini generation error:", error);

    throw new Error("Unable to generate AI response.");
  }
};

export { generateJson };