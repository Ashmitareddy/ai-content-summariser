export default function HistorySidebar({ history, onSelectHistory }) {
  if (!history || history.length === 0) {
    return (
      <div className="w-64 bg-white border-r border-gray-200 h-screen p-4 flex flex-col hidden md:flex">
        <h2 className="text-lg font-bold text-secondary mb-4">History</h2>
        <p className="text-gray-500 text-sm">No past summaries found.</p>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen p-4 flex flex-col hidden md:flex overflow-y-auto">
      <h2 className="text-lg font-bold text-secondary mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Recent Summaries
      </h2>
      <div className="space-y-3">
        {history.map((item) => (
          <button
            key={item._id}
            onClick={() => onSelectHistory(item)}
            className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-accent hover:bg-blue-50 transition-colors group"
          >
            <div className="text-sm font-medium text-gray-800 truncate">
              {item.url ? item.url : (item.text ? item.text.substring(0, 30) + '...' : 'Summary')}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(item.createdAt).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
