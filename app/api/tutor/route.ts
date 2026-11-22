
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GROQ_MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";

const GROQ_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const REQUEST_TIMEOUT = 45000;

type TutorRequest = {
  question?: string;
  imageBase64?: string;
  mimeType?: string;
  lessonContext?: string;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

const TUTOR_INSTRUCTIONS = `
You are Vidya AI, a patient and friendly mathematics tutor.

YOUR STUDENTS:
Class 8 students studying in Andhra Pradesh government schools.

YOUR SUBJECT:
Andhra Pradesh SCERT Class 8 Mathematics.

LANGUAGE RULES:
1. If the student asks in Telugu, answer in Telugu script.
2. If the student asks in English, answer in English.
3. If the student uses Telugu-English mixed language,
   respond naturally in the same style.
4. Use simple words suitable for Class 8 students.

TEACHING RULES:
1. Explain concepts step by step.
2. Show mathematical formulas clearly.
3. Explain each calculation.
4. For word problems, identify:
   - Given information
   - What we need to find
   - Formula
   - Step-by-step solution
   - Final answer
5. Never invent missing numbers or information.
6. If the question is unclear, politely ask for clarification.
7. If an image is provided, carefully read the question
   from the image before answering.
8. For greetings like Hi or హాయ్, respond naturally.
9. Do not force mathematics explanations for greetings
   or general conversation.
10. Keep explanations friendly, accurate and understandable.
11. When useful, give one small practice question.

IMPORTANT:
You are a tutor, not just an answer generator.
Help students understand how and why an answer is obtained.
`;

function jsonError(
  message: string,
  status: number,
  debug?: string
) {
  return NextResponse.json(
    {
      reply: message,
      ...(process.env.NODE_ENV === "development" && debug
        ? { debug }
        : {}),
    },
    { status }
  );
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit
) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function callGroq(
  question: string,
  lessonContext: string,
  history: TutorRequest["conversationHistory"]
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing.");
  }

  const messages = [
    {
      role: "system",
      content:
        TUTOR_INSTRUCTIONS +
        "\n\nCURRENT LESSON CONTEXT:\n" +
        (lessonContext || "General Class 8 Mathematics"),
    },
    ...(history || []).slice(-10).map((item) => ({
      role: item.role,
      content: item.content,
    })),
    {
      role: "user",
      content: question,
    },
  ];

  const response = await fetchWithTimeout(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Groq API error (${response.status}): ${errorText.slice(0, 1000)}`
    );
  }

  const data = await response.json();

  const reply = data?.choices?.[0]?.message?.content;

  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error("Groq returned an empty response.");
  }

  return reply.trim();
}

async function callGemini(
  question: string,
  lessonContext: string,
  history: TutorRequest["conversationHistory"],
  imageBase64?: string,
  mimeType?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const prompt = `
${TUTOR_INSTRUCTIONS}

CURRENT LESSON CONTEXT:
${lessonContext || "General Class 8 Mathematics"}

PREVIOUS CONVERSATION:
${(history || [])
  .slice(-10)
  .map(
    (item) =>
      `${item.role === "user" ? "Student" : "Tutor"}: ${item.content}`
  )
  .join("\n")}

STUDENT'S CURRENT QUESTION:
${question || "Please explain the uploaded question."}
`;

  const input: Array<Record<string, string>> = [
    {
      type: "text",
      text: prompt,
    },
  ];

  if (imageBase64) {
    input.push({
      type: "image",
      data: imageBase64,
      mime_type: mimeType || "image/jpeg",
    });
  }

  const response = await fetchWithTimeout(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
      "Api-Revision": "2026-05-20",
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      input,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Gemini API error (${response.status}): ${errorText.slice(0, 1000)}`
    );
  }

  const data = await response.json();

  const reply = data?.output_text;

  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error(
      "Gemini returned an empty response or unexpected output format."
    );
  }

  return reply.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TutorRequest;

    const question =
      typeof body.question === "string"
        ? body.question.trim()
        : "";

    const imageBase64 =
      typeof body.imageBase64 === "string"
        ? body.imageBase64
        : "";

    const lessonContext =
      typeof body.lessonContext === "string"
        ? body.lessonContext.slice(0, 10000)
        : "";

    const history = Array.isArray(body.conversationHistory)
      ? body.conversationHistory
          .filter(
            (item) =>
              (item.role === "user" ||
                item.role === "assistant") &&
              typeof item.content === "string"
          )
          .slice(-10)
      : [];

    if (!question && !imageBase64) {
      return jsonError(
        "Please enter a question or upload an image.",
        400
      );
    }

    if (question.length > 10000) {
      return jsonError(
        "Your question is too long. Please shorten it.",
        400
      );
    }

    let cleanImage = imageBase64;

    if (cleanImage) {
      cleanImage = cleanImage.replace(
        /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
        ""
      );

      const imageBuffer = Buffer.from(cleanImage, "base64");

      if (
        !imageBuffer.length ||
        imageBuffer.length > MAX_IMAGE_SIZE
      ) {
        return jsonError(
          "Image is empty or larger than 8 MB.",
          400
        );
      }

      if (!["image/jpeg", "image/png", "image/webp"].includes(
        body.mimeType || "image/jpeg"
      )) {
        return jsonError(
          "Please upload a JPG, PNG or WEBP image.",
          400
        );
      }

      cleanImage = imageBuffer.toString("base64");
    }

    // Images are processed by Gemini because the
    // configured Groq text model is not used for vision.

    if (cleanImage) {
      try {
        const reply = await callGemini(
          question,
          lessonContext,
          history,
          cleanImage,
          body.mimeType
        );

        return NextResponse.json({
          reply,
          provider: "gemini",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);

        console.error("Vidya AI image/Gemini error:", message);

        return jsonError(
          "క్షమించండి, మీ ఫోటోను ప్రస్తుతం చదవలేకపోయాను. దయచేసి మళ్లీ ప్రయత్నించండి.",
          502,
          message
        );
      }
    }

    // 1. Try Groq first.

    try {
      const reply = await callGroq(
        question,
        lessonContext,
        history
      );

      return NextResponse.json({
        reply,
        provider: "groq",
      });
    } catch (groqError) {
      const groqMessage =
        groqError instanceof Error
          ? groqError.message
          : String(groqError);

      console.error(
        "Groq failed. Trying Gemini fallback:",
        groqMessage
      );

      // 2. Try Gemini fallback.

      try {
        const reply = await callGemini(
          question,
          lessonContext,
          history
        );

        return NextResponse.json({
          reply,
          provider: "gemini",
        });
      } catch (geminiError) {
        const geminiMessage =
          geminiError instanceof Error
            ? geminiError.message
            : String(geminiError);

        console.error(
          "Vidya AI: Both providers failed.",
          {
            groq: groqMessage,
            gemini: geminiMessage,
          }
        );

        return jsonError(
          "క్షమించండి, AI సేవ ప్రస్తుతం అందుబాటులో లేదు. కొద్దిసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.",
          503,
          `Groq: ${groqMessage} | Gemini: ${geminiMessage}`
        );
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error("Vidya AI Tutor API error:", message);

    return jsonError(
      "Unable to process your question. Please try again.",
      500,
      message
    );
  }
}
