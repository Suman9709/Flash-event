import axios from "axios";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { studentLogin } from "../api/studentApi";

function getLoginErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? "Unable to connect to the result service.";
  }

  return "Something went wrong. Please try again.";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [rollNumber, setRollNumber] = useState("");
  const [dob, setDob] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await studentLogin(rollNumber.trim(), dob);
      navigate("/result");
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900 sm:grid sm:place-items-center">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-950/40 md:grid-cols-[1.05fr_0.95fr]">
        <div className="bg-linear-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 text-white sm:p-12">
          <p className="mb-10 inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase">
            Student portal
          </p>
          <h1 className="max-w-sm text-4xl leading-tight font-bold sm:text-5xl">
            Your results, securely in one place.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-indigo-100">
            Sign in with your roll number and date of birth to view your personal academic result.
          </p>
        </div>

        <div className="p-8 sm:p-12">
          <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">Enter the details used by your institution.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-slate-700">
              Roll number
              <input
                autoComplete="username"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                disabled={isSubmitting}
                onChange={(event) => setRollNumber(event.target.value)}
                placeholder="e.g. STU001"
                required
                value={rollNumber}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Date of birth
              <input
                autoComplete="bday"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                disabled={isSubmitting}
                onChange={(event) => setDob(event.target.value)}
                required
                type="date"
                value={dob}
              />
            </label>

            {errorMessage && (
              <p aria-live="polite" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            <button
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-indigo-300"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Signing in..." : "View my result"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
