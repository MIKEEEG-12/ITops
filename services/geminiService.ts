
import { GoogleGenAI, Type } from "@google/genai";
import { Ticket } from "../types";

const apiKey = process.env.API_KEY || '';
// Initialize loosely; we will guard checks before calls.
const ai = new GoogleGenAI({ apiKey });

export const analyzeTicketAI = async (ticket: Ticket): Promise<{ suggestion: string; estimatedPriority: string }> => {
  if (!apiKey) return { suggestion: "API Key missing. Configure environment.", estimatedPriority: "Unknown" };

  try {
    const prompt = `
      Analyze the following IT support ticket:
      Title: ${ticket.title}
      Description: ${ticket.description}
      Department: ${ticket.department}
      
      Provide a JSON response with:
      1. 'suggestion': A concise technical suggestion or troubleshooting step for the IT staff.
      2. 'estimatedPriority': One of [Low, Medium, High, Critical] based on the urgency implied.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestion: { type: Type.STRING },
            estimatedPriority: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return { suggestion: "Could not generate analysis at this time.", estimatedPriority: "Unknown" };
  }
};

export const suggestAssetMaintenance = async (assetModel: string, ageInMonths: number): Promise<string> => {
   if (!apiKey) return "API Key missing.";

   try {
     const response = await ai.models.generateContent({
       model: 'gemini-2.5-flash',
       contents: `Given an IT asset model "${assetModel}" that is ${ageInMonths} months old, provide a one-sentence recommendation for its current maintenance or replacement lifecycle.`,
     });
     return response.text || "No recommendation available.";
   } catch (error) {
     return "AI Service Unavailable.";
   }
};

export const chatWithAI = async (message: string, context?: string): Promise<string> => {
  if (!apiKey) return "AI Chat is unavailable (Missing API Key).";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a helpful IT Support Assistant bot for NexGen IT. 
      Context: ${context || 'General IT Helpdesk query'}
      User: ${message}
      Response:`,
    });
    return response.text || "I'm not sure how to respond to that.";
  } catch (error) {
    return "I'm having trouble connecting to my brain right now.";
  }
};
