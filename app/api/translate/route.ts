import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

// Initialize Redis client for caching
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

interface TranslationRequest {
  text: string
  source_lang?: string
  target_lang: string
  detect_language?: boolean
}

interface TranslationResponse {
  translated_text: string
  detected_language?: string
  source_lang: string
  target_lang: string
  confidence: number
  method: string
}

export async function POST(request: NextRequest) {
  try {
    const body: TranslationRequest = await request.json()
    const { text, source_lang, target_lang, detect_language = false } = body

    if (!text?.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    if (!target_lang) {
      return NextResponse.json({ error: "Target language is required" }, { status: 400 })
    }

    console.log("[v0] Translation request:", { text: text.substring(0, 50), source_lang, target_lang })

    // Check cache first
    const cacheKey = `translate:${source_lang || "auto"}:${target_lang}:${text.toLowerCase().trim()}`
    const cachedResponse = await redis.get(cacheKey)

    if (cachedResponse) {
      console.log("[v0] Returning cached translation")
      return NextResponse.json(cachedResponse)
    }

    // Simulate translation service
    const translationResult = await simulateTranslation(text, source_lang, target_lang, detect_language)

    // Cache the result for 1 hour
    await redis.setex(cacheKey, 3600, translationResult)

    console.log("[v0] Translation completed:", translationResult)
    return NextResponse.json(translationResult)
  } catch (error) {
    console.error("[v0] Translation API error:", error)
    return NextResponse.json(
      {
        translated_text: "",
        source_lang: "",
        target_lang: "",
        confidence: 0,
        method: "error_fallback",
        error: "Translation service unavailable",
      },
      { status: 500 },
    )
  }
}

async function simulateTranslation(
  text: string,
  sourceLang: string | undefined,
  targetLang: string,
  detectLanguage: boolean,
): Promise<TranslationResponse> {
  // Simulate language detection if needed
  let detectedLang = sourceLang
  if (!sourceLang || detectLanguage) {
    detectedLang = detectLanguageSimulation(text)
  }

  // If source and target are the same, no translation needed
  if (detectedLang === targetLang) {
    return {
      translated_text: text,
      detected_language: detectedLang,
      source_lang: detectedLang,
      target_lang: targetLang,
      confidence: 1.0,
      method: "no_translation_needed",
    }
  }

  // Simulate translation based on language pairs
  const translatedText = await performSimulatedTranslation(text, detectedLang!, targetLang)

  return {
    translated_text: translatedText.text,
    detected_language: detectLanguage ? detectedLang : undefined,
    source_lang: detectedLang!,
    target_lang: targetLang,
    confidence: translatedText.confidence,
    method: translatedText.method,
  }
}

function detectLanguageSimulation(text: string): string {
  // Simple language detection simulation
  const lowerText = text.toLowerCase()

  // Check for Devanagari script
  if (/[\u0900-\u097F]/.test(text)) {
    // Check for Marwari-specific words
    const marwariWords = ["थारो", "थारी", "म्हारो", "म्हारी", "करूं", "आवो", "जावो"]
    if (marwariWords.some((word) => text.includes(word))) {
      return "mwr"
    }

    // Check for Marathi-specific words
    const marathiWords = ["आहे", "आहेत", "करतो", "करते", "तुम्ही", "माझा"]
    if (marathiWords.some((word) => text.includes(word))) {
      return "mr"
    }

    // Default to Hindi for Devanagari
    return "hi"
  }

  // Default to English for Latin script
  return "en"
}

async function performSimulatedTranslation(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<{ text: string; confidence: number; method: string }> {
  // Simulate different translation scenarios

  // Marwari to Hindi/English
  if (sourceLang === "mwr") {
    const marwariPhrases: Record<string, string> = {
      थारो: "तुम्हारा",
      थारी: "तुम्हारी",
      म्हारो: "मेरा",
      म्हारी: "मेरी",
      करूं: "करूंगा",
      आवो: "आओ",
      जावो: "जाओ",
      फीस: "फीस",
      प्रवेश: "प्रवेश",
      कॉलेज: "कॉलेज",
    }

    let translatedText = text
    for (const [marwari, hindi] of Object.entries(marwariPhrases)) {
      translatedText = translatedText.replace(new RegExp(marwari, "g"), hindi)
    }

    if (targetLang === "hi") {
      return {
        text: translatedText,
        confidence: 0.8,
        method: "marwari_phrase_mapping",
      }
    } else if (targetLang === "en") {
      // Further translate Hindi to English
      const hindiToEnglish = await simulateHindiToEnglish(translatedText)
      return {
        text: hindiToEnglish,
        confidence: 0.7,
        method: "marwari_via_hindi",
      }
    }
  }

  // Hindi to English
  if (sourceLang === "hi" && targetLang === "en") {
    const hindiToEnglish = await simulateHindiToEnglish(text)
    return {
      text: hindiToEnglish,
      confidence: 0.85,
      method: "hindi_to_english",
    }
  }

  // English to Hindi
  if (sourceLang === "en" && targetLang === "hi") {
    const englishToHindi = await simulateEnglishToHindi(text)
    return {
      text: englishToHindi,
      confidence: 0.85,
      method: "english_to_hindi",
    }
  }

  // Marathi translations
  if (sourceLang === "mr") {
    if (targetLang === "en") {
      return {
        text: `[English translation of Marathi text: ${text.substring(0, 30)}...]`,
        confidence: 0.75,
        method: "marathi_to_english",
      }
    } else if (targetLang === "hi") {
      return {
        text: `[Hindi translation of Marathi text: ${text.substring(0, 30)}...]`,
        confidence: 0.8,
        method: "marathi_to_hindi",
      }
    }
  }

  // Fallback - return original with low confidence
  return {
    text: text,
    confidence: 0.3,
    method: "fallback_original",
  }
}

async function simulateHindiToEnglish(hindiText: string): Promise<string> {
  // Simple Hindi to English translation simulation
  const commonTranslations: Record<string, string> = {
    फीस: "fees",
    "कितनी है": "how much is",
    प्रवेश: "admission",
    "कैसे करें": "how to do",
    समय: "time",
    सारणी: "schedule",
    संपर्क: "contact",
    जानकारी: "information",
    कॉलेज: "college",
    आवेदन: "application",
    दस्तावेज़: "documents",
    आवश्यक: "required",
  }

  let translatedText = hindiText
  for (const [hindi, english] of Object.entries(commonTranslations)) {
    translatedText = translatedText.replace(new RegExp(hindi, "g"), english)
  }

  return translatedText
}

async function simulateEnglishToHindi(englishText: string): Promise<string> {
  // Simple English to Hindi translation simulation
  const commonTranslations: Record<string, string> = {
    fees: "फीस",
    "how much": "कितना",
    admission: "प्रवेश",
    "how to": "कैसे",
    time: "समय",
    schedule: "सारणी",
    contact: "संपर्क",
    information: "जानकारी",
    college: "कॉलेज",
    application: "आवेदन",
    documents: "दस्तावेज़",
    required: "आवश्यक",
  }

  let translatedText = englishText.toLowerCase()
  for (const [english, hindi] of Object.entries(commonTranslations)) {
    translatedText = translatedText.replace(new RegExp(english, "g"), hindi)
  }

  return translatedText
}
