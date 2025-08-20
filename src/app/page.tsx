import QuizCarousel from "@/components/quizCarousel";
import Image from "next/image";
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <h1 className="font-doto font-extrabold text-7xl text-center mt-4 text-white absolute top-0">
        Quetris
      </h1>
      <div className="flex-1 flex items-center justify-center w-full">
        <QuizCarousel />
      </div>
    </div>
  );
}
