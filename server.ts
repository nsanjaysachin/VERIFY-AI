import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Allow large payloads for base64 camera image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper to get GoogleGenAI instance
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Clean base64 string helper
function cleanBase64(dataUrl: string): { mimeType: string; data: string } {
  if (dataUrl.includes(";base64,")) {
    const parts = dataUrl.split(";base64,");
    const mimeMatch = parts[0].match(/data:(.*?)$/);
    return {
      mimeType: mimeMatch ? mimeMatch[1] : "image/jpeg",
      data: parts[1],
    };
  }
  return {
    mimeType: "image/jpeg",
    data: dataUrl,
  };
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Endpoint: AI Home Analysis (SCREEN 3)
app.post("/api/ai/analyze-home", async (req, res) => {
  try {
    const { images } = req.body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "At least one home photo is required." });
    }

    const ai = getGeminiClient();

    // Prepare image parts
    const imageParts = images.slice(0, 8).map((imgUrl: string) => {
      const { mimeType, data } = cleanBase64(imgUrl);
      return {
        inlineData: {
          mimeType,
          data,
        },
      };
    });

    const promptText = `
You are VERIFY, an advanced AI home safety and energy assistant.
The user has taken photos during an initial walkthrough scan of their home.
Analyze these images and identify physical items, fixtures, appliances, doors, windows, and potential safety/energy concerns that matter when someone leaves their home.

Examples of items to detect:
- Gas stove, gas cylinder / gas valve
- Air conditioner (AC), ceiling fan, standing fan
- Main lights, room lights, lamp
- Clothes iron, space heater, water geyser, kettle, toaster, coffee maker
- Windows, balcony doors, sliding glass doors
- Main entrance door, patio door, locks
- Water taps, kitchen faucet, bathroom sink
- Television, entertainment console, power strip

For each detected object, output:
- object: A clear, specific name (e.g., "Gas Stove", "Bedroom AC", "Living Room Fan", "Main Entrance Door", "Hallway Lights", "Balcony Window")
- category: One of "SAFETY", "ENERGY", "SECURITY", "OTHER"
- room: Inferred location or room (e.g. "Kitchen", "Bedroom", "Living Room", "Bathroom", "Entrance", "Balcony")
- recommended_state: Recommended state when leaving home (e.g. "OFF", "CLOSED", "LOCKED", "UNPLUGGED")
- importance: Priority level - "CRITICAL" (for fire/gas hazards like stove, heater, iron), "HIGH" (for primary entry doors, windows, security locks), "MEDIUM" (for major appliances like AC, water geyser), "LOW" (for ambient lights, fans, entertainment units)
- reason: Clear contextual reason explaining WHY this item matters when leaving home (e.g., "Prevent accidental fire or gas-related hazards", "Secure home entry points after departure", "Avoid continuous electrical draw")
- verification_method: Recommended method - "CAMERA_AI", "SENSOR", "OFFICE_KIT", or "MANUAL"
- confidence: Float value between 0.75 and 0.99 indicating detection certainty

Do not duplicate identical items in the same room. Return a comprehensive list of all relevant objects identified in the walkthrough photos.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: {
        parts: [...imageParts, { text: promptText }],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              object: {
                type: Type.STRING,
                description: "Name of the detected appliance or fixture.",
              },
              category: {
                type: Type.STRING,
                description: "Category: SAFETY, ENERGY, SECURITY, or OTHER",
              },
              room: {
                type: Type.STRING,
                description: "Inferred room name or location.",
              },
              recommended_state: {
                type: Type.STRING,
                description: "Recommended state when leaving (OFF, CLOSED, LOCKED, UNPLUGGED).",
              },
              importance: {
                type: Type.STRING,
                description: "Priority: CRITICAL, HIGH, MEDIUM, LOW",
              },
              reason: {
                type: Type.STRING,
                description: "Why this matters when leaving home.",
              },
              verification_method: {
                type: Type.STRING,
                description: "Method: CAMERA_AI, SENSOR, OFFICE_KIT, MANUAL",
              },
              confidence: {
                type: Type.NUMBER,
                description: "Confidence level between 0 and 1.",
              },
            },
            required: ["object", "category", "room", "recommended_state", "importance", "reason", "confidence"],
          },
        },
      },
    });

    const rawText = response.text || "[]";
    const detectedItems = JSON.parse(rawText);

    res.json({
      success: true,
      items: detectedItems,
      count: detectedItems.length,
    });
  } catch (error: any) {
    console.error("Error in /api/ai/analyze-home:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to analyze home images with AI.",
    });
  }
});

// Endpoint: AI Physical State Verification (SCREEN 5 CAMERA VERIFICATION)
app.post("/api/ai/verify-item", async (req, res) => {
  try {
    const { itemName, expectedState, image, room, previousState } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Image is required for verification." });
    }
    if (!itemName || !expectedState) {
      return res.status(400).json({ error: "Item name and expected state are required." });
    }

    const ai = getGeminiClient();
    const { mimeType, data } = cleanBase64(image);

    const promptText = `
You are VERIFY, an advanced physical-world AI verification assistant.
The user is inspecting a specific home appliance, door, window, or fixture before leaving home.

Target Item: "${itemName}"
Location/Room: "${room || "Unknown"}"
Expected Leaving-Home State: "${expectedState}" (e.g. OFF, CLOSED, LOCKED, UNPLUGGED)
${previousState ? `Previous Observed State: "${previousState}"` : ""}

CRITICAL SAFETY DIRECTIVE:
Prioritize safety over false confidence! Do NOT make dangerous guesses.
If the image is blurry, poorly lit, angled so the relevant controls/locks/flames cannot be clearly seen, or if you cannot confidently discern the physical state:
- Set confidence to a value below 0.70 (e.g. 0.40 - 0.65).
- Set is_low_confidence = true.
- Set verified = false.
- Explain clearly what is preventing a reliable reading (e.g., "Unable to verify reliably: Knobs/latches are obscured or glare prevents clear inspection. Please adjust camera angle.")

Otherwise, if you can clearly see the item:
1. Determine its current physical state (e.g., "OFF", "ON", "CLOSED", "OPEN", "LOCKED", "UNLOCKED", "UNPLUGGED", "RUNNING", "IDLE").
   - Gas Stove: check knobs/dials and burners. If dials are at OFF mark and no flame, state is "OFF". If turned or flame present, state is "ON".
   - Air Conditioner: check louvers and LED indicator. If louvers open or display shows temperature, state is "ON". If louvers flush shut and display dark, state is "OFF".
   - Window: check latch engagement and sash position ("CLOSED" vs "OPEN").
   - Door: check deadbolt, latch, or lock lever ("LOCKED" vs "UNLOCKED" / "OPEN").
   - Light/Fan: check illumination/rotation ("OFF" vs "ON").
   - Tap/Faucet: check water flow handle ("CLOSED" vs "OPEN").
2. Compare detected_state with expected_state ("${expectedState}").
   - verified = true ONLY if detected_state exactly satisfies the expected state and confidence >= 0.70.
   - If detected_state != expected_state, verified = false.
3. If previous state was "${previousState || ""}" and user just performed an action (e.g., turned it OFF or locked it), acknowledge the state transition (e.g., "AC TURNED OFF: Previously ON, now verified OFF with display dark and flaps closed.").

Return JSON with:
- object: string
- detected_state: string
- expected_state: string ("${expectedState}")
- verified: boolean
- confidence: number (0.0 to 1.0)
- is_low_confidence: boolean
- message: string
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            object: { type: Type.STRING },
            detected_state: { type: Type.STRING },
            expected_state: { type: Type.STRING },
            verified: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            is_low_confidence: { type: Type.BOOLEAN },
            message: { type: Type.STRING },
          },
          required: ["object", "detected_state", "expected_state", "verified", "confidence", "is_low_confidence", "message"],
        },
      },
    });

    const rawText = response.text || "{}";
    const result = JSON.parse(rawText);

    // If confidence is below 0.70, enforce low confidence safety rule
    if (result.confidence < 0.70) {
      result.is_low_confidence = true;
      result.verified = false;
      if (!result.message.toLowerCase().includes("unable to verify")) {
        result.message = `⚠️ Unable to verify reliably (${Math.round(result.confidence * 100)}% certainty). Please hold camera closer or adjust lighting.`;
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error in /api/ai/verify-item:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to verify item with AI.",
    });
  }
});

// Setup Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[VERIFY] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
