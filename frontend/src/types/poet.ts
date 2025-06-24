export interface Poet {
  id: string;
  name: string;
  email: string;
  country: string;
  points: number;
  poemsCount: number;
  likesReceived: number;
  bio?: string;
}