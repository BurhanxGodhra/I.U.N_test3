import React from 'react';
import { Calendar } from 'lucide-react';
import { OpeningVerse } from '../../types/verse';

interface VerseCardProps {
  verse: OpeningVerse;
  onClick: () => void;
}

const VerseCard: React.FC<VerseCardProps> = ({ verse, onClick }) => {
  const { text, language, author, createdAt, day } = verse;

  return (
    <div
      className="card cursor-pointer transform transition-transform duration-300 hover:scale-[1.02] shadow-sm"
      onClick={onClick}
      role="button"
      aria-label={`View verse for Day ${day} by ${author || 'N/A'}`}
    >
      <div
        className={`p-6 ${
          language === 'English' ? 'bg-primary-600' :
          language === 'Arabic' ? 'bg-accent-600' :
          language === 'Urdu' ? 'bg-secondary-600' :
          language === 'Lisan al-Dawah' ? 'bg-primary-700' :
          'bg-secondary-700'
        } text-white`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center">
            <Calendar size={18} className="mr-2" aria-hidden="true" />
            <span className="font-medium">Day {day}</span>
          </div>
          <span className="text-xs px-2 py-1 bg-white bg-opacity-20 rounded-full">
            {language}
          </span>
        </div>

        <div className={`font-serif text-lg italic mb-4 whitespace-pre-wrap ${
          language === 'Arabic' || language === 'Urdu' ? 'rtl text-right' : ''
        }`}>
          {text}
        </div>

        <div className="text-right text-sm text-white text-opacity-80">
          — {author || 'N/A'}
        </div>
      </div>

      <div className="p-4">
        <div className="text-sm text-secondary-500">
          {createdAt ? new Date(createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : 'No date available'}
        </div>
      </div>
    </div>
  );
};

export default VerseCard;