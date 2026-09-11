/** Reading achievement badges derived from books-read count (Pine reading profile). */

export type ReadingAchievement = {
  id: string;
  label: string;
  description: string;
  unlocked: boolean;
  threshold: number;
};

const ACHIEVEMENTS: { id: string; label: string; description: string; threshold: number }[] = [
  { id: "first-chapter", label: "First Chapter", description: "Logged your first book", threshold: 1 },
  { id: "bookworm", label: "Bookworm", description: "Read 10 books", threshold: 10 },
  { id: "shelf-builder", label: "Shelf Builder", description: "Read 25 books", threshold: 25 },
  { id: "librarian", label: "Librarian", description: "Read 50 books", threshold: 50 },
  { id: "archive-keeper", label: "Archive Keeper", description: "Read 100 books", threshold: 100 },
];

export function getReadingAchievements(booksReadCount: number): ReadingAchievement[] {
  const count = Math.max(0, booksReadCount || 0);
  return ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: count >= a.threshold,
  }));
}
