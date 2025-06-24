export interface OpeningVerse {
  id: string;
  text: string;
  author: string;
  language: 'English' | 'Arabic' | 'Urdu' | 'Lisan al-Dawah' | 'French';
  day: number;
  createdAt?: string; // Add optional createdAt to match VerseCardProps and backend
}