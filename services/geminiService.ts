
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig, RemixConfig } from "../types";

export const checkApiKey = async (): Promise<boolean> => {
  if (localStorage.getItem('custom_gemini_api_key')) return true;
  const win = window as any;
  if (win.aistudio && win.aistudio.hasSelectedApiKey) {
    return await win.aistudio.hasSelectedApiKey();
  }
  return false;
};

export const promptForApiKey = async (): Promise<void> => {
  const win = window as any;
  if (win.aistudio && win.aistudio.openSelectKey) {
    await win.aistudio.openSelectKey();
  }
};

export const getActiveApiKey = (): string | null => {
  const customKey = localStorage.getItem('custom_gemini_api_key');
  if (customKey) return customKey;
  return process.env.API_KEY || null;
};

export const setCustomApiKey = (key: string) => {
  localStorage.setItem('custom_gemini_api_key', key);
};

export const clearCustomApiKey = () => {
  localStorage.removeItem('custom_gemini_api_key');
};

export const generateImageFromPrompt = async (
  prompt: string,
  config: GenerationConfig,
  isProductMode: boolean = false
): Promise<string> => {
  const apiKey = getActiveApiKey();
  if (!apiKey) throw new Error("API Key not found. Please set one in settings.");

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-pro-image-preview";

  // If product mode is on, enhance the prompt for isolation
  const finalPrompt = isProductMode 
    ? `Isolated product shot of ${prompt}, studio lighting, professional product photography, clean solid white background, ultra-sharp focus, commercial quality, 8k resolution.`
    : prompt;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: finalPrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio,
          imageSize: config.imageSize,
        },
      },
    });

    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error("No image data found.");
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) {
         await promptForApiKey();
    }
    throw error;
  }
};

/**
 * Intelligent product replacement.
 * Blends a product asset into a base image at a specific masked location.
 */
export const smartReplaceProduct = async (
    baseImage: string, 
    maskImage: string, 
    productAsset: string, 
    instruction: string
): Promise<string> => {
    const apiKey = getActiveApiKey();
    if (!apiKey) throw new Error("API Key not found");

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash-image';

    const cleanBase = baseImage.replace(/^data:image\/\w+;base64,/, "");
    const cleanProduct = productAsset.replace(/^data:image\/\w+;base64,/, "");
    // Note: mask is usually sent baked into the base or as a description. 
    // Here we send them as parts.

    try {
        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/png', data: cleanBase }, },
                    { inlineData: { mimeType: 'image/png', data: cleanProduct }, },
                    { text: `TASK: Replace the object in the first image with the product from the second image. 
                             CONTEXT: The user has masked the area to replace. 
                             INSTRUCTION: ${instruction || "Place the product naturally, matching the perspective, lighting, and shadows of the room."} 
                             OUTPUT: Return the high-quality edited image.` }
                ]
            }
        });

        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("Smart replacement failed.");
    } catch (error: any) {
        console.error("Smart Replace Error:", error);
        throw error;
    }
};

export const describeImage = async (base64Image: string): Promise<string> => {
    const apiKey = getActiveApiKey();
    if (!apiKey) throw new Error("API Key not found");
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-flash-preview';
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64Data } },
            { text: "Describe this image in detail for a high-quality generation prompt." }
          ]
        }
      });
      return response.text || "An image";
    } catch (error) { return "An image"; }
};

export const generateRemix = async (referenceImage: string, userPrompt: string, remixConfig: RemixConfig, genConfig: GenerationConfig): Promise<string> => {
    const apiKey = getActiveApiKey();
    if (!apiKey) throw new Error("API Key not found");
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-pro-image-preview';
    const base64Data = referenceImage.replace(/^data:image\/\w+;base64,/, "");
    
    let role = remixConfig.creativity < 0.4 ? "High Fidelity" : remixConfig.creativity < 0.7 ? "Variation" : "Reimagine";
    const fullPrompt = `Mode: ${role}. Prompt: ${userPrompt}. Match Structure: ${remixConfig.structureMatch}. Match Character: ${remixConfig.characterMatch}.`;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ inlineData: { mimeType: 'image/png', data: base64Data } }, { text: fullPrompt }] },
        config: { imageConfig: { aspectRatio: genConfig.aspectRatio, imageSize: genConfig.imageSize } },
    });
    return `data:image/png;base64,${response.candidates?.[0].content.parts.find(p => p.inlineData)?.inlineData?.data}`;
};

export const editGeneratedImage = async (base64Image: string, instruction: string): Promise<string> => {
    const apiKey = getActiveApiKey();
    const ai = new GoogleGenAI({ apiKey: apiKey! });
    const model = 'gemini-2.5-flash-image';
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ inlineData: { mimeType: 'image/png', data: base64Data } }, { text: instruction }] }
    });
    return `data:image/png;base64,${response.candidates?.[0].content.parts.find(p => p.inlineData)?.inlineData?.data}`;
};

export const generateMask = async (base64Image: string): Promise<string> => {
  const apiKey = getActiveApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey! });
  const model = 'gemini-2.5-flash-image';
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
  const response = await ai.models.generateContent({
    model,
    contents: { parts: [{ inlineData: { mimeType: 'image/png', data: base64Data } }, { text: "Generate a high-contrast black and white mask where the main subject is white and the background is black." }] }
  });
  return `data:image/png;base64,${response.candidates?.[0].content.parts.find(p => p.inlineData)?.inlineData?.data}`;
};
