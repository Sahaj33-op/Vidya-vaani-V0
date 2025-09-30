// app/api/ask/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { safeRedisGet, safeRedisSet, cacheKeyFor } from "@/lib/redis-helpers"
import { rateLimitMiddleware } from "@/lib/rate-limiter"
import crypto from "crypto"
// import { franc } from 'franc' // Not used in the new implementation
import { getLLMAdapter, LLMAdapter } from '@/lib/llm-adapter' // <-- New Import

// Define ChatRequest interface if not already defined elsewhere and imported
interface ChatRequest {
  text: string;
  language?: string;
  // Add other properties if they exist in the actual request
}

// Define detectLanguageFromText function if not already defined elsewhere and imported
async function detectLanguageFromText(text: string): Promise<{ detected_language: string; processed_text: string; confidence: number; translation_needed: boolean; }> {
  // This is a placeholder. In a real application, this would call a language detection service.
  // For now, we'll assume English if no specific language is detected or provided.
  // A more robust implementation would use a library like 'franc' or an external API.

  // Simple check for Hindi/Marathi keywords to simulate detection
  const hindiKeywords = ['नमस्ते', 'फीस', 'प्रवेश', 'समय'];
  const marathiKeywords = ['नमस्कार', 'फी', 'प्रवेश', 'वेळ'];

  const lowerText = text.toLowerCase();

  if (hindiKeywords.some(keyword => lowerText.includes(keyword))) {
    return { detected_language: 'hi', processed_text: text, confidence: 0.8, translation_needed: true };
  }
  if (marathiKeywords.some(keyword => lowerText.includes(keyword))) {
    return { detected_language: 'mr', processed_text: text, translation_needed: true, confidence: 0.8 };
  }

  // Default to English
  return { detected_language: 'en', processed_text: text, confidence: 1.0, translation_needed: false };
}

// Define translateText function if not already defined elsewhere and imported
async function translateText(text: string, sourceLang: string, targetLang: string): Promise<{ translated_text: string; confidence: number; }> {
  // This is a placeholder. In a real application, this would call a translation service.
  // For now, we'll return the original text and a high confidence if no translation is needed.
  if (sourceLang === targetLang) {
    return { translated_text: text, confidence: 1.0 };
  }
  // Simulate translation
  return { translated_text: `Translated to ${targetLang}: ${text}`, confidence: 0.9 };
}


export interface ChatResponse {
  reply: string
  confidence: number
  source_ids?: string[]
  action: string
  translated?: boolean
  original_language?: string
}

