export interface Word {
  id?: string;
  word: string;
  difficulty: number;
  contextSentence: string;
  phoneticPattern?: string;
}

export interface GeneratedWords {
  words: Word[];
  sessionPrompt: string;
}

export interface TestAttempt {
  wordId?: string;
  word: string;
  userSpelling: string;
  isCorrect: boolean;
  feedback: string;
  attemptedAt: Date;
  audioDurationMs?: number;
}

export interface TestSession {
  id: string;
  userId: string;
  createdAt: Date;
  prompt: string;
  difficultySetting: string;
  attempts: TestAttempt[];
}

export interface PhoneticMapping {
  [key: string]: string;
}

export interface UserPerformance {
  totalAttempts: number;
  correctAttempts: number;
  successRate: number;
  recentWords: string[];
  failedWords: string[];
}