import QuizCarousel from "@/components/quizCarousel";
import { fetchQuizData, QuizData } from "@/lib/quizService";
import { Suspense } from "react";

// Loading component for better UX
function QuizLoading() {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
      <p className="text-white">Loading quiz data...</p>
    </div>
  );
}

// Error component for error handling
function QuizError({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <p className="text-red-400 mb-4">Failed to load quiz data</p>
      <p className="text-white text-sm">{error}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 bg-white text-black px-4 py-2 rounded hover:bg-gray-200"
      >
        Retry
      </button>
    </div>
  );
}

// Main quiz component that fetches data
async function QuizWithData() {
  try {
    const quizData: QuizData = await fetchQuizData();

    // Validate that we have data
    if (!quizData.levels || quizData.levels.length === 0) {
      throw new Error("No quiz levels found in database");
    }

    return <QuizCarousel quizData={quizData} />;
  } catch (error) {
    console.error("Error loading quiz data:", error);
    return (
      <QuizError
        error={error instanceof Error ? error.message : "Unknown error"}
      />
    );
  }
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <h1 className="font-doto font-extrabold text-7xl text-center mt-4 text-white absolute top-0">
        Quetris
      </h1>
      <div className="flex-1 flex items-center justify-center w-full">
        <Suspense fallback={<QuizLoading />}>
          <QuizWithData />
        </Suspense>
      </div>
    </div>
  );
}
