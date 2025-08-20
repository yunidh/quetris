// Data service for fetching quiz data from Supabase
import supabase from "../supabaseClient";

// Types matching your database schema
export interface DatabaseLevel {
  id: number;
  title: string;
}

export interface DatabaseQuestion {
  id: number;
  level_id: number;
  question: string;
  options: string[]; // JSONB array
  answer: string;
  difficulty: number;
}

// Types matching your QuizCarousel component expectations
export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  answer: string;
}

export interface QuizLevel {
  id: number;
  title: string;
  questions: QuizQuestion[];
}

export interface QuizData {
  levels: QuizLevel[];
}

// Fetch all quiz data from Supabase
export async function fetchQuizData(): Promise<QuizData> {
  try {
    // Fetch levels and questions in parallel for better performance
    const [levelsResponse, questionsResponse] = await Promise.all([
      supabase.from("levels").select("*").order("id", { ascending: true }),
      supabase
        .from("questions")
        .select("*")
        .order("level_id, difficulty, id", { ascending: true }),
    ]);

    if (levelsResponse.error) {
      throw new Error(
        `Failed to fetch levels: ${levelsResponse.error.message}`
      );
    }

    if (questionsResponse.error) {
      throw new Error(
        `Failed to fetch questions: ${questionsResponse.error.message}`
      );
    }

    const levels = levelsResponse.data as DatabaseLevel[];
    const questions = questionsResponse.data as DatabaseQuestion[];

    // Transform data to match QuizCarousel expectations
    const transformedLevels: QuizLevel[] = levels.map((level) => {
      // Get questions for this level
      const levelQuestions = questions
        .filter((q) => q.level_id === level.id)
        .map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options, // Already an array from JSONB
          answer: q.answer,
        }));

      return {
        id: level.id,
        title: level.title,
        questions: levelQuestions,
      };
    });

    return {
      levels: transformedLevels,
    };
  } catch (error) {
    console.error("Error fetching quiz data:", error);
    throw error;
  }
}

// Fetch a specific level's data
export async function fetchLevelData(
  levelId: number
): Promise<QuizLevel | null> {
  try {
    const [levelResponse, questionsResponse] = await Promise.all([
      supabase.from("levels").select("*").eq("id", levelId).single(),
      supabase
        .from("questions")
        .select("*")
        .eq("level_id", levelId)
        .order("difficulty, id", { ascending: true }),
    ]);

    if (levelResponse.error || !levelResponse.data) {
      throw new Error(`Level not found: ${levelResponse.error?.message}`);
    }

    if (questionsResponse.error) {
      throw new Error(
        `Failed to fetch questions: ${questionsResponse.error.message}`
      );
    }

    const level = levelResponse.data as DatabaseLevel;
    const questions = questionsResponse.data as DatabaseQuestion[];

    const transformedQuestions: QuizQuestion[] = questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      answer: q.answer,
    }));

    return {
      id: level.id,
      title: level.title,
      questions: transformedQuestions,
    };
  } catch (error) {
    console.error("Error fetching level data:", error);
    return null;
  }
}

// Add a new level (for admin functionality)
export async function addLevel(title: string): Promise<DatabaseLevel | null> {
  try {
    const { data, error } = await supabase
      .from("levels")
      .insert([{ title }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add level: ${error.message}`);
    }

    return data as DatabaseLevel;
  } catch (error) {
    console.error("Error adding level:", error);
    return null;
  }
}

// Add a new question (for admin functionality)
export async function addQuestion(
  levelId: number,
  question: string,
  options: string[],
  answer: string,
  difficulty: number
): Promise<DatabaseQuestion | null> {
  try {
    const { data, error } = await supabase
      .from("questions")
      .insert([
        {
          level_id: levelId,
          question,
          options,
          answer,
          difficulty,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add question: ${error.message}`);
    }

    return data as DatabaseQuestion;
  } catch (error) {
    console.error("Error adding question:", error);
    return null;
  }
}
