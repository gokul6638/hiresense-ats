// app/api/ats/resumes/route.ts
import { NextResponse } from "next/server";

type AtsResume = {
  id: string;
  label: string;
  text: string;
};

export async function GET() {
  try {
    // TODO: Replace this mock list with your real DB query.
    const resumes: AtsResume[] = [
      {
        id: "res-1",
        label: "Logistics Resume - 3 years",
        text: "Full logistics resume text goes here...",
      },
      {
        id: "res-2",
        label: "Frontend Resume - 2 years",
        text: "Full frontend resume text goes here...",
      },
    ];

    return NextResponse.json(resumes);
  } catch (error) {
    console.error("Error fetching ATS resumes:", error);
    return NextResponse.json(
      { error: "Failed to load resumes for ATS analyzer." },
      { status: 500 }
    );
  }
}
