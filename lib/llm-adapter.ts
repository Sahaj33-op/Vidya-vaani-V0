// lib/llm-adapter.ts
import { ChatResponse } from '@/app/api/ask/route'
import { v4 as uuidv4 } from 'uuid'

export interface LLMAdapter {
  generateResponse(prompt: string, context: string[], lang: string): Promise<ChatResponse>
}

// --- MOCK IMPLEMENTATION (for Demo/CI) ---
export class MockLLMAdapter implements LLMAdapter {
  constructor(private mockMode: boolean) {}

  async generateResponse(
    prompt: string,
    context: string[],
    lang: string,
  ): Promise<ChatResponse> {
    if (!this.mockMode) {
      throw new Error('MockLLMAdapter running outside mock mode.')
    }
    
    const lowerPrompt = prompt.toLowerCase()

    if (lowerPrompt.includes('fees') || lowerPrompt.includes('फीस')) {
      return {
        reply: `The current fee for undergraduate programs is $75,000 per year. Context used: ${context.slice(0, 1)}`,
        confidence: 0.95,
        source_ids: ['doc:fee_structure:1', 'doc:admission_guide:3'],
        action: 'answer:fees',
        translated: lang !== 'en',
      }
    }
    
    if (lowerPrompt.includes('joke')) {
      return {
        reply: 'I am a college assistant, not a comedian! Please ask about admissions or fees.',
        confidence: 1.0,
        source_ids: [],
        action: 'greetings',
        translated: lang !== 'en',
      }
    }

    return {
      reply:
        'I am running in **Mock Mode (MOCK_LLM=true)**. This is a deterministic response. The system detected your request as a general query using the provided context. Ask about fees or admissions for a simulated RAG response.',
      confidence: 0.75,
      source_ids: ['mock:llm-response:1'],
      action: 'clarification_needed',
      translated: lang !== 'en',
    }
  }
}

// --- GEMINI IMPLEMENTATION (for Production) ---
export class GeminiAdapter implements LLMAdapter {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set for production mode.')
    }
    // Production initialization code goes here (e.g., SDK client setup)
  }

  async generateResponse(
    prompt: string,
    context: string[],
    lang: string,
  ): Promise<ChatResponse> {
    const fullPrompt = `You are a college assistant. Answer the user's question: "${prompt}" based ONLY on the following context:\n\n---\nContext: ${context.join('\n\n')}\n---`
    
    // In a real implementation:
    // 1. Call Gemini API with the prompt.
    // 2. Parse the response and confidence.
    const mockResponse: ChatResponse = {
      reply: `[Production Response from Gemini] Processed prompt: ${fullPrompt.substring(0, 100)}...`,
      confidence: 0.8,
      source_ids: ['gemini:api-call'],
      action: 'answer:llm',
      translated: false,
    }
    
    return mockResponse
  }
}

// --- FACTORY FUNCTION ---
export function getLLMAdapter(): LLMAdapter {
  const isMock = process.env.MOCK_LLM === 'true' || process.env.NODE_ENV === 'test'
  
  if (isMock) {
    console.log('[LLM] Using MockLLMAdapter for deterministic response.')
    return new MockLLMAdapter(true)
  }

  console.log('[LLM] Using GeminiAdapter for live production response.')
  return new GeminiAdapter()
}

// Mock Auth logic (simplified for brevity)
export async function requireAuth(request: Request, roles: string[] = ['admin']): Promise<boolean | Response> {
  const isMock = process.env.MOCK_AUTH === 'true' || process.env.NODE_ENV === 'test'
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (isMock) {
    if (token === process.env.ADMIN_TOKEN && roles.includes('admin')) {
      console.log('[Auth] MOCK_AUTH bypass successful for admin.')
      return true
    } else if (!token && roles.includes('student')) {
      // Simulate unauthenticated student access for chat
      return true
    }
  }
  
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // Production Supabase Auth logic goes here
  return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
}