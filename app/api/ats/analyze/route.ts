// app/api/ats/analyze/route.ts
import { NextResponse } from "next/server";

type AnalyzeBody = {
  jobDescription: string;
  resumeText: string;
};

type Status = "PASS" | "MODERATE" | "FAIL";

type RewriteSuggestion = {
  type: "keyword";
  importance: "high" | "medium";
  keyword: string;
  targetSection:
    | "Summary"
    | "Experience"
    | "Projects"
    | "Skills"
    | "Education"
    | "General";
  originalSnippet: string | null;
  suggestedRewrite: string;
};

type AnalysisResult = {
  finalScore: number;
  status: Status;

  keywordScore: number;
  requiredScore: number;
  experienceScore: number;
  contextScore: number;
  formattingScore: number;

  targetKeywordScore: number;
  targetRequiredScore: number;
  targetExperienceScore: number;
  targetContextScore: number;
  targetFormattingScore: number;

  matchedKeywords: string[];
  missingHighPriorityKeywords: string[];

  gapSummary: string;
  bulletSuggestions: string[];
  rewriteSuggestions: RewriteSuggestion[];
};

// ---------------------------
// Config / dictionaries
// ---------------------------

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "your",
  "our",
  "with",
  "from",
  "that",
  "this",
  "these",
  "those",
  "their",
  "there",
  "here",
  "such",
  "all",
  "any",
  "each",
  "other",
  "etc",
  "etc.",
  "like",
  "will",
  "shall",
  "can",
  "could",
  "would",
  "should",
  "may",
  "might",
  "must",
  "have",
  "has",
  "had",
  "been",
  "being",
  "is",
  "am",
  "was",
  "were",
  "do",
  "does",
  "did",
  "of",
  "in",
  "on",
  "at",
  "as",
  "to",
  "by",
  "or",
  "an",
  "a",
  "be",
  "it",
  "its",
  "we",
  "they",
  "them",
  "who",
  "whom",
  "whose",
  "which",
  "what",
  "when",
  "where",
  "why",
  "how",
  "per",
  "using",
  "used",
  "via",
  "into",
  "over",
  "under",
  "up",
  "down",
  "responsible",
  "responsibilities",
  "duties",
  "tasks",
  "role",
  "position",
  "environment",
  "ability",
  "required",
  "requirement",
  "requirements",
  "preferred",
  "plus",
  "nice",
  "ideal",
  "candidate",
  "successful",
  "strong",
  "proven",
  "experience",
  "including",
  "include",
  "includes",
  "ensure",
  "ensuring",
  "provide",
  "providing",
  "support",
  "supporting",
  "manage",
  "manages",
  "managing",
  "managed",
  "handle",
  "handles",
  "handling",
  "handled",
  "perform",
  "performs",
  "performing",
  "performed",
  "work",
  "working",
  "worked",
  "collaborate",
  "collaborates",
  "collaborating",
  "collaborated",
  "coordinate",
  "coordinates",
  "coordinating",
  "coordinated",
  "develop",
  "develops",
  "developing",
  "developed",
  "maintain",
  "maintains",
  "maintaining",
  "maintained",
  "lead",
  "leads",
  "leading",
  "led",
  "drive",
  "drives",
  "driving",
  "driven",
  "teams",
  "team",
  "members",
  "stakeholders",
  "stakeholder",
]);

const GENERIC_TAIL = new Set([
  "additional",
  "knowledge",
  "background",
  "literacy",
  "proficiency",
  "reason",
  "period",
  "time",
  "employee",
  "employment",
  "suite",
  "provided",
  "inc",
  "inc.",
]);

const SOFT_SKILLS = new Set([
  "communication",
  "communicator",
  "teamwork",
  "team player",
  "collaboration",
  "collaborative",
  "leadership",
  "problem solving",
  "problem-solving",
  "critical thinking",
  "time management",
  "adaptability",
  "flexibility",
  "attention to detail",
  "detail oriented",
  "detail-oriented",
  "organization",
  "organizational",
  "analytical",
  "interpersonal",
  "stakeholder management",
  "self-motivated",
  "initiative",
]);

