// app/dashboard/ATSAnalyzerCard.tsx
"use client";

import { useState } from "react";

type AnalysisResult = {
  score: number;
  status: "PASS" | "MODERATE" | "FAIL";
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
};

export default function ATSAnalyzerCard() {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setError(null);
    setResult(null);

    if (!jobDescription.trim() || !resumeText.trim()) {
      setError("Please enter both job description and resume text.");
      return;
    }

    setLoading(true);

    try {
      // For now, we will call a placeholder API that we'll implement next.
      const res = await fetch("/api/ats/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, resumeText }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Analysis failed. Please try again.");
      } else {
        setResult(data as AnalysisResult);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: AnalysisResult["status"]) {
    if (status === "PASS") return "#16a34a"; // green
    if (status === "MODERATE") return "#eab308"; // yellow
    return "#dc2626"; // red
  }

  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600 }}>ATS Analyzer</h2>
      <p style={{ fontSize: 13, color: "#6b7280" }}>
        Paste a job description and resume text. Later we will enable PDF/DOCX
        upload and advanced scoring.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 500 }}>
          Job Description
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={5}
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

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 500 }}>Resume Text</label>
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={5}
          placeholder="Paste your resume text here (we'll add file upload soon)..."
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

      {error && (
        <p style={{ color: "#dc2626", fontSize: 13, textAlign: "left" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={loading}
        style={{
          alignSelf: "flex-start",
          marginTop: 4,
          padding: "8px 16px",
          borderRadius: 8,
          border: "none",
          background: loading ? "#9ca3af" : "#2563eb",
          color: "white",
          fontWeight: 600,
          fontSize: 14,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Analyzing..." : "Analyze"}
      </button>

      {result && (
        <div
          style={{
            marginTop: 8,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            display: "flex",
            flexDirection: "column",
            gap: 8,
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
                {result.score}%
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
                  : "None"}
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
                Missing Keywords
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "#4b5563" }}>
                {result.missingKeywords.length
                  ? result.missingKeywords.join(", ")
                  : "None"}
              </p>
            </div>
          </div>

          {result.suggestions.length > 0 && (
            <div>
              <p
                style={{
                  margin: 0,
                  marginBottom: 4,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Suggestions
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {result.suggestions.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
