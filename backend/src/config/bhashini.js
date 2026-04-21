/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — Bhashini Translation Client                   ║
 * ║  Gov-backed STT/TTS API for 22 Indian languages                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Required .env variables:
 *   BHASHINI_USER_ID       From bhashini.gov.in developer dashboard
 *   BHASHINI_API_KEY       ULCA API key
 *   BHASHINI_PIPELINE_ID   Translation pipeline ID
 *
 * Docs: https://bhashini.gitbook.io/bhashini-apis/
 *
 * Language code map (Bhashini uses ISO 639 codes):
 *   en → English  |  hi → Hindi  |  te → Telugu  |  ta → Tamil
 *   kn → Kannada  |  ml → Malayalam  |  bn → Bengali  |  mr → Marathi
 */

"use strict";

const axios = require("axios");

const BHASHINI_BASE    = "https://dhruva-api.bhashini.gov.in";
const PIPELINE_ID      = process.env.BHASHINI_PIPELINE_ID || "";
const BHASHINI_USER_ID = process.env.BHASHINI_USER_ID    || "";
const BHASHINI_API_KEY = process.env.BHASHINI_API_KEY    || "";

// Mapping from our Language enum to Bhashini sourceLanguage codes
const LANG_MAP = {
  en: "en",
  hi: "hi",
  te: "te",
  ta: "ta",
  kn: "kn",
  ml: "ml",
  bn: "bn",
  mr: "mr",
};

/**
 * Translate text from English into the target language using Bhashini ULCA.
 *
 * @param {string} text           - Source text in English
 * @param {string} targetLangCode - Our Language enum: "hi" | "te" | "ta" etc.
 * @returns {Promise<string>}     - Translated text (falls back to original on error)
 */
async function translateWithBhashini(text, targetLangCode) {
  // Skip API call if target is already English or credentials are absent
  if (
    targetLangCode === "en" ||
    !BHASHINI_USER_ID ||
    !BHASHINI_API_KEY ||
    !PIPELINE_ID
  ) {
    return text;
  }

  const targetCode = LANG_MAP[targetLangCode] ?? targetLangCode;

  try {
    const payload = {
      pipelineTasks: [
        {
          taskType: "translation",
          config: {
            modelId:        PIPELINE_ID,
            language:       { sourceLanguage: "en", targetLanguage: targetCode },
          },
        },
      ],
      inputData: {
        input: [{ source: text }],
      },
    };

    const response = await axios.post(
      `${BHASHINI_BASE}/services/inference/pipeline`,
      payload,
      {
        headers: {
          "userID":       BHASHINI_USER_ID,
          "ulcaApiKey":   BHASHINI_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 15_000, // 15-second timeout
      }
    );

    // Extract translated text from response
    const translated =
      response.data?.pipelineResponse?.[0]?.output?.[0]?.target;

    return translated ?? text; // graceful fallback
  } catch (err) {
    console.error(
      "[bhashini] Translation failed for lang=%s: %s",
      targetLangCode,
      err.message
    );
    return text; // always fall back — never crash the pipeline
  }
}

module.exports = { translateWithBhashini, LANG_MAP };