const SECTION_MARKERS = [
  "responsibilities",
  "responsibility",
  "what you will do",
  "what you’ll do",
  "about the role",
  "role overview",
  "requirements",
  "required",
  "must have",
  "qualifications",
  "skills",
  "preferred",
  "nice to have",
];

const YEARS_PATTERN =
  /(\d+)\+?\s+(?:years|year)\s+(?:of\s+)?(?:experience|exp)/i;

const ACTION_VERBS = [
  "built",
  "developed",
  "designed",
  "implemented",
  "owned",
  "led",
  "optimized",
  "managed",
  "created",
  "launched",
  "improved",
  "reduced",
  "increased",
  "delivered",
  "migrated",
  "automated",
  "analyzed",
  "configured",
  "deployed",
  "coordinated",
  "negotiated",
  "executed",
];

const GLOBAL_ANCHORS = [
  "ocean",
  "import",
  "export",
  "freight",
  "logistics",
  "customs",
  "trade",
  "incoterms",
  "warehouse",
  "supply chain",
  "python",
  "java",
  "javascript",
  "typescript",
  "react",
  "node",
  "sql",
  "postgres",
  "mysql",
  "docker",
  "kubernetes",
  "aws",
  "azure",
  "gcp",
  "git",
  "api",
  "salesforce",
  "sap",
  "oracle",
  "crm",
  "erp",
  "p&l",
  "kpi",
  "roi",
  "seo",
  "sem",
  "ppc",
  "google ads",
  "meta ads",
  "analytics",
  "gaap",
  "ifrs",
  "budget",
  "forecasting",
  "excel",
  "powerpoint",
  "word",
  "microsoft",
  "office",
  "power bi",
  "tableau",
];

// ---------------------------
// Helper functions
// ---------------------------

function stripLegalTail(jd: string): string {
  const lower = jd.toLowerCase();
  const markers = [
    "at-will employment",
    "at will employment",
    "does not accept unsolicited",
    "equal employment opportunity",
    "equal opportunity employer",
    "is an equal employment opportunity",
    "salary range",
    "compensation will be determined",
    "base pay is",
    "will not be responsible for any agency fees",
    "unsolicited resumes",
  ];

  let cutIndex = jd.length;
  for (const m of markers) {
    const idx = lower.indexOf(m);
    if (idx !== -1 && idx < cutIndex) cutIndex = idx;
  }
  return jd.slice(0, cutIndex);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+.# ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function termFrequencies(tokens: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of tokens) {
    const current = map.get(t) ?? 0;
    map.set(t, current + 1);
  }
  return map;
}

function extractBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i];
    const b = tokens[i + 1];
    if (STOP_WORDS.has(a) || STOP_WORDS.has(b)) continue;
    if (GENERIC_TAIL.has(a) || GENERIC_TAIL.has(b)) continue;
    bigrams.push(`${a} ${b}`);
  }
  return bigrams;
}

function splitIntoSections(
  jd: string
): { name: string; content: string }[] {
  const lines = jd.split(/\r?\n/);
  const sections: { name: string; content: string }[] = [];
  let currentName = "general";
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const lowerLine = trimmed.toLowerCase();
    const marker = SECTION_MARKERS.find((m) => lowerLine.includes(m));

    if (marker) {
      if (currentContent.length > 0) {
        sections.push({
          name: currentName,
          content: currentContent.join("\n"),
        });
      }
      currentName = marker;
      currentContent = [];
    } else {
      currentContent.push(trimmed);
    }
  }

  if (currentContent.length > 0) {
    sections.push({
      name: currentName,
      content: currentContent.join("\n"),
    });
  }

  if (sections.length === 0) {
    sections.push({ name: "general", content: jd });
  }

  return sections;
}

