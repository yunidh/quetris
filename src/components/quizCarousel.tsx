"use client";
import React, { useState, useEffect, useRef } from "react";
import data from "./data.json";

type FallingOption = {
  text: string;
  col: number;
  row: number;
  key: string;
};

type CaughtState = {
  correct: boolean;
  option: string;
} | null;

const GRID_COLS = 4;
const GRID_ROWS = 8;
// Make options fall slower: 4 seconds to reach bottom (8 rows)
const FALL_INTERVAL = 500; // ms per step (8 steps x 500ms = 4s)

function getRandomColumn() {
  return Math.floor(Math.random() * GRID_COLS);
}

export default function QuizCarousel() {
  const [started, setStarted] = useState<boolean>(false);
  const [questionIdx, setQuestionIdx] = useState<number>(0);
  const [fallingOptions, setFallingOptions] = useState<FallingOption[]>([]);
  const [catcherCol, setCatcherCol] = useState<number>(1);
  const [caught, setCaught] = useState<CaughtState>(null);
  const [retry, setRetry] = useState<boolean>(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const question = data[questionIdx];

  // Start quiz and reset state
  const startQuiz = () => {
    setStarted(true);
    setQuestionIdx(0);
    setRetry(false);
    setCaught(null);
    setCatcherCol(1);
    spawnOptions(0);
  };

  // Spawn options at top row, ensuring each gets a unique column
  const spawnOptions = (qIdx: number) => {
    // Create array of available columns [0, 1, 2, 3]
    const availableColumns = Array.from({ length: GRID_COLS }, (_, i) => i);

    // Shuffle the columns array to randomize assignment
    for (let i = availableColumns.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableColumns[i], availableColumns[j]] = [
        availableColumns[j],
        availableColumns[i],
      ];
    }

    const opts: FallingOption[] = data[qIdx].options.map(
      (opt: string, index: number) => ({
        text: opt,
        col: availableColumns[index], // Assign unique column to each option
        row: 0,
        key: `${opt}-${Math.random()}`,
      })
    );
    setFallingOptions(opts);
  };

  // Move options down at interval
  useEffect(() => {
    if (!started || caught || retry) return;
    intervalRef.current = setInterval(() => {
      setFallingOptions((opts: FallingOption[]) =>
        opts.map((o) => ({ ...o, row: o.row + 1 }))
      );
    }, FALL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [started, caught, retry]);

  // Check for catch
  useEffect(() => {
    if (!started || caught || retry) return;

    const checkForCatch = () => {
      fallingOptions.forEach((opt: FallingOption) => {
        if (opt.row >= GRID_ROWS - 1 && opt.col === catcherCol) {
          const correct = opt.text === question.answer;
          setCaught({ correct, option: opt.text });
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      });
    };

    checkForCatch();
  }, [fallingOptions, catcherCol, started, caught, retry, question]);

  // Clean up options that fell past the bottom
  useEffect(() => {
    if (!started || caught || retry) return;

    const cleanupOptions = () => {
      setFallingOptions((opts: FallingOption[]) =>
        opts.filter((o) => o.row < GRID_ROWS)
      );
    };

    const cleanupInterval = setInterval(cleanupOptions, FALL_INTERVAL);
    return () => clearInterval(cleanupInterval);
  }, [started, caught, retry]);

  // Keyboard controls for catcher and game actions
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Game controls with Enter key
      if (e.key === "Enter") {
        if (!started) {
          startQuiz();
        } else if (caught && !caught.correct) {
          retryQuestion();
        } else if (caught && caught.correct) {
          nextQuestion();
        }
        return;
      }

      // Catcher controls (only when game is active)
      if (!started || caught || retry) return;
      if (e.key === "ArrowLeft") setCatcherCol((c) => Math.max(0, c - 1));
      if (e.key === "ArrowRight")
        setCatcherCol((c) => Math.min(GRID_COLS - 1, c + 1));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [started, caught, retry]);

  // Next question
  const nextQuestion = () => {
    const nextIdx = (questionIdx + 1) % data.length;
    setQuestionIdx(nextIdx);
    setCaught(null);
    setRetry(false);
    setCatcherCol(1);
    spawnOptions(nextIdx);
  };

  // Retry current question
  const retryQuestion = () => {
    setCaught(null);
    setRetry(false);
    setCatcherCol(1);
    spawnOptions(questionIdx);
  };

  // Render grid
  return (
    <div className="flex flex-col items-center justify-center h-full w-full font-code px-[10vw]">
      {!started ? (
        <button
          className="bg-black text-white px-8 py-3 rounded font-code text-2xl shadow"
          onClick={startQuiz}
        >
          Play
        </button>
      ) : (
        <div className="flex flex-col items-center w-full">
          <div className="mb-4 text-3xl font-bold text-center font-code text-white">
            {question.question}
          </div>
          <div
            className="relative border border-white rounded-lg bg-black overflow-hidden"
            style={{
              width: "80vw",
              minWidth: "80vw",
              height: "60vh",
              minHeight: "400px",
              margin: "0 auto",
              padding: "16px",
            }}
          >
            {/* Falling options */}
            {fallingOptions.map((opt) => {
              // Calculate position using percentages for responsive grid
              const colWidth = 25; // 100% / 4 columns = 25% per column
              const rowHeight = 100 / GRID_ROWS; // Divide height equally among rows
              const left = `${opt.col * colWidth}%`;
              const top = `${opt.row * rowHeight}%`;
              const width = `${colWidth - 2}%`; // Slight margin between columns

              return (
                <div
                  key={opt.key}
                  className="absolute flex items-center justify-center font-code text-white select-none px-2 py-1"
                  style={{
                    left,
                    top,
                    width,
                    height: `${rowHeight}%`,
                    fontSize: "clamp(0.75rem, 2.5vw, 1.25rem)", // Responsive font size
                    wordBreak: "break-word",
                    overflow: "hidden",
                    textAlign: "center",
                  }}
                >
                  {opt.text}
                </div>
              );
            })}

            {/* Column separators */}
            {Array.from({ length: GRID_COLS - 1 }, (_, index) => (
              <div
                key={`separator-${index}`}
                className="absolute bg-white opacity-30"
                style={{
                  left: `${(index + 1) * 25}%`,
                  top: "0",
                  width: "2px",
                  height: "100%",
                  transform: "translateX(-1px)", // Center the line
                }}
              />
            ))}

            {/* Column clickable areas */}
            {Array.from({ length: GRID_COLS }, (_, colIndex) => (
              <div
                key={`column-${colIndex}`}
                className="absolute cursor-pointer transition-colors duration-200"
                style={{
                  left: `${colIndex * 25}%`,
                  top: "0",
                  width: "25%",
                  height: "100%",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  if (started && !caught && !retry) {
                    e.currentTarget.style.backgroundColor =
                      "rgba(255, 255, 255, 0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
                onClick={() => {
                  if (started && !caught && !retry) {
                    setCatcherCol(colIndex);
                  }
                }}
              />
            ))}

            {/* Catcher */}
            <div
              className={`absolute flex items-center justify-center font-code text-lg transition-colors duration-200 ${
                caught
                  ? caught.correct
                    ? "bg-green-500 text-white"
                    : "bg-red-500 text-white"
                  : "bg-white text-black"
              }`}
              style={{
                left: `${catcherCol * 25 + 1}%`, // Add 1% margin from left
                bottom: "16px",
                width: "21%", // Reduced width to account for margins (23% - 2% for margins)
                height: "40px",
                border: "2px solid #fff",
                borderRadius: "20%",
                fontSize: "clamp(0.75rem, 1.5vw, 1rem)",
                margin: "0 10", // Add horizontal margin
                zIndex: 10, // Higher z-index to overlap dots
              }}
            >
              {caught ? (caught.correct ? "Correct!" : "Wrong!") : ""}
            </div>

            {/* Retry/Next buttons inside grid */}
            {caught && !caught.correct && (
              <button
                className="absolute bg-red-600 text-white px-4 py-2 rounded font-code transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: "50%",
                  top: "50%",
                  fontSize: "clamp(0.875rem, 2vw, 1.125rem)",
                  zIndex: 10,
                }}
                onClick={retryQuestion}
              >
                Retry (Enter)
              </button>
            )}
            {caught && caught.correct && (
              <button
                className="absolute bg-green-600 text-white px-4 py-2 rounded font-code transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: "50%",
                  top: "50%",
                  fontSize: "clamp(0.875rem, 2vw, 1.125rem)",
                  zIndex: 10,
                }}
                onClick={nextQuestion}
              >
                Next Question (Enter)
              </button>
            )}
          </div>
        </div>
      )}
      <div className="mt-6 text-white text-xs font-code text-center">
        Use ← → arrows or click/tap move
        <br />
        Press Enter to Play/Retry/Next
      </div>
    </div>
  );
}
