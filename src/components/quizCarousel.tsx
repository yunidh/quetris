"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import data from "./data.json";

// Types for quiz data structure
type Question = {
  id: number;
  question: string;
  options: string[];
  answer: string;
};

type Level = {
  id: number;
  title: string;
  questions: Question[];
};

type QuizData = {
  levels: Level[];
};

type FallingOption = {
  text: string;
  col: number;
  row: number;
  key: string;
};

type CaughtState = { correct: boolean; option: string } | null;

// Configuration constants
const GRID_COLS = 4;
const GRID_ROWS = 15;
const FALL_INTERVAL = 300;
const SWIPE_THRESHOLD = 50;

// Props interface for external data integration
interface QuizCarouselProps {
  quizData?: QuizData; // Optional external data
  onLevelComplete?: (levelId: number, score: number) => void; // Callback for level completion
  onQuestionAnswer?: (questionId: number, correct: boolean) => void; // Callback for question answers
  isLoading?: boolean; // External loading state
}

export default function QuizCarousel({
  quizData,
  onLevelComplete,
  onQuestionAnswer,
  isLoading: externalLoading = false,
}: QuizCarouselProps = {}) {
  // Use external data if provided, otherwise fall back to local data
  const gameData = useMemo(() => quizData || (data as QuizData), [quizData]);

  const [started, setStarted] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [fallingOptions, setFallingOptions] = useState<FallingOption[]>([]);
  const [catcherCol, setCatcherCol] = useState(1);
  const [caught, setCaught] = useState<CaughtState>(null);
  const [retry, setRetry] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [gridAnimating, setGridAnimating] = useState(false);
  const [canStartFalling, setCanStartFalling] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);

  // Refs for performance optimization
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartY = useRef<number | null>(null);
  const catcherColRef = useRef(1);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update ref when catcherCol changes
  useEffect(() => {
    catcherColRef.current = catcherCol;
  }, [catcherCol]);

  // Current level and question data with null safety
  const currentLevelData = useMemo(() => {
    return gameData.levels[currentLevel] || null;
  }, [gameData, currentLevel]);

  const currentQuestion = useMemo(() => {
    return currentLevelData?.questions[questionIdx] || null;
  }, [currentLevelData, questionIdx]);

  // Memoize constants
  const maxLevel = useMemo(() => gameData.levels.length - 1, [gameData]);

  // Handle external loading state
  const isActuallyLoading = isLoading || externalLoading;

  // Handle correct/incorrect answers with callback
  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (!currentQuestion) return;

      // Call external callback if provided
      onQuestionAnswer?.(currentQuestion.id, correct);

      if (correct) {
        setScore((prev) => prev + 1);

        // Check if this is the last question
        if (questionIdx === currentLevelData!.questions.length - 1) {
          setCompleted(true);
          // Call level completion callback
          onLevelComplete?.(currentLevel, score + 1);
        } else {
          setQuestionIdx((prev) => prev + 1);
          resetFallingOptions();
        }
      } else {
        setRetry(true);
        resetFallingOptions();
      }
    },
    [
      currentQuestion,
      currentLevelData,
      questionIdx,
      currentLevel,
      score,
      onQuestionAnswer,
      onLevelComplete,
    ]
  );

  // Clean reset function
  const resetGame = useCallback(() => {
    setQuestionIdx(0);
    setRetry(false);
    setCaught(null);
    setCatcherCol(1);
    catcherColRef.current = 1;
    setFallingOptions([]);
    setIsLoading(false);
    setShowGrid(false);
    setGridAnimating(false);
    setCanStartFalling(false);
    setCompleted(false);
    setScore(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (cleanupIntervalRef.current) clearInterval(cleanupIntervalRef.current);
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
  }, []);

  // Reset only falling options (for question changes, not full reset)
  const resetFallingOptions = useCallback(() => {
    setFallingOptions([]);
    setCaught(null);
    setRetry(false);
    setCatcherCol(1);
    catcherColRef.current = 1;
    setCanStartFalling(false);
    // Keep showGrid and gridAnimating as they are - don't reset them
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (cleanupIntervalRef.current) clearInterval(cleanupIntervalRef.current);
  }, []);

  // Shuffle array utility
  const shuffle = (array: number[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Utility to create new falling options
  const createFallingOptions = (
    qIdx: number,
    levelIdx: number
  ): FallingOption[] => {
    const availableColumns = shuffle(
      Array.from({ length: GRID_COLS }, (_, i) => i)
    );
    return data.levels[levelIdx].questions[qIdx].options.map((opt, index) => ({
      text: opt,
      col: availableColumns[index],
      row: 0,
      key: `${levelIdx}-${qIdx}-${opt}-${Date.now()}-${index}`,
    }));
  };

  // Unified function to load options with different behaviors
  const loadOptions = async (
    qIdx: number,
    levelIdx: number,
    isFirstQuestion = false
  ): Promise<void> => {
    if (isFirstQuestion) {
      setIsLoading(true);
      setShowGrid(false);
    }
    setCanStartFalling(false);
    setFallingOptions([]);

    return new Promise<void>((resolve) => {
      const updateOptions = () => {
        const newOptions = createFallingOptions(qIdx, levelIdx);
        setFallingOptions(newOptions);

        requestAnimationFrame(() => {
          if (isFirstQuestion) {
            setIsLoading(false);
            setShowGrid(true);
            setGridAnimating(true);
            setTimeout(() => {
              setGridAnimating(false);
              setCanStartFalling(true);
            }, 500);
          } else {
            setCanStartFalling(true);
          }
          resolve();
        });
      };

      // Use double RAF only for complex state changes, single RAF for simple ones
      if (isFirstQuestion) {
        requestAnimationFrame(() => requestAnimationFrame(updateOptions));
      } else {
        requestAnimationFrame(updateOptions);
      }
    });
  };

  // Clear options when level changes or game exits
  useEffect(() => {
    if (!started) {
      setFallingOptions([]);
    }
  }, [currentLevel, started]);

  // Start quiz
  const startQuiz = useCallback(async () => {
    setStarted(true);
    resetGame();
    await loadOptions(0, currentLevel, true); // First question gets animation
  }, [currentLevel, resetGame]);

  // Level navigation functions
  const goToPrevLevel = useCallback(() => {
    setCurrentLevel((level) => Math.max(0, level - 1));
  }, []);

  const goToNextLevel = useCallback(() => {
    setCurrentLevel((level) => Math.min(maxLevel, level + 1));
  }, [maxLevel]);

  // Catcher movement functions
  const moveCatcherLeft = useCallback(() => {
    setCatcherCol((c) => Math.max(0, c - 1));
  }, []);

  const moveCatcherRight = useCallback(() => {
    setCatcherCol((c) => Math.min(GRID_COLS - 1, c + 1));
  }, []);

  // Drop all falling options to the bottom instantly
  const dropOptions = useCallback(() => {
    if (!canStartFalling || caught) return;

    setFallingOptions((opts) =>
      opts.map((opt) => ({ ...opt, row: GRID_ROWS - 1 }))
    );
  }, [canStartFalling, caught]);

  // Touch event handlers for mobile swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return;

      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchEndY - touchStartY.current;

      // Swipe down (positive deltaY) with minimum distance
      if (deltaY > SWIPE_THRESHOLD) {
        dropOptions();
      }

      touchStartY.current = null;
    },
    [dropOptions]
  );

  // Game loop: Move options down, check for catch, cleanup
  useEffect(() => {
    if (!started || caught || retry || isLoading || !canStartFalling) return;

    // Move options down
    intervalRef.current = setInterval(() => {
      setFallingOptions((opts) => opts.map((o) => ({ ...o, row: o.row + 1 })));
    }, FALL_INTERVAL);

    // Check for catches and cleanup in a single interval
    cleanupIntervalRef.current = setInterval(() => {
      setFallingOptions((opts) => {
        let caughtOption: CaughtState = null;

        // Check for catch and filter out off-screen options in one pass
        const updatedOptions = opts.filter((opt) => {
          if (
            opt.row >= GRID_ROWS - 1 &&
            opt.col === catcherColRef.current &&
            !caughtOption
          ) {
            const correct = opt.text === currentQuestion?.answer;
            caughtOption = { correct, option: opt.text };
            return false; // Remove caught option
          }
          return opt.row < GRID_ROWS; // Remove off-screen options
        });

        // Set caught state if we found one
        if (caughtOption) {
          setCaught(caughtOption);
        }

        return updatedOptions;
      });
    }, FALL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (cleanupIntervalRef.current) clearInterval(cleanupIntervalRef.current);
    };
  }, [
    started,
    caught,
    retry,
    isLoading,
    canStartFalling,
    currentQuestion?.answer,
  ]);

  // Game progression functions
  const nextQuestion = useCallback(async () => {
    const nextIdx = questionIdx + 1;
    if (nextIdx < data.levels[currentLevel].questions.length) {
      setQuestionIdx(nextIdx);
      resetFallingOptions();
      await loadOptions(nextIdx, currentLevel);
    } else {
      // All questions completed
      setCompleted(true);
    }
  }, [questionIdx, currentLevel, resetFallingOptions]);

  const goBackToLevelSelect = useCallback(() => {
    setStarted(false);
    setCompleted(false);
    resetGame();
  }, [resetGame]);

  const retryQuestion = useCallback(async () => {
    resetFallingOptions();
    await loadOptions(questionIdx, currentLevel);
  }, [questionIdx, currentLevel, resetFallingOptions]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (!started) startQuiz();
        else if (completed) goBackToLevelSelect();
        else if (caught) caught.correct ? nextQuestion() : retryQuestion();
      } else if (e.key === "Escape" && started) {
        setStarted(false);
        resetGame();
      } else if (!started) {
        if (e.key === "ArrowLeft") goToPrevLevel();
        if (e.key === "ArrowRight") goToNextLevel();
      } else if (!caught && !retry && !isLoading) {
        if (e.key === "ArrowLeft") moveCatcherLeft();
        if (e.key === "ArrowRight") moveCatcherRight();
        if (e.key === "ArrowDown") dropOptions();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    started,
    caught,
    retry,
    isLoading,
    completed,
    startQuiz,
    nextQuestion,
    retryQuestion,
    resetGame,
    goToPrevLevel,
    goToNextLevel,
    moveCatcherLeft,
    moveCatcherRight,
    goBackToLevelSelect,
    dropOptions,
  ]);

  // Render grid
  return (
    <div className="flex flex-col items-center justify-center h-full w-full font-code gap-8 px-2 sm:px-[5vw] md:px-[10vw]">
      {!started ? (
        <>
          <div className="text-center">
            <text className="text-2xl font-bold text-white">
              {data.levels[currentLevel].title}
            </text>
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                className={`px-4 py-2 rounded font-code text-lg ${
                  currentLevel === 0
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-white text-black hover:bg-gray-200"
                }`}
                onClick={goToPrevLevel}
                disabled={currentLevel === 0}
              >
                ← Prev
              </button>

              <span className="text-white text-lg">
                {currentLevel + 1} / {data.levels.length}
              </span>

              <button
                className={`px-4 py-2 rounded font-code text-lg ${
                  currentLevel === maxLevel
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-white text-black hover:bg-gray-200"
                }`}
                onClick={goToNextLevel}
                disabled={currentLevel === maxLevel}
              >
                Next →
              </button>
            </div>
          </div>

          <button
            className="bg-black text-white px-8 py-3 rounded font-code text-2xl shadow border-2 border-white"
            onClick={startQuiz}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Play"}
          </button>
        </>
      ) : completed ? (
        <div className="flex flex-col items-center w-full">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-green-400 mb-4">
              Completed!
            </h2>
            <p className="text-white text-lg mb-6">
              You've finished all questions in {data.levels[currentLevel].title}
              !
            </p>
          </div>

          <button
            className="bg-green-600 text-white px-8 py-3 rounded font-code text-2xl shadow border-2 border-white hover:bg-green-700"
            onClick={goBackToLevelSelect}
          >
            Back to Level Select
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full">
          <div className="mb-4 text-3xl font-bold text-center font-code text-white">
            {data.levels[currentLevel].questions[questionIdx].question}
          </div>

          {isLoading ? (
            <></>
          ) : showGrid ? (
            <div
              className={`relative border border-white rounded-lg bg-black overflow-hidden w-full sm:w-[90vw] md:w-[80vw] ${
                gridAnimating ? "animate-slide-down" : ""
              }`}
              style={{
                height: "60vh",
                minHeight: "400px",
                padding: "4px",
                animation: gridAnimating
                  ? "slideDown 0.5s ease-out forwards"
                  : undefined,
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Falling options */}
              {fallingOptions.map((opt) => {
                const colWidth = 25;
                const rowHeight = 100 / GRID_ROWS;
                return (
                  <div
                    key={opt.key}
                    className="absolute flex items-center justify-center font-code text-white select-none"
                    style={{
                      left: `${opt.col * colWidth}%`,
                      top: `${opt.row * rowHeight}%`,
                      width: `${colWidth}%`,
                      height: `${rowHeight}%`,
                      fontSize: "clamp(0.75rem, 3vw, 1.5rem)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      textAlign: "center",
                      padding: "2px",
                    }}
                  >
                    {opt.text}
                  </div>
                );
              })}

              {/* Column separators and clickable areas */}
              {Array.from({ length: GRID_COLS }, (_, index) => (
                <React.Fragment key={index}>
                  {index < GRID_COLS - 1 && (
                    <div
                      className="absolute bg-white opacity-30"
                      style={{
                        left: `${(index + 1) * 25}%`,
                        top: "0",
                        width: "2px",
                        height: "100%",
                        transform: "translateX(-1px)",
                      }}
                    />
                  )}
                  <div
                    className="absolute cursor-pointer transition-colors duration-200"
                    style={{
                      left: `${index * 25}%`,
                      top: "0",
                      width: "25%",
                      height: "100%",
                    }}
                    onMouseEnter={(e) => {
                      if (!caught && !retry && !isLoading) {
                        e.currentTarget.style.backgroundColor =
                          "rgba(255, 255, 255, 0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    onClick={() => {
                      if (!caught && !retry && !isLoading) setCatcherCol(index);
                    }}
                  />
                </React.Fragment>
              ))}

              {/* Catcher */}
              <div
                className={`absolute flex items-center justify-center font-code transition-colors duration-200 ${
                  caught
                    ? caught.correct
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                    : "bg-white text-black"
                }`}
                style={{
                  left: `${catcherCol * 25}%`,
                  bottom: "8px",
                  width: "25%",
                  height: "40px",
                  border: "2px solid #fff",
                  borderRadius: "20%",
                  fontSize: "clamp(0.75rem, 2.5vw, 1.2rem)",
                  zIndex: 10,
                }}
              >
                {caught ? (caught.correct ? "Correct!" : "Wrong!") : ""}
              </div>

              {/* Action buttons */}
              {caught && !caught.correct && (
                <button
                  className="absolute bg-red-600 text-white px-4 py-2 rounded font-code transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: "50%", top: "50%", zIndex: 10 }}
                  onClick={retryQuestion}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Retry"}
                </button>
              )}
              {caught && caught.correct && (
                <button
                  className="absolute bg-green-600 text-white px-4 py-2 rounded font-code transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: "50%", top: "50%", zIndex: 10 }}
                  onClick={nextQuestion}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Next Question"}
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}

      <div className=" text-white text-xs font-code text-center">
        {!started ? (
          <>
            Use <span className="font-bold">← →</span> arrows to browse levels |
            Press <span className="font-bold">Enter</span> to play
          </>
        ) : completed ? (
          <>
            Press <span className="font-bold">Enter</span> to return to level
            select
          </>
        ) : (
          <>
            Use <span className="font-bold">← →</span> or click to move the
            catcher | Press <span className="font-bold">↓</span> or swipe{" "}
            <span className="font-bold">Down</span> to drop options | Press{" "}
            <span className="font-bold">Enter</span> to play/retry/next | Press{" "}
            <span className="font-bold">Esc</span> to quit
          </>
        )}
      </div>
    </div>
  );
}
