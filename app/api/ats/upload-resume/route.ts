import { NextResponse } from "next/server";
import * as pdfParseModule from "pdf-parse";

type PdfParseFn = (buffer: Buffer) => Promise<{ text: string }>;

const pdfParse: PdfParseFn =
  (pdfParseModule as unknown as PdfParseFn) ?? (async () => ({ text: "" }));

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.startsWith("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are supported for now." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pdfData = await pdfParse(buffer);
    const rawText: string = pdfData.text || "";

    const cleanText = rawText
      .replace(/\r/g, "")
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => Boolean(line))
      .join("\n");

    if (!cleanText) {
      return NextResponse.json(
        { error: "Could not extract text from this PDF." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        fileName: file.name,
        text: cleanText,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("ATS upload-resume error:", error);
    return NextResponse.json(
      { error: "Failed to process uploaded resume." },
      { status: 500 }
    );
  }
}
