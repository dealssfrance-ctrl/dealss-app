import { createContext, useContext, useState, ReactNode } from 'react';

export interface FilterState {
  discountMin: number;
  discountMax: number;
  sortByDate: 'newest' | 'oldest' | 'none';
  minRating: number;
  minComments: number;
}

interface FilterContextType {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  resetFilters: () => void;
}

const defaultFilters: FilterState = {
  discountMin: 0,
  discountMax: 100,
  sortByDate: 'none',
  minRating: 0,
  minComments: 0,
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const resetFilters = () => setFilters(defaultFilters);

  return (
    <FilterContext.Provider value={{ filters, setFilters, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within FilterProvider');
  }
  return context;
}
