import Image from "next/image";
import QuizCarousel from "@/components/quizCarousel";
export default function Home() {
  return (
    <div className="">
      <h1 className="font-doto font-extrabold text-7xl m-2 text-center">
        Quetris
      </h1>
      <br />
      <QuizCarousel />
    </div>
  );
}
