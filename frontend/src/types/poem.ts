export interface Author {
  id: string;
  name: string;
}

export interface Poem {
  id: string;
  type: 'individual' | 'full';
  content: string | null;
  language: 'English' | 'French' | 'Arabic' | 'Lisan al-Dawah' | 'Urdu';
  submissionMethod: 'upload' | 'recording' | 'manual';
  author: Author;
  status: 'araz_done' | 'araz_pending';
  approved: boolean;
  rating: number | null;
  fileName?: string;
  audioFileName?: string;
  arazContent?: string;
  inspiredBy?: string;
  featured: boolean;
  featuredDate?: string | null | undefined;
  entryDate: string;
}