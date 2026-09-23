import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { studentLogout, studentResult, type StudentResult } from "../api/studentApi";
import ResultCard from "../component/ResultCard";

function getResultErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? "Unable to load your result right now.";
  }

  return "Something went wrong. Please try again.";
}

export default function ResultPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<StudentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadResult() {
      try {
        const response = await studentResult();

        if (isMounted) {
          setResult(response);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (axios.isAxiosError(error) && error.response?.status === 401) {
          navigate("/", { replace: true });
          return;
        }

        setErrorMessage(getResultErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadResult();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await studentLogout();
    } finally {
      navigate("/", { replace: true });
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="no-print mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold tracking-[0.16em] text-indigo-600 uppercase">Student portal</p>
            <h1 className="mt-1 text-3xl font-bold">My result</h1>
          </div>
          <div className="flex gap-3">
            <button
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed"
              disabled={!result}
              onClick={() => window.print()}
              type="button"
            >
              Print result
            </button>
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
              type="button"
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </header>

        {isLoading && (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">Loading your result...</div>
        )}

        {!isLoading && errorMessage && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-red-700">{errorMessage}</p>
            <button
              className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => window.location.reload()}
              type="button"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && result && <ResultCard result={result} />}
      </div>
    </main>
  );
}
