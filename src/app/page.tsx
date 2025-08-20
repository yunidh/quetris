import QuizCarousel from "@/components/quizCarousel";
import Image from "next/image";
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
