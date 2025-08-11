import { PhoneticMapping } from '@/app/types';

export const phoneticToLetter: PhoneticMapping = {
  'ay': 'a',
  'aye': 'a',
  'bee': 'b',
  'be': 'b',
  'see': 'c',
  'sea': 'c',
  'dee': 'd',
  'de': 'd',
  'ee': 'e',
  'e': 'e',
  'eff': 'f',
  'ef': 'f',
  'gee': 'g',
  'jee': 'g',
  'je': 'g',
  'aitch': 'h',
  'ach': 'h',
  'eye': 'i',
  'i': 'i',
  'jay': 'j',
  'j': 'j',
  'kay': 'k',
  'k': 'k',
  'el': 'l',
  'ell': 'l',
  'em': 'm',
  'en': 'n',
  'oh': 'o',
  'o': 'o',
  'pee': 'p',
  'pe': 'p',
  'cue': 'q',
  'queue': 'q',
  'kew': 'q',
  'ar': 'r',
  'arr': 'r',
  'ess': 's',
  'es': 's',
  'tea': 't',
  'tee': 't',
  'te': 't',
  'you': 'u',
  'u': 'u',
  'vee': 'v',
  've': 'v',
  'double you': 'w',
  'double u': 'w',
  'double-you': 'w',
  'double-u': 'w',
  'doubleyou': 'w',
  'doubleu': 'w',
  'ex': 'x',
  'eks': 'x',
  'why': 'y',
  'y': 'y',
  'wye': 'y',
  'zed': 'z',
  'zee': 'z',
  'ze': 'z',
};

export function convertPhoneticToLetters(phoneticSpelling: string): string {
  const words = phoneticSpelling.toLowerCase().trim().split(/\s+/);
  let result = '';
  
  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    
    // Handle "double" pattern for 'w'
    if (word === 'double' && i + 1 < words.length) {
      const nextWord = words[i + 1];
      if (nextWord === 'you' || nextWord === 'u') {
        result += 'w';
        i++; // Skip the next word
        continue;
      }
    }
    
    // Handle hyphenated double-you
    if (word === 'double-you' || word === 'double-u') {
      result += 'w';
      continue;
    }
    
    // Look up the phonetic mapping
    const letter = phoneticToLetter[word];
    if (letter) {
      result += letter;
    } else {
      // If not found, it might be a direct letter
      if (word.length === 1 && /[a-z]/.test(word)) {
        result += word;
      }
      // Otherwise, ignore unrecognized words
    }
  }
  
  return result;
}

export function checkSpelling(correctWord: string, phoneticSpelling: string): {
  isCorrect: boolean;
  userSpelling: string;
  feedback: string;
} {
  const userSpelling = convertPhoneticToLetters(phoneticSpelling);
  const correctWordLower = correctWord.toLowerCase();
  const isCorrect = userSpelling === correctWordLower;
  
  let feedback = '';
  
  if (isCorrect) {
    feedback = 'Perfect! You spelled it correctly.';
  } else {
    // Generate specific feedback
    const correctLength = correctWordLower.length;
    const userLength = userSpelling.length;
    
    if (userLength < correctLength) {
      feedback = `Your spelling "${userSpelling}" is missing ${correctLength - userLength} letter(s). `;
    } else if (userLength > correctLength) {
      feedback = `Your spelling "${userSpelling}" has ${userLength - correctLength} extra letter(s). `;
    } else {
      feedback = `Your spelling "${userSpelling}" has the right number of letters but some are incorrect. `;
    }
    
    // Find the first difference
    for (let i = 0; i < Math.min(correctLength, userLength); i++) {
      if (correctWordLower[i] !== userSpelling[i]) {
        feedback += `The ${i + 1}${getOrdinalSuffix(i + 1)} letter should be "${correctWordLower[i]}" not "${userSpelling[i]}".`;
        break;
      }
    }
    
    feedback += ` The correct spelling is "${correctWord}".`;
  }
  
  return {
    isCorrect,
    userSpelling,
    feedback
  };
}

function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  
  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
}