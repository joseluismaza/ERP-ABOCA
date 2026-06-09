// frontend/src/hooks/usePagination.js
import { useState, useMemo, useEffect, useCallback } from 'react';

/**
 * Hook de paginación de alta fidelidad cliente-céntrico.
 * Evita saltos transicionales en el DOM interceptando los desbordamientos de página
 * de manera matemática en lugar de delegarlo de manera asíncrona a efectos de renderizado.
 */
export const usePagination = (items = [], itemsPerPage = 20) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Computamos el volumen real de páginas con salvaguarda a base 1
  const totalPages = useMemo(() => {
    const pages = Math.ceil(items.length / itemsPerPage);
    return pages > 0 ? pages : 1;
  }, [items.length, itemsPerPage]);

  // Sincronización pasiva de estado en segundo plano para mantener la consistencia
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Determinación matemática segura de ítems: si hay un desajuste temporal por filtrado,
  // el hook recalcula visualmente los índices sobre la página máxima real sobre la marcha,
  // destruyendo el parpadeo en UI de pantallas vacías ("No se encontraron registros").
  const currentItems = useMemo(() => {
    const validPage = currentPage > totalPages ? totalPages : currentPage;
    const startIndex = (validPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, totalPages, itemsPerPage]);

  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const goToPage = useCallback((page) => {
    setCurrentPage((prev) => {
      if (page >= 1 && page <= totalPages) {
        return page;
      }
      return prev;
    });
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));
  }, []);

  return {
    currentItems,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,
    nextPage,
    prevPage,
  };
};