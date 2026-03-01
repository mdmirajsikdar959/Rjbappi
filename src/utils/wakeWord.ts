/**
 * Utility to detect wake words in a transcript with improved sensitivity and reduced false positives.
 */
export function isWakeWordDetected(transcript: string): boolean {
  const normalized = transcript.toLowerCase().trim();
  
  // Primary wake words
  const wakeWords = [
    'devil cyber guard',
    'devil cyberguard',
    'cyberguard',
    'cyber guard',
    'সাইবার গার্ড',
    'ডেভিল সাইবার গার্ড'
  ];

  // Phonetic variations or common misinterpretations
  const variations = [
    'devil guard',
    'cyber gaurd',
    'cyber gard',
    'saibar gard',
    'cybergard'
  ];

  // Check for exact matches or if the transcript ends with the wake word
  // This helps reduce false positives from longer sentences containing the words
  for (const word of [...wakeWords, ...variations]) {
    // Match if it's the whole transcript or if it's at the end of the transcript
    const regex = new RegExp(`(^|\\s)${word}$`, 'i');
    if (regex.test(normalized)) {
      return true;
    }
  }

  // Fallback: if the transcript is very short and contains the core words
  if (normalized.length < 25) {
    return wakeWords.some(word => normalized.includes(word));
  }

  return false;
}
