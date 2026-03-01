import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { encodeWAV } from "../utils/audioUtils";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

export const SYSTEM_INSTRUCTION = `You are CyberGuard AI, an advanced bilingual (Bengali and English) cyber security assistant. 
Your purpose is to provide expert advice on cyber security, threat intelligence, and safety guidelines.
You have deep knowledge of global standards like NIST, ISO, and local agencies like Bangladesh BGD e-GOV CIRT.

CRITICAL RULES:
1. ETHICS: Never provide instructions for hacking, unauthorized access, or any malicious activities. If asked, politely refuse and explain why, then offer defensive advice.
2. BILINGUAL: Respond in the language the user uses. If they use a mix, prefer the one that seems more dominant or appropriate for the context.
3. TONE: Professional, authoritative, yet accessible. Use technical terms where necessary but explain them if they are complex.
4. GROUNDING: Use Google Search to find the latest security vulnerabilities (CVEs), malware outbreaks, and cyber security news.
5. FORMATTING: Use clear Markdown with headings, bullet points, and bold text for readability.

When asked about specific agencies or standards, provide accurate and detailed information.
If the user asks for real-time updates, use the search tool.`;

export async function generateChatResponse(message: string, history: any[] = []) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        ...history,
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      },
    });

    return {
      text: response.text || "I'm sorry, I couldn't process that request.",
      groundingMetadata: response.candidates?.[0]?.groundingMetadata
    };
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
}

export async function generateSpeech(text: string) {
  try {
    const cleanText = text.replace(/[*#_`]/g, '').substring(0, 1000);
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly: ${cleanText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      // Convert base64 to Int16Array
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcmData = new Int16Array(bytes.buffer);
      
      // Encode to WAV
      const wavBlob = encodeWAV(pcmData, 24000);
      return URL.createObjectURL(wavBlob);
    }
    return null;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
}

export function connectLive(callbacks: {
  onopen?: () => void;
  onmessage: (message: LiveServerMessage) => void;
  onerror?: (error: any) => void;
  onclose?: () => void;
}) {
  return ai.live.connect({
    model: "gemini-2.5-flash-native-audio-preview-09-2025",
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
      },
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });
}