function extractKeywordsFromText(text: string): string[] {
  const tokens = tokenize(text);
  const freqs = termFrequencies(tokens);
  const bigrams = extractBigrams(tokens);

  const strongKeywords = new Set<string>();

  freqs.forEach((count, term) => {
    if (STOP_WORDS.has(term)) return;
    if (term.length < 3) return;
    if (count >= 2 || /[0-9#+]/.test(term)) strongKeywords.add(term);
  });

  const bigramFreqs = termFrequencies(bigrams);
  bigramFreqs.forEach((count, phrase) => {
    const lower = phrase.toLowerCase();
    const hasAnchor = GLOBAL_ANCHORS.some((a) => lower.includes(a));
    if (count >= 2 || hasAnchor) strongKeywords.add(phrase);
  });

  return Array.from(strongKeywords);
}

function classifyKeyword(
  kw: string
): "required" | "preferred" | "soft" | "general" {
  const lower = kw.toLowerCase();
  if (SOFT_SKILLS.has(lower)) return "soft";
  return "general";
}

function extractJDKeywords(jd: string) {
  const sections = splitIntoSections(jd);
  const required: string[] = [];
  const preferred: string[] = [];
  const soft: string[] = [];
  const all: string[] = [];

  for (const sec of sections) {
    const kws = extractKeywordsFromText(sec.content);
    for (const kw of kws) {
      const type = classifyKeyword(kw);
      all.push(kw);

      if (type === "soft" && !soft.includes(kw)) soft.push(kw);

      const lowerName = sec.name.toLowerCase();
      if (
        lowerName.includes("requirements") ||
        lowerName.includes("required") ||
        lowerName.includes("must have") ||
        lowerName.includes("qualifications")
      ) {
        if (!required.includes(kw)) required.push(kw);
      } else if (
        lowerName.includes("preferred") ||
        lowerName.includes("nice to have")
      ) {
        if (!preferred.includes(kw)) preferred.push(kw);
      }
    }
  }

  const uniqueAll = Array.from(new Set(all));
  if (required.length === 0 && uniqueAll.length > 0) {
    required.push(...uniqueAll.slice(0, Math.min(10, uniqueAll.length)));
  }

  return {
    requiredKeywords: Array.from(new Set(required)),
    preferredKeywords: Array.from(new Set(preferred)),
    softKeywords: Array.from(new Set(soft)),
    allKeywords: uniqueAll,
  };
}

function analyzeResumeStructure(resume: string) {
  const lower = resume.toLowerCase();

  const hasExperienceSection =
    lower.includes("experience") || lower.includes("employment");
  const hasSkillsSection = lower.includes("skills");
  const hasEducationSection = lower.includes("education");

  const bulletCount = (resume.match(/^\s*[-•*]/gm) || []).length;

  const yearsMatch = resume.match(YEARS_PATTERN);
  const yearsOfExperience = yearsMatch ? parseInt(yearsMatch[1], 10) : null;

  return {
    hasExperienceSection,
    hasSkillsSection,
    hasEducationSection,
    bulletCount,
    yearsOfExperience,
  };
}

function matchKeywords(
  keywords: string[],
  resume: string
): { matched: string[]; missing: string[] } {
  const lower = resume.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of keywords) {
    const pattern = kw.toLowerCase();
    if (pattern.includes(" ")) {
      if (lower.includes(pattern)) matched.push(kw);
      else missing.push(kw);
    } else {
      const re = new RegExp(
        `\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i"
      );
      if (re.test(resume)) matched.push(kw);
      else missing.push(kw);
    }
  }

  return { matched, missing };
}

function calcExperienceMatch(
  jd: string,
  resumeYears: number | null
): number {
  const jdMatch = jd.match(YEARS_PATTERN);
  if (!jdMatch || !resumeYears) return 0.6;

  const requiredYears = parseInt(jdMatch[1], 10);
  if (!requiredYears || requiredYears <= 0) return 0.6;

  if (resumeYears >= requiredYears) return 1.0;
  if (resumeYears >= requiredYears * 0.7) return 0.8;
  return 0.3;
}

function calcContextScore(resume: string, matchedKeywords: string[]): number {
  if (!matchedKeywords.length) return 0;

  const lower = resume.toLowerCase();
  const lines = lower.split(/\r?\n/);

  let goodContextHits = 0;
  let totalKeywordHits = 0;

  for (const line of lines) {
    const lineHasKeyword = matchedKeywords.some((kw) =>
      line.includes(kw.toLowerCase())
    );
    if (!lineHasKeyword) continue;

    totalKeywordHits++;

    const hasActionVerb = ACTION_VERBS.some((v) => line.includes(v));
    const hasMetric = /\d+%|\d+\s+(?:k|m|usd|eur|inr|rs)/.test(line);

    if (hasActionVerb || hasMetric) goodContextHits++;
  }

  if (totalKeywordHits === 0) return 0.4;
  const ratio = goodContextHits / totalKeywordHits;

  if (ratio >= 0.7) return 1.0;
  if (ratio >= 0.4) return 0.7;
  if (ratio >= 0.2) return 0.5;
  return 0.3;
}

function calcFormattingScore(struct: {
  hasExperienceSection: boolean;
  hasSkillsSection: boolean;
  hasEducationSection: boolean;
  bulletCount: number;
}): number {
  let score = 0;
  if (struct.hasExperienceSection) score += 0.3;
  if (struct.hasSkillsSection) score += 0.3;
  if (struct.hasEducationSection) score += 0.2;

  if (struct.bulletCount >= 5) score += 0.2;
  else if (struct.bulletCount >= 2) score += 0.1;

  if (score > 1) score = 1;
  return score;
}

function statusFromScore(score: number): Status {
  if (score >= 80) return "PASS";
  if (score >= 60) return "MODERATE";
  return "FAIL";
}

function filterHighValue(missing: string[]): string[] {
  return Array.from(new Set(missing))
    .filter((kw) => {
      const lower = kw.toLowerCase();
      const tokens = lower.split(" ");
      const hasAnchor = GLOBAL_ANCHORS.some((a) => lower.includes(a));
      return tokens.length >= 2 || hasAnchor;
    })
    .slice(0, 10);
}

function estimateTargets() {
  return {
    targetKeyword: 80,
    targetRequired: 80,
    targetExperience: 75,
    targetContext: 70,
    targetFormatting: 70,
  };
}

function buildGapSummary(params: {
  keywordScore: number;
  requiredScore: number;
  experienceScore: number;
  contextScore: number;
  formattingScore: number;
  targetKeyword: number;
  targetRequired: number;
  targetExperience: number;
  targetContext: number;
  targetFormatting: number;
}): string {
  const gaps: string[] = [];

  if (params.keywordScore < params.targetKeyword - 15) {
    gaps.push(
      "your overall keyword match is much lower than the target for this role"
    );
  } else if (params.keywordScore < params.targetKeyword) {
    gaps.push("your keyword match is slightly below the ideal range");
  }

  if (params.requiredScore < params.targetRequired - 15) {
    gaps.push(
      "many required skills from the job description are missing or not clearly shown"
    );
  } else if (params.requiredScore < params.targetRequired) {
    gaps.push(
      "some key required skills appear, but a few important ones are still missing"
    );
  }

  if (params.experienceScore < params.targetExperience - 20) {
    gaps.push(
      "your years of experience appear clearly below what the job is asking for"
    );
  } else if (params.experienceScore < params.targetExperience) {
    gaps.push(
      "your experience level is close but not fully at the job requirement level"
    );
  }

  if (params.contextScore < params.targetContext) {
    gaps.push(
      "keywords in your resume often do not appear inside strong, action‑oriented bullets with results"
    );
  }

  if (params.formattingScore < params.targetFormatting) {
    gaps.push(
      "your resume formatting can be clearer for ATS parsing (sections/bullets)"
    );
  }

  if (!gaps.length) {
    return "Your resume is generally well aligned with this job. You can still improve slightly by tightening a few bullets around the most important keywords.";
  }

  return (
    "Compared to what a strong resume for this job would look like, " +
    gaps.join("; ") +
    "."
  );
}

function buildBulletSuggestions(params: {
  missingRequired: string[];
  missingPreferred: string[];
  softMissing: string[];
  highPriorityMissing: string[];
  keywordScore: number;
  requiredScore: number;
  experienceScore: number;
  contextScore: number;
  formattingScore: number;
  targetKeyword: number;
  targetRequired: number;
  targetExperience: number;
  targetContext: number;
  targetFormatting: number;
}): string[] {
  const suggestions: string[] = [];

  const topRequired = filterHighValue(params.missingRequired);
  const topPreferred = filterHighValue(params.missingPreferred).slice(0, 5);
  const topHighPriority = params.highPriorityMissing.slice(0, 8);
  const topSoft = params.softMissing.slice(0, 5);

  if (topRequired.length) {
    suggestions.push(
      `Add **${topRequired.join(
        ", "
      )}** to your resume. Put them in the Skills section and add 1–2 Experience bullets showing where you used them, for example: “Managed **ocean imports** and ensured **customs regulations** compliance for multiple shipments per month.”`
    );
  } else if (topHighPriority.length) {
    suggestions.push(
      `Your resume is missing high‑impact keywords like **${topHighPriority.join(
        ", "
      )}**. Add them to your Summary and Experience bullets in context, not just as a flat list.`
    );
  }

  if (topPreferred.length) {
    suggestions.push(
      `If they apply, weave **${topPreferred.join(
        ", "
      )}** into your Summary or project bullets to move closer to strong candidates for this role.`
    );
  }

  if (topSoft.length) {
    suggestions.push(
      `Show soft skills such as **${topSoft.join(
        ", "
      )}** in achievement‑focused bullets (for example, “Used strong **communication** to coordinate with carriers and resolve shipment issues quickly”).`
    );
  }

  if (params.keywordScore < params.targetKeyword - 10) {
    suggestions.push(
      `Raise your keyword match by mirroring the job description phrases, such as **customs regulations**, **trade laws**, and **ocean imports**, in your Summary, Skills, and Experience sections.`
    );
  }

  if (params.requiredScore < params.targetRequired - 10) {
    suggestions.push(
      `Go through the Requirements section line‑by‑line and ensure each major requirement is covered by at least **one bullet** that explicitly mentions that requirement.`
    );
  }

  if (params.contextScore < params.targetContext) {
    suggestions.push(
      `Rewrite weak lines into strong bullets following the pattern **Action verb + keyword + metric**, for example: “Implemented **cargo tracking** process that reduced delivery delays by **10%**.”`
    );
  }

  if (params.formattingScore < params.targetFormatting) {
    suggestions.push(
      `Improve formatting for ATS by using clear section headings (SUMMARY, EXPERIENCE, SKILLS, EDUCATION) and short **bullet points** instead of long paragraphs around important keywords.`
    );
  }

  if (!suggestions.length) {
    suggestions.push(
      `Your resume is already close to a good match. Still, add one or two bullets explicitly mentioning **the top keywords from this job** and show measurable impact.`
    );
  }

  return suggestions;
}

type ResumeSentence = {
  text: string;
  section:
    | "Summary"
    | "Experience"
    | "Projects"
    | "Skills"
    | "Education"
    | "General";
};

function splitResumeIntoSentences(resume: string): ResumeSentence[] {
  const lines = resume
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const sentences: ResumeSentence[] = [];

  let currentSection: ResumeSentence["section"] = "General";

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("summary")) {
      currentSection = "Summary";
      continue;
    }
    if (lower.includes("experience") || lower.includes("employment")) {
      currentSection = "Experience";
      continue;
    }
    if (lower.includes("projects")) {
      currentSection = "Projects";
      continue;
    }
    if (lower.includes("skills")) {
      currentSection = "Skills";
      continue;
    }
    if (lower.includes("education")) {
      currentSection = "Education";
      continue;
    }

    const parts = line.split(/(?<=[.;])\s+/);
    for (const p of parts) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      sentences.push({
        text: trimmed,
        section: currentSection,
      });
    }
  }

  return sentences;
}

function findBestSentenceForKeyword(
  keyword: string,
  sentences: ResumeSentence[]
): ResumeSentence | null {
  const lowerKeyword = keyword.toLowerCase();
  const preferredOrder: ResumeSentence["section"][] = [
    "Experience",
    "Projects",
    "Summary",
    "Skills",
    "Education",
    "General",
  ];

  for (const section of preferredOrder) {
    const candidates = sentences.filter((s) => s.section === section);
    if (!candidates.length) continue;

    const best = candidates.reduce<ResumeSentence | null>((acc, s) => {
      const lower = s.text.toLowerCase();
      let score = 0;
      if (
        lowerKeyword.includes("customs") ||
        lowerKeyword.includes("trade")
      ) {
        if (
          lower.includes("export") ||
          lower.includes("logistics") ||
          lower.includes("shipment")
        )
          score += 2;
      }
      if (
        lowerKeyword.includes("ocean") ||
        lowerKeyword.includes("freight")
      ) {
        if (
          lower.includes("sea") ||
          lower.includes("shipment") ||
          lower.includes("transport")
        )
          score += 2;
      }
      if (lower.includes("project") || lower.includes("simulated"))
        score += 1;

      if (!acc) return { ...s };

      const accLower = acc.text.toLowerCase();
      let accScore = 0;
      if (
        lowerKeyword.includes("customs") ||
        lowerKeyword.includes("trade")
      ) {
        if (
          accLower.includes("export") ||
          accLower.includes("logistics") ||
          accLower.includes("shipment")
        )
          accScore += 2;
      }
      if (
        lowerKeyword.includes("ocean") ||
        lowerKeyword.includes("freight")
      ) {
        if (
          accLower.includes("sea") ||
          accLower.includes("shipment") ||
          accLower.includes("transport")
        )
          accScore += 2;
      }
      if (accLower.includes("project") || accLower.includes("simulated"))
        accScore += 1;

      return score > accScore ? { ...s } : acc;
    }, null);

    if (best) return best;
  }

  return null;
}

function buildRewriteSuggestions(params: {
  missingHighPriority: string[];
  resumeText: string;
}): RewriteSuggestion[] {
  const sentences = splitResumeIntoSentences(params.resumeText);
  if (!sentences.length) return [];

  const suggestions: RewriteSuggestion[] = [];
  const seenKeywords = new Set<string>();

  for (const kw of params.missingHighPriority) {
    if (seenKeywords.has(kw.toLowerCase())) continue;
    seenKeywords.add(kw.toLowerCase());

    const sentence = findBestSentenceForKeyword(kw, sentences);

    let section: RewriteSuggestion["targetSection"] = "General";
    let originalSnippet: string | null = null;
    let suggestedRewrite: string;

    if (sentence) {
      section = sentence.section;
      originalSnippet = sentence.text;

      if (sentence.text.includes(kw)) {
        suggestedRewrite = sentence.text;
      } else {
        suggestedRewrite =
          sentence.text.replace(/\.*$/, "") +
          `, focusing on **${kw}** as required for this role.`;
      }
    } else {
      section = "Experience";
      originalSnippet = null;
      suggestedRewrite = `Add a new bullet under your latest relevant experience: “Coordinated daily operations with a focus on **${kw}**.”`;
    }

    suggestions.push({
      type: "keyword",
      importance: "high",
      keyword: kw,
      targetSection: section,
      originalSnippet,
      suggestedRewrite,
    });
  }

  return suggestions.slice(0, 8);
}

// ---------------------------
// Handler
// ---------------------------

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeBody;
    const { jobDescription, resumeText } = body;

    if (!jobDescription || !resumeText) {
      return NextResponse.json(
        {
          error:
            "Job description and resume text are required for analysis.",
        },
        { status: 400 }
      );
    }

    const cleanedJD = stripLegalTail(jobDescription);

    const {
      requiredKeywords,
      preferredKeywords,
      softKeywords,
      allKeywords,
    } = extractJDKeywords(cleanedJD);

    const resumeStruct = analyzeResumeStructure(resumeText);

    const { matched: matchedAll } = matchKeywords(allKeywords, resumeText);
    const { matched: matchedRequired, missing: missingRequired } =
      matchKeywords(requiredKeywords, resumeText);
    const { missing: missingPreferred } = matchKeywords(
      preferredKeywords,
      resumeText
    );
    const { missing: missingSoft } = matchKeywords(
      softKeywords,
      resumeText
    );

    const keywordScore =
      allKeywords.length > 0
        ? matchedAll.length / allKeywords.length
        : 0;

    const requiredScore =
      requiredKeywords.length > 0
        ? matchedRequired.length / requiredKeywords.length
        : 0.5;

    const experienceScore = calcExperienceMatch(
      cleanedJD,
      resumeStruct.yearsOfExperience
    );

    const contextScore = calcContextScore(resumeText, matchedAll);
    const formattingScore = calcFormattingScore(resumeStruct);

    const finalScoreRaw =
      keywordScore * 0.35 +
      requiredScore * 0.2 +
      experienceScore * 0.2 +
      contextScore * 0.15 +
      formattingScore * 0.1;

    const finalScore = Math.round(finalScoreRaw * 100);
    const status = statusFromScore(finalScore);

    const highPriorityMissingRaw = Array.from(
      new Set([...missingRequired, ...missingPreferred])
    );
    const highPriorityMissing = filterHighValue(highPriorityMissingRaw);

    const targets = estimateTargets();

    const gapSummary = buildGapSummary({
      keywordScore: Math.round(keywordScore * 100),
      requiredScore: Math.round(requiredScore * 100),
      experienceScore: Math.round(experienceScore * 100),
      contextScore: Math.round(contextScore * 100),
      formattingScore: Math.round(formattingScore * 100),
      targetKeyword: targets.targetKeyword,
      targetRequired: targets.targetRequired,
      targetExperience: targets.targetExperience,
      targetContext: targets.targetContext,
      targetFormatting: targets.targetFormatting,
    });

    const bulletSuggestions = buildBulletSuggestions({
      missingRequired,
      missingPreferred,
      softMissing: missingSoft,
      highPriorityMissing: highPriorityMissing,
      keywordScore: Math.round(keywordScore * 100),
      requiredScore: Math.round(requiredScore * 100),
      experienceScore: Math.round(experienceScore * 100),
      contextScore: Math.round(contextScore * 100),
      formattingScore: Math.round(formattingScore * 100),
      targetKeyword: targets.targetKeyword,
      targetRequired: targets.targetRequired,
      targetExperience: targets.targetExperience,
      targetContext: targets.targetContext,
      targetFormatting: targets.targetFormatting,
    });

    const rewriteSuggestions = buildRewriteSuggestions({
      missingHighPriority: highPriorityMissing,
      resumeText,
    });

    const result: AnalysisResult = {
      finalScore,
      status,
      keywordScore: Math.round(keywordScore * 100),
      requiredScore: Math.round(requiredScore * 100),
      experienceScore: Math.round(experienceScore * 100),
      contextScore: Math.round(contextScore * 100),
      formattingScore: Math.round(formattingScore * 100),

      targetKeywordScore: targets.targetKeyword,
      targetRequiredScore: targets.targetRequired,
      targetExperienceScore: targets.targetExperience,
      targetContextScore: targets.targetContext,
      targetFormattingScore: targets.targetFormatting,

      matchedKeywords: matchedAll.slice(0, 50),
      missingHighPriorityKeywords: highPriorityMissing,

      gapSummary,
      bulletSuggestions,
      rewriteSuggestions,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("ATS analyze error:", error);
    return NextResponse.json(
      { error: "Internal server error during ATS analysis." },
      { status: 500 }
    );
  }
}
