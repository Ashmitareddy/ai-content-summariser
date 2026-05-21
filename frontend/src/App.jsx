import { useState, useEffect } from 'react';
import Flashcard from './components/Flashcard';
import Quiz from './components/Quiz';
import HistorySidebar from './components/HistorySidebar';

const API_BASE_URL = 'http://localhost:8082/api'; // Use env var in production

function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [isRecording, setIsRecording] = useState(false);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setInput(prev => prev + finalTranscript);
      }
    };
    recognition.onerror = (e) => {
      console.error(e);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);

    recognition.start();
    // Auto stop after 2 mins
    setTimeout(() => {
      recognition.stop();
    }, 120000);
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/history`);
      if (res.ok) {
        const hData = await res.json();
        setHistory(hData);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSummarize = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setLoading(true);
    setError('');
    setData(null);

    try {
      const res = await fetch(`${API_BASE_URL}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Failed to generate summary');
      }
      
      setData(result);
      fetchHistory(); // Refresh history
      setActiveTab('summary');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistory = (item) => {
    setData({ summary: item.summary, flashcards: item.flashcards, quiz: item.quiz });
    setActiveTab('summary');
    // Set input placeholder to show what was loaded
    setInput(item.url || (item.text ? item.text.substring(0, 100) + '...' : ''));
  };

  const exportToMarkdown = () => {
    if (!data) return;
    let md = '# AI Study Packet\n\n## Summary\n';
    if (data.summary) {
      data.summary.forEach(point => { md += `- ${point}\n`; });
    }
    
    if (data.flashcards) {
      md += '\n## Flashcards\n';
      data.flashcards.forEach(fc => {
        md += `**Q:** ${fc.front}\n**A:** ${fc.back}\n\n`;
      });
    }
    
    if (data.quiz) {
      md += '## Quiz\n';
      data.quiz.forEach(q => {
        md += `**Q:** ${q.question} (${q.difficulty})\n`;
        q.options.forEach(opt => { md += `- ${opt}\n`; });
        md += `**Answer:** ${q.correctAnswer}\n*Explanation:* ${q.explanation}\n\n`;
      });
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'study-packet.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-background font-sans text-gray-800">
      <HistorySidebar history={history} onSelectHistory={handleSelectHistory} />
      
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <h1 className="text-2xl font-bold text-primary flex items-center">
            <span className="bg-primary text-white p-2 rounded-lg mr-3 shadow-md">AI</span>
            Content Summariser
          </h1>
        </header>

        <div className="flex-1 max-w-5xl w-full mx-auto p-8">
          {/* Input Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-t-4 border-accent">
            <h2 className="text-xl font-semibold mb-4 text-secondary">Generate Study Guide</h2>
            <form onSubmit={handleSummarize}>
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste an article URL or text block here..."
                className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none mb-4"
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Supports raw text and URLs.</span>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`p-3 rounded-full transition-colors shadow-sm ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    title="Record voice notes"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading || !input.trim()}
                    className="bg-primary hover:bg-secondary text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {loading ? (
                      <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Generating...</>
                    ) : 'Summarize'}
                  </button>
                </div>
              </div>
            </form>
            {error && <p className="text-red-500 mt-4 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}
          </div>

          {/* Results Section */}
          {data && (
            <div className="animate-fade-in">
              <div className="flex space-x-4 mb-6">
                <button 
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors shadow-sm ${activeTab === 'summary' ? 'bg-secondary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  onClick={() => setActiveTab('summary')}
                >
                  Summary
                </button>
                <button 
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors shadow-sm ${activeTab === 'flashcards' ? 'bg-secondary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  onClick={() => setActiveTab('flashcards')}
                >
                  Flashcards
                </button>
                <button 
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors shadow-sm ${activeTab === 'quiz' ? 'bg-secondary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  onClick={() => setActiveTab('quiz')}
                >
                  Take Quiz
                </button>
              </div>

              <div className="mb-12">
                {activeTab === 'summary' && data.summary && (
                  <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-secondary max-w-4xl mx-auto">
                    <h3 className="text-2xl font-bold text-primary mb-6">Key Takeaways</h3>
                    <ul className="space-y-4">
                      {data.summary.map((point, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="w-2 h-2 mt-2 mr-3 rounded-full bg-secondary shrink-0"></span>
                          <span className="text-gray-700 leading-relaxed text-lg">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeTab === 'flashcards' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.flashcards.map((card, index) => (
                      <Flashcard key={index} card={card} />
                    ))}
                  </div>
                )}

                {activeTab === 'quiz' && (
                  <div className="max-w-3xl mx-auto">
                    <Quiz questions={data.quiz} />
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-6 mt-8 flex justify-center">
                <button 
                  onClick={exportToMarkdown}
                  className="bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold py-3 px-8 rounded-lg transition-colors shadow-sm flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download Study Packet
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
