export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-14">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">HireSense ATS</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Applicant Tracking System Analyzer
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Paste a job description, upload a resume, and get an ATS score with
              matched and missing keywords.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-slate-500">Status</p>
            <p className="mt-1 text-sm font-semibold text-emerald-600">
              Local dev running
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold">Analyze</p>
            <p className="mt-2 text-sm text-slate-600">
              Upload PDF/DOCX + job description.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold">Score</p>
            <p className="mt-2 text-sm text-slate-600">
              Green / Yellow / Red indicator.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold">Improve</p>
            <p className="mt-2 text-sm text-slate-600">
              What to add/remove + formatting warnings.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
