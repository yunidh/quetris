"use client";
import QuizCarousel from "@/components/quizCarousel";
import { fetchQuizData, QuizData } from "@/lib/quizService";
import { useEffect, useState, useCallback } from "react";

// Combined state type for cleaner state management
type AppState = {
  data: QuizData | null;
  loading: boolean;
  error: string | null;
};

// Reusable centered container for loading and error states
function CenteredContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      {children}
    </div>
  );
}

// Loading component
function QuizLoading() {
  return (
    <CenteredContainer>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4" />
      <p className="text-white">Loading quiz data...</p>
    </CenteredContainer>
  );
}

// Error component with retry functionality
function QuizError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <CenteredContainer>
      <p className="text-red-400 mb-4">Failed to load quiz data</p>
      <p className="text-white text-sm mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="bg-white text-black px-4 py-2 rounded hover:bg-gray-200 transition-colors"
      >
        Retry
      </button>
    </CenteredContainer>
  );
}

export default function Home() {
  const [state, setState] = useState<AppState>({
    data: null,
    loading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchQuizData();

      if (!data.levels?.length) {
        throw new Error(
          "No quiz levels found in database. Please check your Supabase setup."
        );
      }

      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderContent = () => {
    if (state.loading) return <QuizLoading />;
    if (state.error)
      return <QuizError error={state.error} onRetry={loadData} />;
    if (!state.data)
      return <QuizError error="No data available" onRetry={loadData} />;
    return <QuizCarousel quizData={state.data} />;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <h1 className="font-doto font-extrabold text-7xl text-center mt-4 text-white absolute top-0">
        Quetris
      </h1>
      <div className="flex-1 flex items-center justify-center w-full">
        {renderContent()}
      </div>
    </div>
  );
}
