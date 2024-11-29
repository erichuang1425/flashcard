import { useState, useEffect, useCallback } from 'react';
import { getFlashcardMetadata, searchFlashcards } from '../services/flashcardMetadata';
import { useAuth } from '../context/AuthContext';
import type { FlashcardMetadata, SearchMetadata } from '../types';
import { useDebounce } from './useDebounce';

const CARDS_PER_PAGE = 20;

export const useFlashcardLibrary = () => {
  const [cards, setCards] = useState<FlashcardMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SearchMetadata['filters']>({
    categories: [],
    difficulty: undefined,
    mastered: undefined,
    dueOnly: false
  });
  const { user } = useAuth();
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadCards = useCallback(async (isInitial: boolean = false, pageNum: number = 1) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { metadata, total } = await getFlashcardMetadata(
        user.uid,
        CARDS_PER_PAGE,
        pageNum,
        filters
      );

      if (!metadata) {
        setCards([]);
        setTotalPages(0);
        setIsLastPage(true);
        return;
      }

      setTotalPages(Math.ceil(total / CARDS_PER_PAGE));
      setCards(metadata);
      setPage(pageNum);
      setIsLastPage(pageNum * CARDS_PER_PAGE >= total);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load flashcards';
      setError(message);
      console.error('Error loading flashcards:', error);
      setCards([]);
      setTotalPages(0);
      setIsLastPage(true);
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  const searchCards = useCallback(async () => {
    if (!user || !debouncedSearch) return;

    try {
      setLoading(true);
      
      const skipLimit = (page - 1) * CARDS_PER_PAGE;
      const results = await searchFlashcards(
        user.uid, 
        debouncedSearch, 
        filters,
        CARDS_PER_PAGE,
        skipLimit
      );
      
      if (!results || !results.metadata) {
        setCards([]);
        setTotalPages(0);
        setIsLastPage(true);
        return;
      }

      setCards(results.metadata);
      setTotalPages(Math.ceil(results.total / CARDS_PER_PAGE));
      setIsLastPage((page * CARDS_PER_PAGE) >= results.total);
    } catch (error) {
      console.error('Error searching flashcards:', error);
      setError('Failed to search flashcards');
      setCards([]);
      setTotalPages(0);
      setIsLastPage(true);
    } finally {
      setLoading(false);
    }
  }, [user, debouncedSearch, filters, page]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!isLastPage && !isLoadingMore && !loading) {
      await loadCards(false);
    }
  }, [isLastPage, isLoadingMore, loading, loadCards]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (document.documentElement.scrollTop === 0) {
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleTouchMove]);

  useEffect(() => {
    if (debouncedSearch) {
      searchCards();
    } else {
      loadCards(true, page);
    }
  }, [debouncedSearch, filters, page]);

  useEffect(() => {
    setPage(1);
    setIsLastPage(false);
  }, [filters, debouncedSearch]);

  const deleteCard = async (cardId: string): Promise<void> => {
  };

  return {
    cards,
    loading,
    hasMore: !isLastPage,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    refresh: () => loadCards(true, 1),
    error,
    loadMore,
    isLastPage,
    deleteCard,
    page,
    setPage,
    totalPages,
    isLoadingMore
  };
};
