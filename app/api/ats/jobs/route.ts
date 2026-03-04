// app/api/ats/jobs/route.ts
import { NextResponse } from "next/server";

type AtsJob = {
  id: string;
  title: string;
  description: string;
};

export async function GET() {
  try {
    // TODO: Replace this mock list with your real DB query.
    const jobs: AtsJob[] = [
      {
        id: "job-1",
        title: "Logistics Coordinator",
        description:
          "Full logistics coordinator job description text goes here...",
      },
      {
        id: "job-2",
        title: "Frontend Developer",
        description:
          "Full frontend developer job description text goes here...",
      },
    ];

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error fetching ATS jobs:", error);
    return NextResponse.json(
      { error: "Failed to load jobs for ATS analyzer." },
      { status: 500 }
    );
  }
}
