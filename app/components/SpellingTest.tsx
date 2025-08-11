'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, ChevronRight, RefreshCw, Check, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { Word } from '@/app/types';

export default function SpellingTest() {
  const [words, setWords] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [useHistory, setUseHistory] = useState(true);
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

  const currentWord = words[currentWordIndex];

  const generateWords = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt, useHistory }),
      });
      
      const data = await response.json();
      if (data.words) {
        setWords(data.words);
        setCurrentWordIndex(0);
        setShowResult(false);
        setLastResult(null);
        setSessionId(null);
        toast.success('Generated 10 new words!');
      }
    } catch (error) {
      console.error('Error generating words:', error);
      toast.error('Failed to generate words');
    } finally {
      setIsGenerating(false);
    }
  };

  const playWord = async () => {
    if (!currentWord) return;
    
    try {
      const text = `The word is: ${currentWord.word}. ${currentWord.contextSentence}`;
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (error) {
      console.error('Error playing word:', error);
      toast.error('Failed to play word');
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
      // Create a proper audio file with the correct extension
      const audioFile = new File([audioBlob], 'recording.webm', { 
        type: audioBlob.type || 'audio/webm' 
      });
      
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('targetWord', currentWord.word);
      
      // Get transcription and interpretation
      const transcriptionResponse = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      
      const { text: rawTranscription, spelledWord, error } = await transcriptionResponse.json();
      
      if (error) {
        throw new Error(error);
      }
      
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
      
      // Save attempt
      await fetch('/api/save-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          word: currentWord.word,
          userSpelling: result.userSpelling,
          isCorrect: result.isCorrect,
          feedback: result.feedback,
          audioDurationMs: audioDuration,
          sessionPrompt: userPrompt,
          difficultySetting: useHistory ? 'adaptive' : 'manual',
        }),
      }).then(res => res.json()).then(data => {
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
        }
      });
      
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
      toast.success('Test completed! Generate new words to continue.');
    }
  };

  useEffect(() => {
    if (currentWord && !showResult) {
      playWord();
    }
  }, [currentWordIndex]);

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-8">
      <Toaster position="top-center" />
      
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Spelling Test</h1>
          <p className="text-gray-600">Listen to the word and spell it phonetically</p>
        </div>

        {/* Word Generation */}
        {!words.length && (
          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Prompt for word generation (optional)
              </label>
              <input
                type="text"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="e.g., words with 'ph' sounds, tricky spellings for 11-year-olds"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useHistory"
                checked={useHistory}
                onChange={(e) => setUseHistory(e.target.checked)}
                className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
              />
              <label htmlFor="useHistory" className="text-sm text-gray-700">
                Adapt difficulty based on performance
              </label>
            </div>
            
            <button
              onClick={generateWords}
              disabled={isGenerating}
              className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </span>
              ) : (
                'Generate Words'
              )}
            </button>
          </div>
        )}

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
                className="mx-auto flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
              >
                <Volume2 className="w-6 h-6" />
              </button>
              
              {showResult && (
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{currentWord.word}</div>
                  <div className={`text-lg ${lastResult?.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    Your spelling: {lastResult?.userSpelling}
                  </div>
                  {transcribedText && (
                    <div className="text-sm text-gray-500">
                      What we heard: "{transcribedText}"
                    </div>
                  )}
                  <div className="text-sm text-gray-600">{lastResult?.feedback}</div>
                </div>
              )}
              
              {!showResult && (
                <div className="text-gray-400">Listen and spell the word</div>
              )}
            </div>

            {/* Recording Button */}
            <div className="flex flex-col items-center space-y-4">
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={isLoading || showResult}
                className={`w-24 h-24 rounded-full transition-all ${
                  isRecording
                    ? 'bg-red-500 scale-110'
                    : 'bg-red-600 hover:bg-red-700'
                } text-white flex items-center justify-center disabled:bg-gray-300`}
              >
                {isLoading ? (
                  <RefreshCw className="w-8 h-8 animate-spin" />
                ) : isRecording ? (
                  <Mic className="w-8 h-8" />
                ) : (
                  <MicOff className="w-8 h-8" />
                )}
              </button>
              <p className="text-sm text-gray-600">
                {isRecording ? 'Release to stop' : 'Hold to record'}
              </p>
            </div>

            {/* Actions */}
            {showResult && (
              <div className="flex justify-center space-x-4">
                {!lastResult?.isCorrect && (
                  <button
                    onClick={() => {
                      setShowResult(false);
                      setLastResult(null);
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
            )}

            {/* Generate New Words */}
            {currentWordIndex === words.length - 1 && showResult && (
              <button
                onClick={generateWords}
                className="w-full bg-gray-100 text-black py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Generate New Words
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}