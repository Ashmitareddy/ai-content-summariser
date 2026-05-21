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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
