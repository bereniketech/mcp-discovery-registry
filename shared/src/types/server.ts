export interface Server {
  id: string;
  name: string;
  slug: string;
  description: string;
  repositoryUrl: string;
  websiteUrl?: string;
  categories: string[];
  tags: string[];
  authorId: string;
  votesCount: number;
  favoritesCount: number;
  createdAt: string;
  updatedAt: string;
}
