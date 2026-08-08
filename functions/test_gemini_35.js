const { GoogleGenAI } = require("@google/genai");

process.env.GOOGLE_CLOUD_PROJECT = "jastalk-firebase";

async function testGeneration() {
  console.log("Testing gemini-3.5-flash on Vertex AI in asia-northeast1...");
  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: "jastalk-firebase",
      location: "asia-northeast1"
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Answer this question in JSON format: {'success': true, 'message': 'Hello from Gemini 3.5'}",
      config: {
        responseMimeType: "application/json"
      }
    });

    console.log("SUCCESS: Content generated successfully!");
    console.log("Response text:", response.text);
  } catch (err) {
    console.error("FAILED to generate content:", err.message);
  }
}

testGeneration();