// Function to call Rasa NLU for intent and entity extraction
async function getNluIntentAndEntities(text: string, language: string): Promise<{ intent: string; entities: any[]; }> {
  const RASA_API_URL = process.env.NEXT_PUBLIC_RASA_API_URL || "http://localhost:5005"; // Default to localhost:5005

  try {
    const response = await fetch(`${RASA_API_URL}/model/parse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        language: language, // Pass detected language to Rasa if supported
      }),
    });

    if (!response.ok) {
      console.error(`Rasa NLU request failed with status ${response.status}`);
      // Fallback to a general query intent if Rasa fails
      return { intent: "general_query", entities: [] };
    }

    const data = await response.json();
    console.log("[v0] Rasa NLU response:", data);

    // Extract the most confident intent
    let bestIntent = "general_query";
    let maxConfidence = 0;

    if (data.intent && data.intent.name) {
      bestIntent = data.intent.name;
      maxConfidence = data.intent.confidence;
    }

    // If confidence is too low, fallback to general query
    if (maxConfidence < 0.5) {
        bestIntent = "general_query";
    }

    return {
      intent: bestIntent,
      entities: data.entities || [],
    };

  } catch (error) {
    console.error("Error calling Rasa NLU:", error);
    // Fallback to a general query intent if Rasa is unreachable
    return { intent: "general_query", entities: [] };
  }
}


export async function POST(request: NextRequest) {
  // Rate limiting and input parsing remain the same
  // ... (Rate limiting and input parsing remain the same) ...

  // New: Use LLM Adapter for logic
  const llmAdapter: LLMAdapter = getLLMAdapter()

  try {
    const body: ChatRequest = await request.json()
    // ... (Existing input validation) ...

    // ... (Existing cache check) ...

    // Language detection and translation to English
    const { detected_language, processed_text, confidence: detection_confidence, translation_needed } = await detectLanguageFromText(body.text);
    let english_text = processed_text;
    let original_language = detected_language;
    let translated_to_english = false;

    if (translation_needed && detected_language !== 'en') {
      const translation_result = await translateText(processed_text, detected_language, 'en');
      if (translation_result.confidence > 0.5) {
        english_text = translation_result.translated_text;
        translated_to_english = true;
      } else {
        console.warn(`Low confidence translation from ${detected_language} to en: ${translation_result.confidence}`);
        // Proceed with original text if translation confidence is low
      }
    }

    // Get intent and entities from Rasa NLU
    const { intent, entities } = await getNluIntentAndEntities(english_text, 'en'); // Assuming Rasa model is trained for 'en'
    console.log("[v0] Detected intent:", intent);
    console.log("[v0] Detected entities:", entities);

    let response: ChatResponse;

    // Handle specific intents that don't require LLM/RAG
    if (intent === 'out_of_scope' || intent === 'request_human_handoff') {
      response = await generateStaticResponse(intent, detected_language);
      response.translated = translated_to_english; // Reflect if original was translated
      response.original_language = original_language;
    } else {
      // Step 1: RAG Retrieval (This part might need to be adjusted based on how Rasa intents map to backend actions)
      // For now, we'll still use the processed text for RAG, but ideally, entities from Rasa would be used.
      const mockRAGResponse = await fetch(`${request.nextUrl.origin}/api/rag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: english_text, // Use English text for RAG
          language: 'en',
          top_k: 5,
          // Potentially pass entities here if RAG supports it
        }),
      });

      const ragResult = await mockRAGResponse.json();
      const context = ragResult.retrieved_chunks || [];
      const source_ids = ragResult.sources || [];

      // Step 2: Generate final response using LLM Adapter with RAG context
      // Pass detected language to LLM adapter if it supports multilingual generation directly
      response = await llmAdapter.generateResponse(english_text, context, 'en'); // Assuming LLM generates in English

      // Merge source IDs from RAG step
      response.source_ids = [...new Set([...(response.source_ids || []), ...source_ids])];
      response.action = ragResult.action || 'answer:llm'; // Default action
    }

    // Translate response back to original language if needed
    if (translated_to_english && response.reply) {
      const translation_result = await translateText(response.reply, 'en', detected_language);
      if (translation_result.confidence > 0.5) {
        response.reply = translation_result.translated_text;
        response.translated = true;
      } else {
        console.warn(`Low confidence translation from en to ${detected_language}: ${translation_result.confidence}`);
        // Keep the English reply if translation fails
      }
    }

    // Set original language and confidence
    response.original_language = original_language;
    // Confidence here could be a combination of detection, NLU, RAG, LLM, and translation confidence.
    // For simplicity, we'll use a placeholder or combine them.
    response.confidence = 0.8; // Placeholder confidence

    // Define cacheKey based on processed text
    const cacheKey = `chat:${crypto.createHash('sha256').update(english_text).digest('hex')}`;
    await safeRedisSet(cacheKey, response, 900)

    console.log("[v0] Generated response:", response)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Error in POST /api/ask:", error);
    // Provide a more informative error response
    return NextResponse.json({ error: "An internal error occurred while processing your request." }, { status: 500 });
  }
}

// New helper for static responses (handoff, out_of_scope)
async function generateStaticResponse(intent: string, lang: string): Promise<ChatResponse> {
  // These responses should ideally be translatable or fetched from a multilingual source
  let reply = "";
  let action = intent;

  if (intent === 'request_human_handoff') {
    reply = "I've escalated your query to a human assistant. Your request ID is: REQ-1234. A staff member will join this chat shortly.";
    action = "handoff";
  } else if (intent === 'out_of_scope') {
    reply = "I can only help with college-related topics like admissions, fees, and timetables. Please ask something within my scope.";
    action = "out_of_scope";
  } else {
    // Default fallback for unhandled intents
    reply = "I'm sorry, I didn't understand that. Could you please rephrase?";
    action = "general_fallback";
  }

  // Basic translation simulation for static responses if not English
  if (lang !== 'en') {
    const translatedReply = await translateText(reply, 'en', lang);
    if (translatedReply.confidence > 0.5) {
      reply = translatedReply.translated_text;
    }
  }

  return {
    reply: reply,
    confidence: 1.0, // High confidence for static, predefined responses
    source_ids: [],
    action: action,
    translated: lang !== 'en',
    original_language: lang,
  };
}
