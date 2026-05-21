import { useState } from 'react';

export default function Quiz({ questions }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const handleOptionClick = (optionIndex) => {
    if (showExplanation) return; // Prevent multiple clicks
    
    const question = questions[currentQuestion];
    // Option format is usually "A) text"
    const selectedLetter = String.fromCharCode(65 + optionIndex);
    
    setSelectedOption(selectedLetter);
    setShowExplanation(true);
    
    if (selectedLetter === question.correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg text-center border-t-4 border-secondary">
        <h2 className="text-3xl font-bold text-secondary mb-4">Quiz Completed!</h2>
        <p className="text-xl mb-6">You scored <span className="font-bold text-primary">{score}</span> out of {questions.length}</p>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
          <div className="bg-accent h-4 rounded-full" style={{ width: `${(score / questions.length) * 100}%` }}></div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const difficultyColors = {
    easy: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    hard: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-primary">Question {currentQuestion + 1} of {questions.length}</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold border capitalize ${difficultyColors[question.difficulty]}`}>
          {question.difficulty}
        </span>
      </div>
      
      <p className="text-lg mb-6 font-medium text-gray-800">{question.question}</p>
      
      <div className="space-y-3">
        {question.options.map((option, index) => {
          const optionLetter = String.fromCharCode(65 + index);
          let btnClass = "w-full text-left p-4 rounded-lg border-2 transition-all ";
          
          if (!showExplanation) {
            btnClass += "border-gray-200 hover:border-accent hover:bg-blue-50";
          } else {
            if (optionLetter === question.correctAnswer) {
              btnClass += "border-green-500 bg-green-50 text-green-700";
            } else if (optionLetter === selectedOption) {
              btnClass += "border-red-500 bg-red-50 text-red-700";
            } else {
              btnClass += "border-gray-200 opacity-50";
            }
          }

          return (
            <button
              key={index}
              className={btnClass}
              onClick={() => handleOptionClick(index)}
              disabled={showExplanation}
            >
              {option}
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg animate-fade-in">
          <p className="text-sm font-semibold text-primary mb-1">Explanation:</p>
          <p className="text-gray-700">{question.explanation}</p>
          <button 
            onClick={handleNext}
            className="mt-4 bg-primary text-white px-6 py-2 rounded-lg hover:bg-secondary transition-colors"
          >
            {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </button>
        </div>
      )}
    </div>
  );
}
