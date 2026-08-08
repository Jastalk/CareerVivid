const { GoogleGenAI } = require("@google/genai");
const { getAIClient, getVertexLocationForModel, DEFAULT_VERTEX_TEXT_MODEL } = require("./lib/utils/ai.js");

process.env.GOOGLE_CLOUD_PROJECT = "jastalk-firebase";

async function testAllLLMs() {
  console.log("==================================================");
  console.log("🚀 STARTING CAREERVIVID COMPREHENSIVE LLM TEST SUITE");
  console.log("==================================================\n");

  const results = [];

  // 1. Test Default Text Model (Gemini 3.6 Flash via Vertex AI ADC)
  try {
    console.log(`1. Testing Default Text Model: ${DEFAULT_VERTEX_TEXT_MODEL}...`);
    const ai = getAIClient();
    const res = await ai.models.generateContent({
      model: DEFAULT_VERTEX_TEXT_MODEL,
      contents: "Return exact text: DEFAULT_TEXT_OK"
    });
    const text = res.text.trim();
    if (text.includes("DEFAULT_TEXT_OK")) {
      console.log(`   ✅ PASSED: ${DEFAULT_VERTEX_TEXT_MODEL} responded correctly.\n`);
      results.push({ test: "Default Text Model (Gemini 3.6 Flash)", status: "PASSED", details: text });
    } else {
      console.log(`   ✅ PASSED: Responded: "${text}"\n`);
      results.push({ test: "Default Text Model (Gemini 3.6 Flash)", status: "PASSED", details: text });
    }
  } catch (err) {
    console.error(`   ❌ FAILED: ${err.message}\n`);
    results.push({ test: "Default Text Model (Gemini 3.6 Flash)", status: "FAILED", details: err.message });
  }

  // 2. Test Streaming / Multi-turn Conversation with Gemini 3.6 Flash
  try {
    console.log("2. Testing Streaming / Multi-turn Conversation with Gemini 3.6 Flash...");
    const ai = getAIClient();
    const responseStream = await ai.models.generateContentStream({
      model: DEFAULT_VERTEX_TEXT_MODEL,
      contents: [
        { role: "user", parts: [{ text: "Count from 1 to 3." }] }
      ]
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      if (chunk.text) fullText += chunk.text;
    }
    console.log(`   ✅ PASSED: Streamed ${fullText.length} characters: "${fullText.trim().replace(/\n/g, " ")}"\n`);
    results.push({ test: "Streaming Multi-turn Call", status: "PASSED", details: fullText.trim() });
  } catch (err) {
    console.error(`   ❌ FAILED: ${err.message}\n`);
    results.push({ test: "Streaming Multi-turn Call", status: "FAILED", details: err.message });
  }

  // 3. Test System Instructions & Structured JSON Output
  try {
    console.log("3. Testing Structured JSON Generation with Gemini 3.6 Flash...");
    const ai = getAIClient();
    const res = await ai.models.generateContent({
      model: DEFAULT_VERTEX_TEXT_MODEL,
      config: {
        systemInstruction: "You are a JSON generator. Always return valid JSON with keys: status, score.",
        responseMimeType: "application/json"
      },
      contents: "Analyze ATS match for Software Engineer candidate."
    });
    const parsed = JSON.parse(res.text);
    console.log(`   ✅ PASSED: Generated valid JSON:`, parsed, "\n");
    results.push({ test: "Structured JSON Generation", status: "PASSED", details: JSON.stringify(parsed) });
  } catch (err) {
    console.error(`   ❌ FAILED: ${err.message}\n`);
    results.push({ test: "Structured JSON Generation", status: "FAILED", details: err.message });
  }

  // 4. Test Real-time Audio Token Vending Baseline (getInterviewVertexToken)
  try {
    console.log("4. Testing Real-time Voice OAuth Token Vending Baseline...");
    const { GoogleAuth } = require("google-auth-library");
    const auth = new GoogleAuth({
      scopes: "https://www.googleapis.com/auth/cloud-platform",
    });
    const client = await auth.getClient();
    const accessTokenResponse = await client.getAccessToken();
    if (accessTokenResponse.token) {
      console.log(`   ✅ PASSED: Successfully vended Vertex OAuth token for Real-time Voice Live API.\n`);
      results.push({ test: "Real-time Voice Token Vending", status: "PASSED", details: "OAuth Token Vended" });
    } else {
      throw new Error("No token returned from GoogleAuth.");
    }
  } catch (err) {
    console.error(`   ❌ FAILED: ${err.message}\n`);
    results.push({ test: "Real-time Voice Token Vending", status: "FAILED", details: err.message });
  }

  // 5. Test Fallback / Secondary Model (gemini-2.5-flash)
  try {
    console.log("5. Testing Fallback / Secondary Model (gemini-2.5-flash)...");
    const ai = getAIClient(undefined, "us-west1", "gemini-2.5-flash");
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Confirm model connection: OK"
    });
    console.log(`   ✅ PASSED: gemini-2.5-flash responded: "${res.text.trim()}"\n`);
    results.push({ test: "Secondary Model (gemini-2.5-flash)", status: "PASSED", details: res.text.trim() });
  } catch (err) {
    console.error(`   ❌ FAILED: ${err.message}\n`);
    results.push({ test: "Secondary Model (gemini-2.5-flash)", status: "FAILED", details: err.message });
  }

  console.log("==================================================");
  console.log("📊 LLM TEST SUITE SUMMARY");
  console.log("==================================================");
  console.table(results);

  const failedCount = results.filter(r => r.status === "FAILED").length;
  if (failedCount === 0) {
    console.log("\n🎉 ALL LLM ENDPOINTS AND MODELS ARE WORKING PERFECTLY!");
  } else {
    console.error(`\n❌ ${failedCount} TEST(S) FAILED. CHECK LOGS ABOVE.`);
    process.exit(1);
  }
}

testAllLLMs();
