const { GoogleGenAI } = require("@google/genai");

const apiKey = "AIzaSyB2Ti_bKb11Tqu0VXTCzToNUTG-ML8S6Gg";

async function testSingleModel(modelName) {
  console.log(`\nTesting ${modelName} via AI Studio API...`);
  try {
    const ai = new GoogleGenAI({ apiKey });
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
  const models = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-2.5-flash"
  ];

  for (const m of models) {
    await testSingleModel(m);
  }
}

run();
