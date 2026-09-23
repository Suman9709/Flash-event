import type { StudentResult } from "../api/studentApi";

type ResultCardProps = {
  result: StudentResult;
};

const subjects: Array<{ key: keyof Pick<StudentResult, "english" | "physics" | "chemistry" | "math" | "hindi">; label: string }> = [
  { key: "english", label: "English" },
  { key: "physics", label: "Physics" },
  { key: "chemistry", label: "Chemistry" },
  { key: "math", label: "Mathematics" },
  { key: "hindi", label: "Hindi" },
];

function formatMark(mark: number | string): string {
  return Number(mark).toFixed(2).replace(/\.00$/, "");
}

export default function ResultCard({ result }: ResultCardProps) {
  const percentage = Number(result.percentage);

  return (
    <article className="result-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
      <header className="bg-linear-to-r from-indigo-600 to-violet-700 px-6 py-7 text-white sm:px-8">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-indigo-100">Academic result</p>
        <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold">{result.name}</h2>
            <p className="mt-1 text-indigo-100">Roll number: {result.rollNumber}</p>
          </div>
          <div className="rounded-xl bg-white/15 px-4 py-2 text-center backdrop-blur-sm">
            <p className="text-xs text-indigo-100">Percentage</p>
            <p className="text-2xl font-bold">{percentage.toFixed(2)}%</p>
          </div>
        </div>
      </header>

      <div className="p-6 sm:p-8">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Subject</th>
                <th className="px-4 py-3 text-right font-semibold">Marks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.map((subject) => (
                <tr key={subject.key}>
                  <td className="px-4 py-3 text-slate-700">{subject.label}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMark(result[subject.key])}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-indigo-50 text-indigo-950">
              <tr>
                <th className="px-4 py-4 text-left text-base">Total marks</th>
                <td className="px-4 py-4 text-right text-base font-bold">{formatMark(result.totalMarks)} / 500</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </article>
  );
}
