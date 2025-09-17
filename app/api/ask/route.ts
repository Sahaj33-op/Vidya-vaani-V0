import { type NextRequest, NextResponse } from "next/server"
import { safeRedisGet, safeRedisSet, cacheKeyFor, redis } from "@/lib/redis-helpers"
import { rateLimitMiddleware } from "@/lib/rate-limiter"
import crypto from "crypto"
import { franc } from 'franc'
import { validateEnvironment } from "@/lib/env-validator"

// Validate environment variables on startup
validateEnvironment()

interface ChatRequest {
  user_id: string
  text: string
  lang?: string
}

interface ChatResponse {
  reply: string
  confidence: number
  source_ids?: string[]
  action: string
  translated?: boolean
  original_language?: string
}

const cacheIntent = async (text: string): Promise<string> => {
  const cacheKey = `intent:${crypto.createHash('md5').update(text).digest('hex')}`
  
  let intent = await safeRedisGet(cacheKey)
  if (intent) {
    return intent
  }
  
  intent = detectIntent(text)
  await safeRedisSet(cacheKey, intent, 3600) // Cache for 1 hour
  
  return intent
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimitMiddleware(10, 60000)(request) // 10 requests per minute
  if (rateLimitResult instanceof NextResponse) return rateLimitResult

  let user_id: string | undefined
  let text: string | undefined
  let lang: string | undefined

  try {
    const body: ChatRequest = await request.json()
    user_id = body.user_id
    text = body.text
    lang = body.lang || "en"

    if (!text?.trim()) {
      return NextResponse.json({ error: "Message text is required" }, { status: 400 })
    }

    console.log("[v0] Received chat request:", { user_id, text, lang })

    const cacheKey = cacheKeyFor(lang, text)
    const cachedResponse = await safeRedisGet(cacheKey)

    if (cachedResponse) {
      console.log("[v0] Returning cached response")
      return NextResponse.json(cachedResponse)
    }

    // Language detection and translation if needed
    let processedText = text
    let detectedLang = lang

    // If input language is not English, detect and potentially translate
    if (lang !== "en" || /[\u0900-\u097F]/.test(text)) {
      console.log("[v0] Non-English input detected, processing translation")

      // Simulate language detection
      detectedLang = detectLanguageFromText(text)

      // If Marwari or other non-English, translate to English for processing
      if (detectedLang !== "en") {
        try {
          const translationResponse = await fetch(`${request.nextUrl.origin}/api/translate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: text,
              source_lang: detectedLang,
              target_lang: "en",
              detect_language: true,
            }),
          })

          if (translationResponse.ok) {
            const translationResult = await translationResponse.json()
            processedText = translationResult.translated_text
            console.log("[v0] Translated input:", { original: text, translated: processedText })
          }
        } catch (error) {
          console.error("[v0] Translation failed:", error)
          // Continue with original text
        }
      }
    }

    // Simulate NLU intent detection on processed text
    const intent = await cacheIntent(processedText)
    console.log("[v0] Detected intent:", intent)

    // Generate response based on intent
    const response = await generateResponse(intent, processedText, detectedLang)

    // If user's language is not English, translate response back
    if (detectedLang !== "en" && detectedLang !== "unknown") {
      try {
        const responseTranslationResponse = await fetch(`${request.nextUrl.origin}/api/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: response.reply,
            source_lang: "en",
            target_lang: detectedLang,
          }),
        })

        if (responseTranslationResponse.ok) {
          const responseTranslationResult = await responseTranslationResponse.json()
          if (responseTranslationResult.confidence > 0.6) {
            response.reply = responseTranslationResult.translated_text
            response.translated = true
            response.original_language = detectedLang
            console.log("[v0] Translated response to:", detectedLang)
          }
        }
      } catch (error) {
        console.error("[v0] Response translation failed:", error)
        // Continue with English response
      }
    }

    await safeRedisSet(cacheKey, response, 900)

    console.log("[v0] Generated response:", response)
    return NextResponse.json(response)
  } catch (error: any) {
    // Log detailed error for debugging
    console.error("[v0] Chat API error:", {
      error: error.message,
      stack: error.stack,
      userId: user_id,
      timestamp: new Date().toISOString(),
    })

    // Return user-friendly error with error ID for tracking
    const errorId = crypto.randomUUID()
    return NextResponse.json(
      {
        reply: `I'm experiencing technical difficulties. Error ID: ${errorId}`,
        confidence: 0,
        action: "error",
        errorId,
      },
      { status: 500 },
    )
  }
}

