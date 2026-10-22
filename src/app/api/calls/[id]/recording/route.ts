import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const callId = Number(id);
  if (!callId) {
    return NextResponse.json({ error: "Invalid call ID" }, { status: 400 });
  }

  const call = await prisma.call.findUnique({
    where: { id: callId },
    select: { vapiCallId: true, recordingUrl: true },
  });

  if (!call || (!call.vapiCallId && !call.recordingUrl)) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }

  const vapiKey = process.env.VAPI_API_KEY;
  if (call.vapiCallId && vapiKey) {
    try {
      const vapiRes = await fetch(
        `https://api.vapi.ai/call/${call.vapiCallId}/mono-recording`,
        {
          headers: { Authorization: `Bearer ${vapiKey}` },
          redirect: "manual",
        },
      );

      const location = vapiRes.headers.get("location");
      if (location) {
        return NextResponse.redirect(location, 307);
      }
    } catch (e) {
      console.error("Failed to fetch signed recording from Vapi:", e);
    }
  }

  // Fallback to stored recording URL if direct Vapi call was not available
  if (call.recordingUrl) {
    return NextResponse.redirect(call.recordingUrl, 307);
  }

  return NextResponse.json({ error: "Recording unavailable" }, { status: 404 });
}

