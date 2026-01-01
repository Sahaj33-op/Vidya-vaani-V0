import { type NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ChatAPI");

interface ChatRequest {
  message: string;
  language: string;
  session_id: string;
}

// Mock responses for development mode
const mockResponses: Record<string, string[]> = {
  admission: [
    "Admission process starts in June every year. You can apply online through our college website.",
    "For admissions, you need to submit 12th mark sheet, Aadhar card, and 2 passport photos.",
    "The admission criteria varies by course. Engineering requires JEE scores, while Arts needs 12th percentage.",
  ],
  fee: [
    "The total fee for B.Tech is ₹1,20,000 per year. You can pay in two installments.",
    "Fee structure includes tuition fees, lab fees, and library charges. Scholarships are available based on merit.",
    "For detailed fee information, please visit the accounts department or check our website.",
  ],
  course: [
    "We offer courses in Engineering, Arts, Commerce, and Science. Each has multiple specializations.",
    "Popular courses include Computer Science, Mechanical Engineering, Business Administration, and Commerce.",
    "Course duration is typically 3-4 years for undergraduate and 2 years for postgraduate programs.",
  ],
  exam: [
    "Semester exams are conducted twice a year - in December and May.",
    "Internal assessments contribute 30% and final exam 70% to your total marks.",
    "Exam schedule is published one month in advance on the college notice board and website.",
  ],
  library: [
    "The library is open from 9 AM to 7 PM on weekdays and 9 AM to 1 PM on Saturdays.",
    "Students can borrow up to 5 books for 15 days. Reference books are available for in-library use only.",
    "We have over 50,000 books, digital resources, and quiet study areas for students.",
  ],
  scholarship: [
    "Scholarships are available for students with 85%+ marks and economically weaker sections.",
    "Government scholarships can be applied through the National Scholarship Portal.",
    "College also offers merit scholarships ranging from ₹10,000 to ₹50,000 per year.",
  ],
};

function getMockResponse(message: string, language: string): string {
  const lowerMessage = message.toLowerCase();

  // Find matching keyword
  for (const [keyword, responses] of Object.entries(mockResponses)) {
    if (lowerMessage.includes(keyword)) {
      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];
      return randomResponse;
    }
  }

  // Default response
  const defaultResponses = [
    "I can help you with information about admissions, courses, fees, exams, library, and scholarships. What would you like to know?",
    "I'm here to assist with college-related queries. You can ask about admission process, fee structure, course details, or campus facilities.",
    "Please ask me about admissions, courses, fees, scholarships, library, or examinations. I'm here to help!",
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, language, session_id } = body;

    if (!message || !language || !session_id) {
      return NextResponse.json(
        { error: "Missing required fields: message, language, session_id" },
        { status: 400 },
      );
    }

    // Development mode: return mock responses
    if (process.env.NEXT_PUBLIC_DEV_MODE === "true") {
      logger.info("Dev mode - returning mock response");
      logger.debug("Message:", message, "Language:", language);

      // Simulate API delay for realistic feel
      await new Promise((resolve) =>
        setTimeout(resolve, 800 + Math.random() * 400),
      );

      const response = getMockResponse(message, language);

      return NextResponse.json({
        response,
        language,
        session_id,
      });
    }

    // Production mode: forward to FastAPI backend
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    logger.info("Forwarding to backend:", backendUrl);

    const backendResponse = await fetch(`${backendUrl}/api/v1/chat/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, language, session_id }),
    });

    if (!backendResponse.ok) {
      throw new Error(`Backend returned ${backendResponse.status}`);
    }

    const data = await backendResponse.json();

    // Normalize backend response format to match frontend expectations
    return NextResponse.json({
      response: data.reply || data.response,
      language: data.original_language || language,
      session_id,
      confidence: data.confidence,
      source_ids: data.source_ids,
      translated: data.translated,
    });
  } catch (error) {
    logger.error("Error processing chat request", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 },
    );
  }
}
