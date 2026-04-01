export interface Server {
  id: string;
  name: string;
  slug: string;
  description: string;
  githubUrl: string;
  websiteUrl?: string;
  categories: string[];
  tags: string[];
  authorId: string;
  votesCount: number;
  favoritesCount: number;
  readmeContent?: string | null;
  githubStars: number;
  githubForks: number;
  openIssues: number;
  lastCommitAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
