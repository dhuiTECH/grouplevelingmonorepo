import { GoogleGenAI } from "@google/genai";
import { ReferenceImage, Resolution, StyleStrength, AssetType, SkillType, ModelType } from "../types";

interface GenerateAssetParams {
  prompt: string;
  category: string;
  references: ReferenceImage[];
  resolution: Resolution;
  styleStrength: StyleStrength;
  assetType: AssetType;
  frames?: number;
  skillType?: SkillType;
  model: ModelType;
  baseBodyImage?: string | null;
  apiKey?: string;
  signal?: AbortSignal;
}

// Helper to safely get API key
const getApiKey = (providedKey?: string): string | undefined => {
  if (providedKey) return providedKey;
  return undefined;
};

export const generateAsset = async ({
  prompt,
  category,
  references,
  resolution,
  styleStrength,
  assetType,
  frames = 4,
  skillType = 'Melee Slash',
  model,
  baseBodyImage,
  apiKey: providedKey,
  signal
}: GenerateAssetParams): Promise<string> => {
  
  if (signal?.aborted) {
    throw new Error("Generation cancelled");
  }

  const apiKey = getApiKey(providedKey);
  if (!apiKey) {
    throw new Error("API Key unavailable. Please provide your own Gemini API key in the settings.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  // --- SYSTEM CONTEXT CONSTRUCTION ---
  let systemContext = `You are a Game Asset Generator specializing in strict 1:1 overlays. `;
  systemContext += `Your goal is to create a new item that matches the exact perspective, scale, and position of the input template.\n`;

  // 1. SPATIAL ANCHOR / ANATOMY LOGIC
  if (baseBodyImage) {
    systemContext += `\n[MODE: GHOST MANNEQUIN OVERLAY]\n`;
    systemContext += `INPUT IMAGE 1 is the 'SPATIAL TEMPLATE' (Base Body).\n`;
    systemContext += `Any other inputs are 'STYLE REFS'.\n`;
    
    systemContext += `\n[STRICT GENERATION RULES]:\n`;
    systemContext += `1. LOCKED COORDINATES: The output image must align pixel-for-pixel with Input Image 1. Do NOT crop, zoom, or center the object.\n`;
    systemContext += `2. INVISIBLE WEARER: You are generating CLOTHING/EQUIPMENT for the character in Input 1. You must NOT draw the character's body, skin, face, or limbs. Draw ONLY the item floating in space at the correct position.\n`;
    systemContext += `3. 3D WRAPPING: The item should appear to wrap around the invisible body volume defined in Input 1. (e.g., show the inside back of a collar).\n`;
    systemContext += `4. TRANSPARENCY: The background must be fully transparent (Alpha 0). The area occupied by the body in Input 1 must be transparent in the output, unless covered by the generated item.\n`;
    
    // Category specific spatial instructions
    if (category === 'Head' || category === 'Face' || category === 'Hair' || category === 'Eyes' || category === 'Mouth') {
        systemContext += `FOCUS: Generate a helmet/mask/hair that fits exactly over the Head in Input 1. DO NOT render the face or head skin. The item must be isolated.\n`;
    } else if (category === 'Body' || category === 'Back') {
        systemContext += `FOCUS: Generate armor/clothing that fits exactly over the Torso/Arms in Input 1. DO NOT render the arms or neck skin.\n`;
    } else if (category === 'Feet') {
        systemContext += `FOCUS: Generate boots/shoes that fit exactly over the Feet in Input 1. DO NOT render the legs.\n`;
    } else if (category === 'Weapons') {
        systemContext += `FOCUS: Generate a weapon that fits exactly in the Hand Grip position of Input 1. Do not render the hand or fingers.\n`;
    }
  } else {
    // Standalone generation
    systemContext += `Create a standalone asset isolated on a transparent background.\n`;
    
    if (category === 'Skill Icons') {
        systemContext += `[TYPE: SKILL ICON]\n`;
        systemContext += `Generate a high-quality, square-composition game ability icon. Bold, clear silhouette, centered. \n`;
    } else if (category === 'Mobs') {
        systemContext += `[TYPE: MOB/MONSTER]\n`;
        systemContext += `Generate a hostile creature or enemy unit isolated on a transparent background. Focus on clear silhouette and combat-readiness.\n`;
    } else if (category === 'Pets') {
        systemContext += `[TYPE: PET/COMPANION]\n`;
        systemContext += `Generate a friendly companion creature isolated on a transparent background. Smaller scale features, appealing design.\n`;
    } else if (category === 'NPCs') {
        systemContext += `[TYPE: NPC CHARACTER]\n`;
        systemContext += `Generate a non-player character isolated on a transparent background. Focus on personality, role-indicator clothing, and idle pose.\n`;
    }
  }

  // 2. SPRITESHEET LOGIC
  if (assetType === 'spritesheet') {
    if (category === 'Skills FX') {
        const layout = frames > 25 ? "6x6 Grid" : frames > 16 ? "5x5 Grid" : frames > 8 ? "4x4 Grid" : "Horizontal Strip";
        systemContext += `\n[TYPE: VFX SPRITESHEET]\n`;
        systemContext += `Create a '${skillType.toUpperCase()}' effect sequence (${frames} frames, ${layout}). `;
        systemContext += `Pure energy/effect only. No character body.\n`;
        systemContext += `STRICT CENTERING: Each frame in the sequence must be perfectly centered within its cell. There should be no horizontal or vertical drift. The core of the effect should remain at the center of the frame throughout the animation.\n`;
    } else {
        const layout = frames > 25 ? "6x6 Grid" : frames > 16 ? "5x5 Grid" : frames > 8 ? "4x4 Grid" : "Horizontal Strip";
        systemContext += `\n[TYPE: CHARACTER ANIMATION SHEET]\n`;
        systemContext += `Create a sequential animation: ${frames} frames, ${layout}. `;
        systemContext += `STRICT CENTERING: Each animation frame must be perfectly centered within its cell. Avoid any drift or shifting to the edges unless it is part of the animation movement.\n`;
        if (baseBodyImage) {
             systemContext += `CRITICAL: Maintain the exact spatial alignment with the Base Body across ALL frames. The item must move exactly as the body moves in the template. Do NOT render the body parts.\n`;
        }
    }
  }

  // 3. BACKGROUND LOGIC
  if (category === 'Background') {
    systemContext += `Fill the entire canvas. No transparency.\n`;
  } else {
    systemContext += `BACKGROUND: Transparent (Alpha 0). No solid colors. Check the alpha channel to ensure the background is empty.\n`;
  }

  // 4. STYLE & REFERENCES
  if (references.length > 0) {
    systemContext += `\n[STYLE INSTRUCTIONS]\n`;
    if (baseBodyImage) {
        systemContext += `Apply the VISUAL STYLE (Texture, Colors, Line Work) of the Reference Images to the GEOMETRY defined by Input Image 1.\n`;
    }
    
    if (styleStrength === 'Exact match') {
      systemContext += `Copy the reference style exactly (pixel art technique, shading, palette).\n`;
    } else if (styleStrength === 'Slight variation') {
      systemContext += `Follow the reference style closely.\n`;
    } else {
      systemContext += `Use the reference style as inspiration.\n`;
    }
  }

  // 5. USER PROMPT
  systemContext += `\n[ITEM TO GENERATE]: ${prompt}`;

  try {
    const parts: any[] = [];

    // ORDER MATTERS:
    // 1. Base Body (Coordinate Anchor) - MUST BE FIRST
    if (baseBodyImage) {
        const cleanData = baseBodyImage.includes('base64,') ? baseBodyImage.split('base64,')[1] : baseBodyImage;
        parts.push({
            inlineData: {
                mimeType: "image/png",
                data: cleanData
            }
        });
    }

    // 2. Style References (Texture/Design)
    references.forEach(ref => {
      // Safety check for malformed reference data
      if (ref.data) {
          const cleanData = ref.data.includes('base64,') ? ref.data.split('base64,')[1] : ref.data;
          parts.push({
            inlineData: {
              mimeType: ref.mimeType || "image/png",
              data: cleanData
            }
          });
      }
    });

    // 3. Text Instructions
    parts.push({ text: systemContext });

    // Aspect Ratio Logic
    let ratio = '1:1';
    if (assetType === 'spritesheet' && frames <= 8) {
        ratio = '16:9'; 
    }

    const config: any = {
        imageConfig: {
          aspectRatio: ratio,
        }
    };
    
    // imageSize is supported by 3-pro-image-preview and 3.1-flash-image-preview (Nano Banana 2)
    if (model === 'gemini-3-pro-image-preview' || model === 'gemini-3.1-flash-image-preview') {
        // Map 512 to 1K for the API because API doesn't support 512 natively.
        // We will resize on client side.
        config.imageConfig.imageSize = resolution === '512' ? '1K' : resolution;
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: config
    });

    if (response.candidates && response.candidates.length > 0) {
      const content = response.candidates[0].content;
      if (content && content.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
             return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("No image data found in response.");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};