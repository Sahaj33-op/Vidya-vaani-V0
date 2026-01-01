import { NextRequest, NextResponse } from "next/server";

export async function requireAuth(
  request: NextRequest,
): Promise<NextResponse | any> {
  // HACKATHON MODE: Disable authentication for demo
  // In production, you would verify JWT tokens from Supabase/Auth0
  console.log("[Admin] Authentication bypassed for hackathon demo");
  return { userId: "demo-user", role: "admin", email: "admin@vidyavaani.edu" };
}
