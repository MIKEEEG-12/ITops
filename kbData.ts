
import { KnowledgeArticle } from './types';
import { kbData } from './services/mockData';

export const INITIAL_KB_DATA: KnowledgeArticle[] = kbData.map(item => ({
  ...item,
  category: item.category as any, 
  authorId: 'u1',
  createdAt: item.updatedAt,
  deleted: false
}));
