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
    select: { externalId: true, provider: true, recordingUrl: true },
  });

  if (!call || (!call.externalId && !call.recordingUrl)) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }

  const vapiId =
    call.externalId ||
    call.recordingUrl?.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1];

  const keys = [
    process.env.VAPI_API_KEY,
    "d2163e52-c537-40c6-b75e-709b62853f2a",
    "0902ea4d-ee53-4e02-9ac2-4c25b68c4e42",
  ].filter(Boolean) as string[];

  if ((!call.provider || call.provider === "vapi") && vapiId) {
    for (const key of Array.from(new Set(keys))) {
      try {
        const vapiRes = await fetch(
          `https://api.vapi.ai/call/${vapiId}/mono-recording`,
          {
            headers: { Authorization: `Bearer ${key}` },
            redirect: "manual",
          },
        );

        if (vapiRes.status === 302 || vapiRes.status === 307) {
          const location = vapiRes.headers.get("location");
          if (location) {
            return NextResponse.redirect(location, 307);
          }
        }

        if (vapiRes.ok) {
          return new NextResponse(vapiRes.body, {
            headers: {
              "Content-Type": vapiRes.headers.get("content-type") || "audio/wav",
            },
          });
        }
      } catch (e) {
        console.error("Failed to fetch signed recording from Vapi:", e);
      }
    }
  }

  // Fallback to stored recording URL if direct Vapi call was not available
  if (call.recordingUrl) {
    return NextResponse.redirect(call.recordingUrl, 307);
  }

  return NextResponse.json({ error: "Recording unavailable" }, { status: 404 });
}

