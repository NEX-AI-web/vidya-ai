
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ELEVENLABS_API_URL =
  "https://api.elevenlabs.io/v1/text-to-speech";

const VOICE_ID = "EXAVQu4vr4xnSDxMaL";

const MODEL_ID = "eleven_multilingual_v2";

const REQUEST_TIMEOUT = 30000;

interface SpeakRequest {
  text?: string;
}

function cleanText(text: string): string {
  return text
    // Remove Markdown formatting.
    .replace(/[*#_`~]/g, "")
    // Remove Markdown links but retain their labels.
    .replace(
      /\[([^\]]+)\]\([^)]+\)/g,
      "$1"
    )
    // Remove excessive blank lines.
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "ELEVENLABS_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    let body: SpeakRequest;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    if (
      typeof body.text !== "string" ||
      !body.text.trim()
    ) {
      return NextResponse.json(
        { error: "Please provide text to convert into speech." },
        { status: 400 }
      );
    }

    const text = cleanText(body.text);

    if (text.length > 5000) {
      return NextResponse.json(
        { error: "Text exceeds the 5000 character limit." },
        { status: 413 }
      );
    }

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT
    );

    try {
      const response = await fetch(
        `${ELEVENLABS_API_URL}/${VOICE_ID}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: MODEL_ID,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.3,
              use_speaker_boost: true,
            },
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        console.error(
          "ElevenLabs API error:",
          response.status,
          errorText.slice(0, 500)
        );

        return NextResponse.json(
          {
            error: "Text-to-speech service is temporarily unavailable.",
          },
          { status: 502 }
        );
      }

      const audioBuffer = await response.arrayBuffer();

      if (!audioBuffer.byteLength) {
        return NextResponse.json(
          { error: "ElevenLabs returned empty audio." },
          { status: 502 }
        );
      }

      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": String(audioBuffer.byteLength),
          "Cache-Control": "no-store",
          "Content-Disposition": 'inline; filename="vidya-ai.mp3"',
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("Vidya AI Speech API error:", error);

    const isTimeout =
      error instanceof Error &&
      error.name === "AbortError";

    return NextResponse.json(
      {
        error: isTimeout
          ? "Speech generation timed out. Please try again."
          : "Unable to generate speech.",
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
