import { useState } from 'react';

export default function Flashcard({ card }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="w-full h-64 perspective-1000 cursor-pointer group"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`relative w-full h-full transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Front */}
        <div className="absolute w-full h-full backface-hidden flex items-center justify-center p-6 bg-white rounded-xl shadow-lg border-t-4 border-primary hover:shadow-xl transition-shadow">
          <p className="text-xl font-semibold text-center text-primary">{card.front}</p>
        </div>
        
        {/* Back */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center p-6 bg-secondary text-white rounded-xl shadow-lg">
          <p className="text-lg text-center leading-relaxed">{card.back}</p>
        </div>
      </div>
    </div>
  );
}
