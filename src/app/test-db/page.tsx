"use client";
import { useState } from "react";
import { fetchQuizData } from "@/lib/quizService";

export default function DatabaseTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleTestFetch = async () => {
    setLoading(true);
    setResult("");
    try {
      const data = await fetchQuizData();
      setResult(
        `✅ Fetch successful! Found ${
          data.levels.length
        } levels with ${data.levels.reduce(
          (total, level) => total + level.questions.length,
          0
        )} questions total`
      );
    } catch (error) {
      setResult(
        `❌ Fetch error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Database Test Page</h1>

      <div className="space-y-4 max-w-2xl">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Supabase Connection Test</h2>

          <div className="space-y-4">
            <button
              onClick={handleTestFetch}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg"
            >
              {loading ? "Working..." : "Test Data Fetch"}
            </button>
          </div>

          {result && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <pre className="text-sm">{result}</pre>
            </div>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-3">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>
              Make sure your Supabase tables are created with the correct schema
              and populated with data
            </li>
            <li>Click "Test Data Fetch" to verify the data can be retrieved</li>
            <li>
              Once it works, go back to the main quiz to test with Supabase data
            </li>
          </ol>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-3">Expected Database Schema:</h3>
          <div className="text-sm space-y-4">
            <div>
              <h4 className="font-bold text-blue-400">levels table:</h4>
              <ul className="list-disc list-inside ml-4">
                <li>id (serial, primary key)</li>
                <li>title (text)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-green-400">questions table:</h4>
              <ul className="list-disc list-inside ml-4">
                <li>id (serial, primary key)</li>
                <li>level_id (int, foreign key → levels.id)</li>
                <li>question (text)</li>
                <li>options (jsonb array)</li>
                <li>answer (text)</li>
                <li>difficulty (int)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
