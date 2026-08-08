const { GoogleGenAI } = require("@google/genai");

process.env.GOOGLE_CLOUD_PROJECT = "jastalk-firebase";

async function testSingleModel(modelName, location) {
  console.log(`\nTesting ${modelName} in location: ${location}...`);
  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: "jastalk-firebase",
      location: location
    });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: "Confirm model connection with a single word: OK."
    });
    console.log(`  SUCCESS: Response: "${response.text.trim()}"`);
    return true;
  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
    return false;
  }
}

async function run() {
  const configs = [
    { model: "gemini-3.1-flash-lite", loc: "us-central1" },
    { model: "gemini-3.1-flash-lite", loc: "us-west1" },
    { model: "gemini-3.5-flash", loc: "us-central1" },
    { model: "gemini-3.5-flash", loc: "us-west1" },
    { model: "gemini-2.5-flash", loc: "us-central1" },
    { model: "gemini-2.5-flash", loc: "us-west1" },
    { model: "gemini-2.5-flash-lite", loc: "us-west1" },
  ];

  for (const config of configs) {
    await testSingleModel(config.model, config.loc);
  }
}

run();
