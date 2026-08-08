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
      contents: "Confirm."
    });
    console.log(`  SUCCESS: ${modelName} in ${location} -> "${response.text.trim()}"`);
    return true;
  } catch (err) {
    // If not found, log briefly
    if (err.message.includes("was not found")) {
      // do nothing
    } else {
      console.log(`  ERROR: ${modelName} in ${location} -> ${err.message}`);
    }
    return false;
  }
}

async function run() {
  const regions = ["us-central1", "us-east4", "us-west1", "europe-west1", "asia-northeast1"];
  const models = ["gemini-3.1-flash-lite", "gemini-3.5-flash"];

  console.log("Testing regions for 3.1 and 3.5 models...");
  for (const m of models) {
    for (const r of regions) {
      await testSingleModel(m, r);
    }
  }
  console.log("Done.");
}

run();
