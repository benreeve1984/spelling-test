'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface HistoryItem {
  id: string;
  word: string;
  user_spelling: string;
  is_correct: boolean;
  feedback: string;
  attempted_at: string;
  session_id: string;
}

interface SessionData {
  id: string;
  created_at: string;
  prompt: string;
  difficulty_setting: string;
  attempts: HistoryItem[];
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'sessions'>('all');

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/history');
      const data = await response.json();
      
      if (data.attempts) {
        setHistory(data.attempts);
      }
      
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateStats = () => {
    if (history.length === 0) return { total: 0, correct: 0, rate: 0 };
    
    const correct = history.filter(h => h.is_correct).length;
    return {
      total: history.length,
      correct,
      rate: Math.round((correct / history.length) * 100),
    };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link 
              href="/"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold">Test History</h1>
          </div>
          
          <button
            onClick={fetchHistory}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-gray-600">Total Attempts</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-3xl font-bold text-green-600">{stats.correct}</div>
            <div className="text-gray-600">Correct</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-3xl font-bold">{stats.rate}%</div>
            <div className="text-gray-600">Success Rate</div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex space-x-4 mb-6 border-b">
          <button
            onClick={() => setViewMode('all')}
            className={`pb-2 px-1 ${
              viewMode === 'all' 
                ? 'border-b-2 border-black font-medium' 
                : 'text-gray-500'
            }`}
          >
            All Attempts
          </button>
          <button
            onClick={() => setViewMode('sessions')}
            className={`pb-2 px-1 ${
              viewMode === 'sessions' 
                ? 'border-b-2 border-black font-medium' 
                : 'text-gray-500'
            }`}
          >
            By Session
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : viewMode === 'all' ? (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No test history yet. Start a spelling test to see your progress!
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      item.is_correct ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {item.is_correct ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{item.word}</div>
                      <div className="text-sm text-gray-600">
                        You spelled: {item.user_spelling}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(item.attempted_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No sessions found.
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="bg-gray-50 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-medium">
                        Session {formatDate(session.created_at)}
                      </div>
                      {session.prompt && (
                        <div className="text-sm text-gray-600 mt-1">
                          Prompt: {session.prompt}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {session.difficulty_setting}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {session.attempts.map((attempt) => (
                      <div
                        key={attempt.id}
                        className="flex items-center justify-between p-3 bg-white rounded"
                      >
                        <div className="flex items-center space-x-3">
                          {attempt.is_correct ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-red-600" />
                          )}
                          <span className="font-medium">{attempt.word}</span>
                          {!attempt.is_correct && (
                            <span className="text-sm text-gray-500">
                              → {attempt.user_spelling}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                    Score: {session.attempts.filter(a => a.is_correct).length} / {session.attempts.length}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}