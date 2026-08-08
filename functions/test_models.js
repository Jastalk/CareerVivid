const { GoogleGenAI } = require("@google/genai");

process.env.GOOGLE_CLOUD_PROJECT = "jastalk-firebase";

async function testModels() {
  console.log("Initializing GoogleGenAI with Vertex AI...");

  const ai = new GoogleGenAI({
    vertexai: true,
    project: "jastalk-firebase",
    location: "us-central1"
  });

  console.log("Listing available models in us-central1...");
  try {
    const response = await ai.models.list();
    const models = response.pageInternal || [];
    console.log(`Found ${models.length} total models in response:`);
    for (const m of models) {
      const name = m.name || "";
      if (name.includes("gemini") || name.includes("flash") || name.includes("3.1") || name.includes("3.5")) {
        console.log(` - ${name}`);
      }
    }
  } catch (err) {
    console.error("Could not list models:", err);
  }
}

testModels();
