import { type NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "@/lib/rate-limiter";

interface VoiceProcessRequest {
  audio_data?: string; // Base64 encoded audio
  action: "transcribe" | "synthesize";
  text?: string; // For synthesis
  language?: string;
}

interface VoiceResponse {
  success: boolean;
  transcribed_text?: string;
  audio_url?: string;
  language_detected?: string;
  confidence?: number;
  method: string;
  error?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimitMiddleware(20, 60000)(request); // 20 requests per minute
  if (rateLimitResult instanceof NextResponse) return rateLimitResult;

  try {
    const body: VoiceProcessRequest = await request.json();
    const { action, audio_data, text, language = "en" } = body;

    console.log("[v0] Voice API request:", {
      action,
      language,
      hasAudio: !!audio_data,
      hasText: !!text,
    });

    if (action === "transcribe") {
      return handleTranscription(audio_data, language);
    } else if (action === "synthesize") {
      return handleSynthesis(text, language);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Use 'transcribe' or 'synthesize'",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("[v0] Voice API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Voice processing failed",
        method: "error_fallback",
      } as VoiceResponse,
      { status: 500 },
    );
  }
}

async function handleTranscription(
  audioData?: string,
  language: string = "en",
): Promise<NextResponse> {
  if (!audioData) {
    return NextResponse.json(
      { success: false, error: "Audio data is required for transcription" },
      { status: 400 },
    );
  }

  try {
    const response: VoiceResponse = {
      success: true,
      transcribed_text:
        "[Simulated transcription - integrate Whisper API here]",
      language_detected: language,
      confidence: 0.85,
      method: "whisper_simulation",
    };

    console.log("[v0] Transcription result:", response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("[v0] Transcription error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Transcription failed",
        method: "transcription_error",
      } as VoiceResponse,
      { status: 500 },
    );
  }
}

async function handleSynthesis(
  text?: string,
  language: string = "en",
): Promise<NextResponse> {
  if (!text?.trim()) {
    return NextResponse.json(
      { success: false, error: "Text is required for synthesis" },
      { status: 400 },
    );
  }

  try {
    const response: VoiceResponse = {
      success: true,
      language_detected: language,
      confidence: 1.0,
      method: "browser_speech_synthesis",
      message: "Use browser's speechSynthesis API for text-to-speech",
    };

    console.log("[v0] Synthesis result:", response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("[v0] Synthesis error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Speech synthesis failed",
        method: "synthesis_error",
      } as VoiceResponse,
      { status: 500 },
    );
  }
}

function detectLanguageFromAudio(audioData: string): string {
  return "en";
}

function convertAudioFormat(audioData: string, targetFormat: string): string {
  return audioData;
}
