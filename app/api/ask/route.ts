// app/api/ask/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { safeRedisGet, safeRedisSet, cacheKeyFor } from "@/lib/redis-helpers"
import { rateLimitMiddleware } from "@/lib/rate-limiter"
import crypto from "crypto"
import { franc } from 'franc'
import { getLLMAdapter, LLMAdapter } from '@/lib/llm-adapter' // <-- New Import

// ... (Interface and detectLanguageFromText remain the same) ...

export interface ChatResponse {
  reply: string
  confidence: number
  source_ids?: string[]
  action: string
  translated?: boolean
  original_language?: string
}

const cacheIntent = async (text: string): Promise<string> => {
  // ... (Existing implementation to detect and cache intent) ...
  const lowerText = text.toLowerCase()

  if (lowerText.includes("fee") || lowerText.includes("cost") || lowerText.includes("फीस")) return "ask_fees"
  if (lowerText.includes("admission") || lowerText.includes("प्रवेश")) return "ask_admission"
  if (lowerText.includes("timetable") || lowerText.includes("schedule") || lowerText.includes("समय")) return "ask_timetable"
  if (lowerText.includes("contact") || lowerText.includes("phone") || lowerText.includes("संपर्क")) return "ask_contact"
  if (lowerText.includes("hello") || lowerText.includes("hi") || lowerText.includes("नमस्ते")) return "greetings"
  if (lowerText.includes("joke") || lowerText.includes("weather")) return "out_of_scope" // <- Added for better demo flow
  if (lowerText.includes("human") || lowerText.includes("staff")) return "request_human_handoff" // <- Added for clarity

  return "general_query"
}


export async function POST(request: NextRequest) {
  // ... (Rate limiting and input parsing remain the same) ...
  
  // New: Use LLM Adapter for logic
  const llmAdapter: LLMAdapter = getLLMAdapter()
  
  try {
    const body: ChatRequest = await request.json()
    // ... (Existing input validation) ...

    // ... (Existing cache check) ...

    // ... (Existing language detection and translation to English - detectedLang, processedText) ...
    
    // Simulate NLU intent detection on processed text
    const intent = await cacheIntent(processedText)
    console.log("[v0] Detected intent:", intent)

    let response: ChatResponse;
    
    if (intent === 'out_of_scope' || intent === 'request_human_handoff') {
      response = await generateStaticResponse(intent, detectedLang);
    } else {
      // Step 1: RAG Retrieval (always mock in this layer, actual RAG retrieval is simulated or handled in the Python layer for production)
      const mockRAGResponse = await fetch(`${request.nextUrl.origin}/api/rag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: processedText,
          language: 'en',
          top_k: 5,
        }),
      });

      const ragResult = await mockRAGResponse.json();
      const context = ragResult.retrieved_chunks || [];
      const source_ids = ragResult.sources || [];
      
      // Step 2: Generate final response using LLM Adapter with RAG context
      response = await llmAdapter.generateResponse(processedText, context, 'en');
      
      // Merge source IDs from RAG step
      response.source_ids = [...new Set([...(response.source_ids || []), ...source_ids])];
      response.action = ragResult.action || 'answer:llm';
    }

    // ... (Existing response translation back to detectedLang) ...
    
    await safeRedisSet(cacheKey, response, 900)

    console.log("[v0] Generated response:", response)
    return NextResponse.json(response)
  } catch (error: any) {
    // ... (Existing error handling) ...
  }
}

// New helper for static responses (handoff, out_of_scope)
async function generateStaticResponse(intent: string, lang: string): Promise<ChatResponse> {
  if (intent === 'request_human_handoff') {
    return {
      reply: "I've escalated your query to a human assistant. Your request ID is: REQ-1234. A staff member will join this chat shortly.",
      confidence: 1.0,
      source_ids: [],
      action: "handoff",
      translated: lang !== 'en',
    };
  }
  
  if (intent === 'out_of_scope') {
    return {
      reply: "I can only help with college-related topics like admissions, fees, and timetables. Please ask something within my scope.",
      confidence: 1.0,
      source_ids: [],
      action: "out_of_scope",
      translated: lang !== 'en',
    };
  }
  
  return { reply: "I'm sorry, I didn't understand that.", confidence: 0.0, action: "general_fallback" };
}