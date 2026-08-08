const { GoogleGenAI } = require("@google/genai");

process.env.GOOGLE_CLOUD_PROJECT = "jastalk-firebase";

async function testSingleModel(modelName, location) {
  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: "jastalk-firebase",
      location: location
    });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: "Confirm connection with a single word: OK."
    });
    console.log(`  SUCCESS: ${modelName} in ${location} -> "${response.text.trim()}"`);
    return true;
  } catch (err) {
    console.log(`  FAILED: ${modelName} in ${location} -> ${err.message}`);
    return false;
  }
}

async function run() {
  const models = [
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.1-pro-preview",
    "gemini-3.5-flash"
  ];

  console.log("Testing models in asia-northeast1...");
  for (const m of models) {
    await testSingleModel(m, "asia-northeast1");
  }
}

run();
