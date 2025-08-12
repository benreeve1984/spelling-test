'use client';

import { useState, useRef } from 'react';
import { Mic, Volume2, ChevronRight, RefreshCw } from 'lucide-react';
// Removed Link/history UI
import toast, { Toaster } from 'react-hot-toast';
import { Word } from '@/app/types';

// Fixed sample words (British English)
const SAMPLE_WORDS: Word[] = [
  { word: 'colour', difficulty: 4, contextSentence: 'The colour of the sky changed at sunset.', phoneticPattern: 'our vs or' },
  { word: 'favourite', difficulty: 5, contextSentence: 'Chocolate is her favourite flavour.', phoneticPattern: 'our vs or' },
  { word: 'realise', difficulty: 5, contextSentence: 'I didn’t realise the time.', phoneticPattern: 'ise vs ize' },
  { word: 'theatre', difficulty: 5, contextSentence: 'We went to the theatre to see a play.' },
  { word: 'centre', difficulty: 4, contextSentence: 'Meet me in the town centre.' },
  { word: 'defence', difficulty: 6, contextSentence: 'Their defence was strong throughout the match.', phoneticPattern: 'ce vs se' },
  { word: 'jewellery', difficulty: 7, contextSentence: 'She keeps her jewellery in a small box.' },
  { word: 'travelling', difficulty: 5, contextSentence: 'He enjoys travelling by train.' },
  { word: 'programme', difficulty: 6, contextSentence: 'The programme starts at eight o’clock.' },
  { word: 'organisation', difficulty: 7, contextSentence: 'The charity is a well-known organisation.' },
];

