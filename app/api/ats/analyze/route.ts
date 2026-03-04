// app/api/ats/analyze/route.ts
import { NextResponse } from "next/server";

type AnalyzeBody = {
  jobDescription: string;
  resumeText: string;
};

type AnalysisResult = {
  score: number;
  status: "PASS" | "MODERATE" | "FAIL";
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "a",
  "an",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "is",
  "are",
  "was",
  "were",
  "this",
  "that",
  "it",
  "as",
  "or",
  "be",
  "can",
  "will",
  "shall",
  "you",
  "your",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+.# ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function getKeywords(jobDescription: string): string[] {
  const tokens = tokenize(jobDescription);
  return unique(tokens);
}

function basicScore(
  jobKeywords: string[],
  resumeTokens: string[]
): AnalysisResult {
  const resumeSet = new Set(resumeTokens);
  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of jobKeywords) {
    if (resumeSet.has(kw)) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const total = jobKeywords.length || 1;
  const keywordScore = Math.round((matched.length / total) * 100);

  let status: AnalysisResult["status"];
  if (keywordScore >= 75) status = "PASS";
  else if (keywordScore >= 60) status = "MODERATE";
  else status = "FAIL";

  const suggestions: string[] = [];

  if (missing.length > 0) {
    suggestions.push(
      `Consider adding these important keywords if they are true for you: ${missing
        .slice(0, 15)
        .join(", ")}.`
    );
  }

  if (matched.length < total * 0.5) {
    suggestions.push(
      "Your resume is missing many of the keywords from the job description. Try tailoring your skills and experience sections."
    );
  }

  if (matched.length > total * 0.8) {
    suggestions.push(
      "You are matching most of the job keywords. Make sure the keywords are used naturally, not just in a list."
    );
  }

  if (suggestions.length === 0) {
    suggestions.push(
      "Your resume already aligns well with this job description. Focus on clear formatting and measurable achievements."
    );
  }

  return {
    score: keywordScore,
    status,
    matchedKeywords: matched.slice(0, 50),
    missingKeywords: missing.slice(0, 50),
    suggestions,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeBody;
    const { jobDescription, resumeText } = body;

    if (!jobDescription || !resumeText) {
      return NextResponse.json(
        { error: "Job description and resume text are required." },
        { status: 400 }
      );
    }

    const jobKeywords = getKeywords(jobDescription);
    const resumeTokens = tokenize(resumeText);

    const result = basicScore(jobKeywords, resumeTokens);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("ATS analyze error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
