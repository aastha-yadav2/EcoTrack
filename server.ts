import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini SDK with User-Agent for build telemetry
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// API endpoint for insights
app.post("/api/insights", async (req, res) => {
  try {
    const { activityStats, currentScore, carbonSaved, carbonTotal } = req.body;
    
    if (!ai) {
      // Fallback response with beautiful, smart dynamic insights if Gemini is not configured yet
      const predictions = Math.max(10, Math.round(carbonTotal * 0.88));
      return res.json({
        insights: [
          {
            id: "ins-1",
            type: "warning",
            title: "Heavy Automobile Footprint Detected",
            content: `Your transit stats account for ${activityStats?.transport || 140} kg of carbon. Shifting just three short solo drives to cycling or transit this week will boost your score to ${Math.min(100, currentScore + 6)}!`,
            impact: "-18 kg CO2e"
          },
          {
            id: "ins-2",
            type: "success",
            title: "Superb Electrical Efficiency",
            content: `Your energy consumption score is incredibly efficient, staying below average at ${activityStats?.electricity || 90} kg CO2e. Keep maintaining active sleep-mode devices.`,
            impact: "-24 kg CO2e"
          },
          {
            id: "ins-3",
            type: "info",
            title: "Incorporate Plant-Based Dinners",
            content: `Food intake stats show ${activityStats?.food || 80} kg emissions. Replacing red meat options twice a week with local produce reduces shipping carbon and gains the 'Botanical Taste' badge.`,
            impact: "-12 kg CO2e"
          }
        ],
        tipOfDay: "Reduce phantom loads: major devices in standby mode consume up to 10% of home electricity. Smart plugs are a great way to fully disconnect items.",
        predictedEmissions: predictions
      });
    }

    const prompt = `You are EcoTrack's Chief Sustainability AI Co-pilot. Analyze this user's current carbon footprint profile:
- Monthly Carbon Footprint: ${carbonTotal} kg CO2e
- Carbon Saved This Month: ${carbonSaved} kg CO2e
- Sustainability Score: ${currentScore}/100
- Category Stats breakdown: ${JSON.stringify(activityStats)}

Generate:
1. Three (3) highly personalized, actionable sustainability insights. Each must have:
   - "type" (one of "warning", "success", "info")
   - "title" (short, engaging action header)
   - "content" (concrete, high-impact reasoning specifying some of their category breakdown values)
   - "impact" (estimated monthly reduction like "-12 kg CO2e" or similar)
2. One (1) inspiring "eco tip of today" relating to general urban carbon footprint management.
3. A predicted carbon emission value for next month based on their stats (return a realistic integer).

Respond strictly in JSON matching the following structure:
{
  "insights": [
    { "id": "ins-1", "type": "warning" | "success" | "info", "title": "string", "content": "string", "impact": "string" },
    ...
  ],
  "tipOfDay": "string",
  "predictedEmissions": number
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, description: "warning, success, or info" },
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  impact: { type: Type.STRING }
                },
                required: ["id", "type", "title", "content", "impact"]
              }
            },
            tipOfDay: { type: Type.STRING },
            predictedEmissions: { type: Type.INTEGER }
          },
          required: ["insights", "tipOfDay", "predictedEmissions"]
        }
      }
    });

    const textOutput = response.text || "{}";
    const parsedData = JSON.parse(textOutput);
    res.json(parsedData);
  } catch (err: any) {
    console.error("AI Insights Error:", err);
    // Silent recovery with sensible defaults
    res.json({
      insights: [
        {
          id: "ins-err-1",
          type: "warning",
          title: "Verify Commute Modalities",
          content: "Vehicle trips remain a prime opportunity for reduction. Consolidate your car-rides or utilize bus/rail pathways.",
          impact: "-15 kg CO2e"
        },
        {
          id: "ins-err-2",
          type: "success",
          title: "Energy Efficiency",
          content: "Keep utilities regulated and use smart thermostat features to slash standby costs.",
          impact: "-10 kg CO2e"
        },
        {
          id: "ins-err-3",
          type: "info",
          title: "Actionable Goal Setting",
          content: "Achieve next sustainability tiers by logging lower food and electrical waste indexes today.",
          impact: "-8 kg CO2e"
        }
      ],
      tipOfDay: "Clean your refrigerator condenser coils annually. Dusty coils force the motor to work harder, surging electricity use by 20%.",
      predictedEmissions: Math.round(req.body.carbonTotal * 0.9)
    });
  }
});

// API endpoint for chat assistant
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!ai) {
      // Fallback automated assistant response
      const lowMsg = message.toLowerCase();
      let reply = "Hello! I am your EcoTrack helper. To activate live Gemini intelligence, please configure your GEMINI_API_KEY in the secrets menu. Meanwhile, what can I help you calculate or optimize today?";
      
      if (lowMsg.includes("score") || lowMsg.includes("sustainability")) {
        reply = "Your Sustainability Score is currently managed on the dashboard scale of 0 to 100. It updates as you log activities: eco-friendly transport, vegetarian meals, and zero-waste shopping improve your rating!";
      } else if (lowMsg.includes("emissions") || lowMsg.includes("carbon") || lowMsg.includes("co2")) {
        reply = "The typical personal target is under 300kg CO2e monthly. Log activities in transport, energy, meals, and shopping to balance your footprint and see your trend graphs dip!";
      } else if (lowMsg.includes("transport") || lowMsg.includes("commute") || lowMsg.includes("car")) {
        reply = "Automobile emissions represent roughly 40% of standard household carbon. Opting for EV, public transit, walking, or shared rides decreases your transport kg index instantly.";
      } else if (lowMsg.includes("energy") || lowMsg.includes("electricity") || lowMsg.includes("solar")) {
        reply = "A great way to curb electricity footprint is turning off heavy standby items, drying clothes on the line, and maintaining room heating/cooling within 19-22°C (66-72°F).";
      } else if (lowMsg.includes("food") || lowMsg.includes("meat") || lowMsg.includes("diet")) {
        reply = "A single beef-based meal generates about 7kg CO2e, while a plant-based alternative averages less than 1kg. Adding green diets makes a HUGE impact!";
      }
      return res.json({ reply });
    }

    // Format chat history context for simple message query
    let historyPrompt = "";
    if (history && history.length > 0) {
      historyPrompt = "This is our prior conversation context:\n" + history.map((h: any) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join("\n") + "\n\n";
    }
    const finalPrompt = `${historyPrompt}User Question: ${message}\n\nAnswer cleanly, with short actionable formatting. Introduce yourself briefly as the EcoTrack Sustainability Co-pilot if there's no previous history. Keep the layout aesthetic and under 130 words.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: finalPrompt,
    });

    res.json({ reply: response.text || "I am processing your carbon metrics. Let me take another look." });
  } catch (err: any) {
    console.error("AI Chat Error:", err);
    res.status(200).json({ reply: "I'm having a momentary connectivity glitch with our eco-servers. Let me recommend composting and reducing heat consumption in the meantime!" });
  }
});

// Configure Vite integration or static file serving
const isProd = process.env.NODE_ENV === "production";

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EcoTrack secure full-stack server launched on http://0.0.0.0:${PORT}`);
  });
}

startServer();
