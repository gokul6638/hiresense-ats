"use client";

import { useState, ReactNode } from "react";

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

function renderWithBoldMarkers(text: string): ReactNode {
  const parts = text.split("**");
  if (parts.length === 1) return text;

  const nodes: ReactNode[] = [];
  parts.forEach((part, index) => {
    if (index % 2 === 1) {
      nodes.push(
        <strong key={index} style={{ fontWeight: 600 }}>
          {part}
        </strong>
      );
    } else if (part) {
      nodes.push(<span key={index}>{part}</span>);
    }
  });

  return nodes;
}

function getPrimaryActionHint(result: AnalysisResult): string {
  if (result.status === "FAIL") {
    return "Start by fixing 2–3 Experience bullets that mention the top missing keywords.";
  }
  if (result.status === "MODERATE") {
    return "Focus on adding 3–5 missing high‑priority keywords and 1–2 strong metrics.";
  }
  return "Polish 1–2 bullets with metrics or business impact to make this resume stand out.";
}

const MIN_JD_CHARS = 80;
const MIN_RESUME_CHARS = 150;

export default function ATSAnalyzerCard() {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  async function handleResumeFile(file: File) {
    setUploadError(null);

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please upload a PDF file (DOCX not supported yet).");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/ats/upload-resume", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data?.error) {
        setUploadError(data?.error || "Failed to read resume file.");
        return;
      }

      if (typeof data.text === "string" && data.text.trim().length > 0) {
        setResumeText(data.text);
        setUploadedFileName(file.name);
      } else {
        setUploadError("Could not extract text from this resume file.");
      }
    } catch (e) {
      console.error(e);
      setUploadError("Something went wrong while uploading the resume.");
    } finally {
      setUploading(false);
      setIsDragOver(false);
    }
  }

  async function handleAnalyze() {
    // Clear previous error and result
    setError(null);
    setResult(null);

    const jd = jobDescription.trim();
    const resume = resumeText.trim();

    const hasJD = jd.length > 0;
    const hasResume = resume.length > 0;

    // Nothing provided at all
    if (!hasJD && !hasResume) {
      setError(
        "Please upload the resume or paste the resume text and paste the job description."
      );
      setResult(null);
      return;
    }

    // Only JD missing
    if (!hasJD) {
      setError("Please paste the job description.");
      setResult(null);
      return;
    }

    // Only resume missing
    if (!hasResume) {
      setError("Please upload or paste your resume text.");
      setResult(null);
      return;
    }

    // JD is present but too short → treat as not valid, use combined message
    if (jd.length < MIN_JD_CHARS) {
      setError(
        "Please upload the resume or paste the resume text and paste the job description."
      );
      setResult(null);
      return;
    }

    if (resume.length < MIN_RESUME_CHARS) {
      setError(
        `Resume text is too short. Please provide at least ${MIN_RESUME_CHARS} characters.`
      );
      setResult(null);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/ats/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jd, resumeText: resume }),
      });

      const data = await res.json();

      if (!res.ok || data?.error) {
        setError(data?.error || "Analysis failed. Please try again.");
        setResult(null);
        return;
      }

      const safeResult: AnalysisResult = {
        finalScore: data.finalScore ?? 0,
        status: data.status ?? "FAIL",

        keywordScore: data.keywordScore ?? 0,
        requiredScore: data.requiredScore ?? 0,
        experienceScore: data.experienceScore ?? 0,
        contextScore: data.contextScore ?? 0,
        formattingScore: data.formattingScore ?? 0,

        targetKeywordScore: data.targetKeywordScore ?? 0,
        targetRequiredScore: data.targetRequiredScore ?? 0,
        targetExperienceScore: data.targetExperienceScore ?? 0,
        targetContextScore: data.targetContextScore ?? 0,
        targetFormattingScore: data.targetFormattingScore ?? 0,

        matchedKeywords: Array.isArray(data.matchedKeywords)
          ? data.matchedKeywords
          : [],
        missingHighPriorityKeywords: Array.isArray(
          data.missingHighPriorityKeywords
        )
          ? data.missingHighPriorityKeywords
          : [],

        gapSummary: data.gapSummary ?? "",
        bulletSuggestions: Array.isArray(data.bulletSuggestions)
          ? data.bulletSuggestions
          : [],
        rewriteSuggestions: Array.isArray(data.rewriteSuggestions)
          ? data.rewriteSuggestions
          : [],
      };

      setResult(safeResult);
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: Status) {
    if (status === "PASS") return "#16a34a";
    if (status === "MODERATE") return "#eab308";
    return "#dc2626";
  }

  const uploadBorderColor = isDragOver
    ? "#2563eb"
    : uploading
    ? "#4b5563"
    : "#d1d5db";
  const uploadBackground = isDragOver
    ? "rgba(37, 99, 235, 0.06)"
    : uploading
    ? "rgba(15, 23, 42, 0.04)"
    : "#f9fafb";

  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600 }}>ATS Analyzer</h2>
      <p style={{ fontSize: 13, color: "#6b7280" }}>
        Paste a job description, then upload or drag and drop your resume.
        The analyzer will score how well your resume matches the job and show
        exactly what to rewrite.
      </p>

      {/* Layout: larger upload box on the left, inputs on the right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(340px, 460px) minmax(0, 1fr)",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {/* Large drag & drop upload box */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleResumeFile(e.dataTransfer.files[0]);
            }
          }}
          style={{
            border: `2px dashed ${uploadBorderColor}`,
            borderRadius: 16,
            padding: 24,
            minHeight: 260,
            width: "100%",
            background: uploadBackground,
            fontSize: 13,
            color: "#374151",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition:
              "border-color 150ms ease, background-color 150ms ease, transform 150ms ease, box-shadow 150ms ease",
            transform:
              isDragOver || uploading ? "scale(1.03)" : "scale(1.0)",
            boxShadow:
              isDragOver || uploading
                ? "0 10px 24px rgba(15, 23, 42, 0.18)"
                : "0 2px 8px rgba(15, 23, 42, 0.06)",
            cursor: "pointer",
          }}
          onClick={() => {
            const input = document.getElementById(
              "ats-resume-file-input"
            ) as HTMLInputElement | null;
            if (input) input.click();
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "9999px",
              background:
                isDragOver || uploading ? "#2563eb" : "rgba(37, 99, 235, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isDragOver || uploading ? "white" : "#2563eb",
              fontSize: 18,
              fontWeight: 700,
              transform: isDragOver ? "translateY(-2px)" : "none",
              transition: "all 150ms ease",
            }}
          >
            ⬆
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Drag & drop your resume (PDF)
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {uploading
                ? "Reading your resume, please wait..."
                : "Or click anywhere in this box to browse a file."}
            </div>
          </div>
          {uploadedFileName && !uploading && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#16a34a",
                textAlign: "center",
              }}
            >
              Loaded: <strong>{uploadedFileName}</strong>
            </div>
          )}
        </div>

        {/* Hidden input for click-to-browse */}
        <input
          id="ats-resume-file-input"
          type="file"
          accept=".pdf"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleResumeFile(file);
            }
          }}
        />

        {/* Right side: JD and Resume text boxes */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Job Description
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={6}
              placeholder="Paste the job description here..."
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 13,
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>
              Resume Text
            </label>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={6}
              placeholder="Upload a PDF or paste your resume text here..."
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 13,
                resize: "vertical",
              }}
            />
          </div>
        </div>
      </div>

      {uploadError && (
        <p style={{ color: "#dc2626", fontSize: 12, textAlign: "left" }}>
          {uploadError}
        </p>
      )}

      {error && (
        <p style={{ color: "#dc2626", fontSize: 13, textAlign: "left" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={loading || uploading}
        style={{
          alignSelf: "flex-start",
          marginTop: 4,
          padding: "8px 16px",
          borderRadius: 8,
          border: "none",
          background: loading || uploading ? "#9ca3af" : "#2563eb",
          color: "white",
          fontWeight: 600,
          fontSize: 14,
          cursor: loading || uploading ? "not-allowed" : "pointer",
          transition: "background-color 150ms ease, transform 150ms ease",
        }}
      >
        {loading ? "Analyzing..." : uploading ? "Uploading..." : "Analyze"}
      </button>

      {result && !error && (
        <div
          style={{
            marginTop: 8,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                ATS Score
              </p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
                {result.finalScore}%
              </p>
            </div>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 600,
                color: "white",
                background: getStatusColor(result.status),
              }}
            >
              {result.status}
            </span>
          </div>

          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 12,
              color: "#6b7280",
            }}
          >
            {result.status === "PASS" &&
              "PASS: Strong match for this job. You can still polish a few bullets and metrics."}
            {result.status === "MODERATE" &&
              "MODERATE: Partial match. Add missing keywords and rewrite a few bullets before applying."}
            {result.status === "FAIL" &&
              "FAIL: Major gaps vs this job. Rewrite key sections with the missing skills before applying."}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 8,
              fontSize: 12,
            }}
          >
            <ScoreItem
              label="Keyword match"
              actual={result.keywordScore}
              target={result.targetKeywordScore}
            />
            <ScoreItem
              label="Required skills"
              actual={result.requiredScore}
              target={result.targetRequiredScore}
            />
            <ScoreItem
              label="Experience match"
              actual={result.experienceScore}
              target={result.targetExperienceScore}
            />
            <ScoreItem
              label="Context"
              actual={result.contextScore}
              target={result.targetContextScore}
            />
            <ScoreItem
              label="Formatting"
              actual={result.formattingScore}
              target={result.targetFormattingScore}
            />
          </div>

          {result.gapSummary && (
            <div>
              <p
                style={{
                  margin: 0,
                  marginBottom: 4,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                How your resume compares for this job
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "#4b5563" }}>
                {result.gapSummary}
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <p
                style={{
                  margin: 0,
                  marginBottom: 4,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Matched Keywords
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "#4b5563" }}>
                {result.matchedKeywords.length
                  ? result.matchedKeywords.join(", ")
                  : "None detected"}
              </p>
            </div>

            <div style={{ flex: 1, minWidth: 180 }}>
              <p
                style={{
                  margin: 0,
                  marginBottom: 4,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Missing High‑Priority Keywords
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "#4b5563" }}>
                {result.missingHighPriorityKeywords.length
                  ? result.missingHighPriorityKeywords.join(", ")
                  : "No major gaps detected"}
              </p>
            </div>
          </div>

          {result.bulletSuggestions.length > 0 && (
            <div>
              <p
                style={{
                  margin: 0,
                  marginBottom: 4,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                What to change to move towards a pass
              </p>
              <p
                style={{
                  margin: 0,
                  marginBottom: 4,
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                {getPrimaryActionHint(result)}
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {result.bulletSuggestions.map((s, idx) => (
                  <li key={idx}>{renderWithBoldMarkers(s)}</li>
                ))}
              </ul>
            </div>
          )}

          {result.rewriteSuggestions.length > 0 && (
            <div>
              <p
                style={{
                  margin: 0,
                  marginBottom: 4,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Sentence‑level suggestions
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                {result.rewriteSuggestions.map((r, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 8,
                      borderRadius: 6,
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        marginBottom: 4,
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      Target section: {r.targetSection} · Keyword:{" "}
                      <strong>{r.keyword}</strong>
                    </p>
                    {r.originalSnippet && (
                      <p style={{ margin: 0, marginBottom: 4 }}>
                        Current: {r.originalSnippet}
                      </p>
                    )}
                    <p style={{ margin: 0 }}>
                      Suggested: {renderWithBoldMarkers(r.suggestedRewrite)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreItem({
  label,
  actual,
  target,
}: {
  label: string;
  actual: number;
  target: number;
}) {
  return (
    <div>
      <p style={{ margin: 0, color: "#6b7280" }}>{label}</p>
      <p style={{ margin: 0, fontWeight: 600 }}>
        {actual}%{" "}
        <span style={{ color: "#9ca3af", fontWeight: 400 }}>
          (target ~{target}%)
        </span>
      </p>
    </div>
  );
}