export default function SpellingTest() {
  const [words, setWords] = useState<Word[]>(SAMPLE_WORDS);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
    userSpelling: string;
    feedback: string;
  } | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const currentWord = words[currentWordIndex];

  const playWord = async () => {
    if (!currentWord || isPlayingAudio) return;
    
    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    try {
      setIsPlayingAudio(true);
      const text = `The word is: ${currentWord.word}. ${currentWord.contextSentence}`;
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error playing word:', error);
      toast.error('Failed to play word');
      setIsPlayingAudio(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      // Use a more compatible format
      const options = {
        mimeType: 'audio/webm;codecs=opus'
      };
      
      // Fallback if the preferred format isn't supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/webm';
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType });
        await processRecording(audioBlob);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      // Record in chunks to ensure we capture all audio
      mediaRecorder.start(100); // Capture in 100ms chunks
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const processRecording = async (audioBlob: Blob) => {
    if (!currentWord) return;
    
    setIsLoading(true);
    const audioDuration = Date.now() - recordingStartTimeRef.current;
    
    try {
      // Log audio blob info for debugging
      console.log('Audio blob size:', audioBlob.size);
      console.log('Audio blob type:', audioBlob.type);
      
      if (audioBlob.size === 0) {
        throw new Error('Recording is empty - please try again');
      }
      
      // Create a proper audio file with the correct MIME type
      const audioFile = new File([audioBlob], 'recording.webm', { 
        type: 'audio/webm;codecs=opus' 
      });
      
      console.log('Audio file size:', audioFile.size);
      console.log('Audio file type:', audioFile.type);
      
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('targetWord', currentWord.word);
      
      // Get transcription and interpretation
      const transcriptionResponse = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      
      const transcriptionData = await transcriptionResponse.json();
      
      if (transcriptionData.error) {
        console.error('STT API Error:', transcriptionData);
        throw new Error(transcriptionData.details || transcriptionData.error);
      }
      
      const { text: rawTranscription, spelledWord } = transcriptionData;
      
      console.log('Raw transcription:', rawTranscription);
      console.log('Interpreted spelling:', spelledWord);
      setTranscribedText(rawTranscription); // Store raw for display
      
      // Check spelling
      const checkResponse = await fetch('/api/check-spelling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: currentWord.word,
          userSpelling: spelledWord,
        }),
      });
      
      const result = await checkResponse.json();
      
      setLastResult(result);
      setShowResult(true);
      
      if (result.isCorrect) {
        toast.success('Correct! Well done!');
      } else {
        toast.error('Not quite right. Try again!');
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      toast.error('Failed to process recording');
    } finally {
      setIsLoading(false);
    }
  };

  const nextWord = () => {
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
      setShowResult(false);
      setLastResult(null);
      setTranscribedText('');
    } else {
      toast.success('Set completed! Tap Restart to try again.');
    }
  };

  const restartSet = () => {
    setCurrentWordIndex(0);
    setShowResult(false);
    setLastResult(null);
    setTranscribedText('');
  };

  // Removed autoplay to satisfy browser media policies; user must tap the speaker

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-8">
      <Toaster position="top-center" />
      
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Spelling Test</h1>
          <p className="text-gray-600">British English words — listen and spell phonetically</p>
        </div>

        {/* Current Word */}
        {currentWord && (
          <div className="space-y-6">
            {/* Progress */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Word {currentWordIndex + 1} of {words.length}</span>
              <div className="flex space-x-1">
                {words.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full ${
                      idx === currentWordIndex
                        ? 'bg-black'
                        : idx < currentWordIndex
                        ? 'bg-gray-400'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Word Display */}
            <div className="bg-gray-50 rounded-lg p-8 text-center space-y-4">
              <button
                onClick={playWord}
                disabled={isPlayingAudio}
                className={`mx-auto flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-md transition-all ${
                  isPlayingAudio ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
                }`}
              >
                <Volume2 className={`w-6 h-6 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
              </button>
              
              {showResult && (
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{currentWord.word}</div>
                  <div className={`text-lg ${lastResult?.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {lastResult?.isCorrect ? 'Correct!' : `You spelled: ${lastResult?.userSpelling || transcribedText}`}
                  </div>
                  <div className="text-sm text-gray-600">{lastResult?.feedback}</div>
                </div>
              )}
              
              {!showResult && (
                <div className="text-gray-400">Tap the speaker to hear the word, then spell it</div>
              )}
            </div>

            {/* Recording Button */}
            <div className="flex flex-col items-center space-y-4">
              <button
                onClick={() => (isRecording ? stopRecording() : startRecording())}
                disabled={isLoading || showResult}
                className={`w-24 h-24 rounded-full transition-all ${
                  isRecording
                    ? 'bg-red-500 scale-110'
                    : 'bg-red-600 hover:bg-red-700'
                } text-white flex items-center justify-center disabled:bg-gray-300`}
              >
                {isLoading ? (
                  <RefreshCw className="w-8 h-8 animate-spin" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>
              <p className="text-sm text-gray-600">
                {isRecording ? 'Tap to stop' : 'Tap to record'}
              </p>
            </div>

            {/* Actions */}
            {showResult && (
              <div className="flex flex-col items-center space-y-3">
                <div className="flex justify-center space-x-4">
                  {!lastResult?.isCorrect && (
                    <button
                      onClick={() => {
                        setShowResult(false);
                        setLastResult(null);
                        setTranscribedText('');
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Try Again
                    </button>
                  )}
                  <button
                    onClick={nextWord}
                    disabled={currentWordIndex >= words.length - 1}
                    className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 flex items-center"
                  >
                    Next Word
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
                
                {/* Misheard button */}
                {!lastResult?.isCorrect && (
                  <button
                    onClick={() => {
                      setShowResult(false);
                      setLastResult(null);
                      setTranscribedText('');
                      toast('No problem! Try spelling it again.', { icon: '🎤' });
                    }}
                    className="text-sm text-gray-500 underline hover:text-gray-700"
                  >
                    The app misheard me
                  </button>
                )}
              </div>
            )}

            {/* Restart Set when finished */}
            {currentWordIndex === words.length - 1 && showResult && (
              <button
                onClick={restartSet}
                className="w-full bg-gray-100 text-black py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Restart Set
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}