function detectLanguageFromText(text: string): string {
  try {
    // Use franc for better language detection
    const detected = franc(text, { minLength: 3 })
    
    // Map franc codes to our language codes
    const languageMap: Record<string, string> = {
      'hin': 'hi',  // Hindi
      'mar': 'mr',  // Marathi
      'eng': 'en',  // English
      'raj': 'mwr'  // Rajasthani (closest to Marwari)
    }
    
    return languageMap[detected] || 'en'
  } catch (error) {
    console.error('Language detection failed:', error)
    return 'en'
  }
}

function detectIntent(text: string): string {
  const lowerText = text.toLowerCase()

  if (lowerText.includes("fee") || lowerText.includes("cost") || lowerText.includes("फीस")) {
    return "ask_fees"
  }
  if (lowerText.includes("admission") || lowerText.includes("प्रवेश")) {
    return "ask_admission"
  }
  if (lowerText.includes("timetable") || lowerText.includes("schedule") || lowerText.includes("समय")) {
    return "ask_timetable"
  }
  if (lowerText.includes("contact") || lowerText.includes("phone") || lowerText.includes("संपर्क")) {
    return "ask_contact"
  }
  if (lowerText.includes("hello") || lowerText.includes("hi") || lowerText.includes("नमस्ते")) {
    return "greetings"
  }

  return "general_query"
}

async function generateResponse(intent: string, text: string, lang: string): Promise<ChatResponse> {
  // Simulate RAG retrieval and response generation
  const responses: Record<string, ChatResponse> = {
    ask_fees: {
      reply:
        "The fee structure varies by program:\n• Undergraduate: ₹50,000 per year\n• Postgraduate: ₹75,000 per year\n• Diploma courses: ₹30,000 per year\n\nAdditional fees may apply for hostel and other facilities.",
      confidence: 0.95,
      source_ids: ["doc:fee_structure:1", "doc:admission_guide:3"],
      action: "answer:faq",
    },
    ask_admission: {
      reply:
        "Admission process:\n1. Online application submission\n2. Entrance exam (if applicable)\n3. Document verification\n4. Merit list publication\n5. Fee payment and confirmation\n\nDeadlines: Applications close on July 31st. Contact admissions office for specific program requirements.",
      confidence: 0.92,
      source_ids: ["doc:admission_guide:1", "doc:admission_guide:2"],
      action: "answer:faq",
    },
    ask_timetable: {
      reply:
        "Class schedules are available on the student portal. General timings:\n• Morning batch: 8:00 AM - 1:00 PM\n• Afternoon batch: 2:00 PM - 7:00 PM\n\nFor specific timetables, please log into the student portal or contact your department.",
      confidence: 0.88,
      source_ids: ["doc:academic_calendar:2"],
      action: "answer:faq",
    },
    ask_contact: {
      reply:
        "Contact Information:\n📞 Phone: +91-XXX-XXX-XXXX\n📧 Email: info@college.edu\n🏢 Address: College Campus, City, State\n\nOffice Hours: Monday-Friday, 9:00 AM - 5:00 PM\nAdmissions Office: Extension 101\nAcademic Office: Extension 102",
      confidence: 0.98,
      source_ids: ["doc:contact_info:1"],
      action: "answer:faq",
    },
    greetings: {
      reply:
        "Hello! Welcome to our college assistant. I can help you with:\n• Admission information\n• Fee structure\n• Class timetables\n• Contact details\n• Course information\n\nWhat would you like to know?",
      confidence: 1.0,
      action: "greetings",
    },
    general_query: {
      reply:
        "I understand you have a question, but I need more specific information to help you better. Could you please ask about:\n• Admissions\n• Fees\n• Timetables\n• Contact information\n• Course details\n\nOr would you like me to connect you with a human assistant?",
      confidence: 0.6,
      action: "clarification_needed",
    },
  }

  // Add language-specific responses for Hindi
  if (lang === "hi") {
    if (intent === "greetings") {
      responses[intent].reply =
        "नमस्ते! हमारे कॉलेज सहायक में आपका स्वागत है। मैं आपकी मदद कर सकता हूं:\n• प्रवेश की जानकारी\n• फीस संरचना\n• कक्षा समय सारणी\n• संपर्क विवरण\n• कोर्स की जानकारी\n\nआप क्या जानना चाहेंगे?"
    }
  }

  return responses[intent] || responses.general_query
}
