import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Check, FilterX, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

export interface CategoryOption {
  id: string;
  name: string;
  nameFil: string;
  icon: string;
  description?: string;
  count?: number;
}

export interface UniswapCategoryFilterProps {
  categories: CategoryOption[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  title?: string;
  placeholder?: string;
  totalLocationsCount?: number;
  className?: string;
}

export const UniswapCategoryFilter: React.FC<UniswapCategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  title = 'Select category',
  placeholder,
  totalLocationsCount,
  className,
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const isFil = i18n.language === 'fil';

  // Find active category item
  const activeCategory = useMemo(() => {
    return (
      categories.find((c) => c.id === selectedCategory) || {
        id: 'all',
        name: 'All Categories',
        nameFil: 'Lahat ng Kategorya',
        icon: '✨',
        count: totalLocationsCount,
      }
    );
  }, [categories, selectedCategory, totalLocationsCount]);

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.nameFil.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, search]);

  const activeLabel = isFil ? activeCategory.nameFil : activeCategory.name;

  return (
    <div className={cn('relative w-max flex items-center gap-1.5', className)}>
      {/* ─── EXACT WATERMELON UNISWAP TRIGGER CAPSULE (SOLID OPAQUE) ─── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center gap-2 rounded-full px-2.5 py-1.5 transition-all shadow-md active:scale-95 cursor-pointer border select-none',
          selectedCategory === 'all'
            ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 dark:bg-[#2A2A2A] dark:hover:bg-[#383838] dark:border-[#3E3E3E] dark:text-white'
            : 'bg-white hover:bg-slate-50 border-[#0052d1] ring-2 ring-[#0052d1] text-slate-900 dark:bg-[#2A2A2A] dark:hover:bg-[#383838] dark:border-sky-500 dark:ring-2 dark:ring-sky-500 dark:text-white'
        )}
        title={isFil ? `Kategorya: ${activeLabel}` : `Category: ${activeLabel}`}
        aria-label={activeLabel}
      >
        <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-[#3E3E3E] flex items-center justify-center bg-slate-100 dark:bg-[#1E1E1E] text-sm shadow-2xs">
          <span>{activeCategory.icon}</span>
        </div>
        <ChevronDown size={14} className="text-slate-800 dark:text-white shrink-0" strokeWidth={2.5} />
      </button>

      {/* Quick Remove Filter Button (when a specific category is active) */}
      {selectedCategory !== 'all' && (
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className="h-8 w-8 rounded-full bg-white dark:bg-[#2A2A2A] text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-[#3E3E3E] shadow-sm hover:bg-rose-50 dark:hover:bg-[#353535] transition-all active:scale-95 cursor-pointer flex items-center justify-center animate-in fade-in duration-150"
          title={isFil ? 'Alisin ang Filter (Ipakita Lahat)' : 'Remove Filter (Show All)'}
          aria-label="Remove Filter"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}

      {/* ─── UNISWAP DIALOG MODAL (SOLID OPAQUE) ─── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-998 bg-black/60 backdrop-blur-xs"
            />

            {/* Dialog Container */}
            <div className="fixed inset-0 z-999 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.96,
                  filter: 'blur(4px)',
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  filter: 'blur(0px)',
                }}
                exit={{
                  opacity: 0,
                  scale: 0.96,
                  filter: 'blur(4px)',
                }}
                transition={{ type: 'spring', bounce: 0, duration: 0.28 }}
                className="pointer-events-auto flex h-fit max-h-[520px] w-full max-w-[400px] flex-col overflow-hidden rounded-[28px] border border-slate-300 bg-white shadow-2xl sm:h-[520px] dark:border-[#383838] dark:bg-[#181818] dark:shadow-black/70"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 pb-2 bg-white dark:bg-[#181818]">
                  <h2 className="px-1 text-sm font-bold text-gray-900 dark:text-white">
                    {isFil ? 'Pumili ng kategorya' : title}
                  </h2>
                  <button
                    title="close"
                    onClick={() => {
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className="p-1 text-gray-500 transition-colors hover:text-gray-900 dark:text-white/80 dark:hover:text-white cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Search */}
                <div className="px-4 pb-3 bg-white dark:bg-[#181818]">
                  <div className="relative flex items-center">
                    <Search
                      size={16}
                      className="absolute left-3.5 text-gray-400 dark:text-[#8d8c8d] pointer-events-none"
                    />
                    <input
                      autoFocus
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={
                        placeholder ||
                        (isFil ? 'Maghanap ng kategorya...' : 'Search by category or spot')
                      }
                      className="w-full rounded-xl border border-gray-300 bg-gray-100 py-2.5 pr-4 pl-10 text-sm text-gray-900 placeholder-gray-500 transition-colors outline-none focus:border-[#0052d1] dark:border-[#383838] dark:bg-[#262626] dark:text-white dark:placeholder-[#8d8c8d] dark:focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* List */}
                <div className="custom-scrollbar no-scrollbar hide-scrollbar scrollbar-none flex-1 overflow-y-auto pb-4 bg-white dark:bg-[#181818]">
                  {filteredCategories.length === 0 ? (
                    <div className="flex h-[150px] flex-col items-center justify-center text-sm text-gray-500 dark:text-[#8d8c8d] space-y-1">
                      <span>{isFil ? 'Walang nahanap na kategorya' : 'No categories found'}</span>
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="text-xs text-[#0052d1] dark:text-sky-400 underline font-medium cursor-pointer"
                      >
                        {isFil ? 'I-clear ang paghahanap' : 'Clear search'}
                      </button>
                    </div>
                  ) : (
                    filteredCategories.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      const catName = isFil ? cat.nameFil : cat.name;

                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            onSelectCategory(cat.id);
                            setIsOpen(false);
                            setSearch('');
                          }}
                          className={cn(
                            'group flex w-full items-center justify-between px-4 py-2.5 transition-all cursor-pointer text-left',
                            isSelected
                              ? 'bg-gray-200 dark:bg-[#333333]'
                              : 'hover:bg-gray-100 dark:hover:bg-[#2A2A2A]'
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Circular Icon (Watermelon Flag/Icon style) */}
                            <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-gray-300 dark:border-[#383838] flex items-center justify-center bg-gray-100 dark:bg-[#282828] text-sm">
                              <span>{cat.icon}</span>
                            </div>
                            <span
                              className={cn(
                                'text-sm font-medium transition-colors truncate',
                                isSelected
                                  ? 'text-gray-900 dark:text-white font-semibold'
                                  : 'text-gray-600 group-hover:text-gray-900 dark:text-white/80 dark:group-hover:text-white'
                              )}
                            >
                              {catName}
                            </span>
                            {cat.count !== undefined && (
                              <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                                ({cat.count})
                              </span>
                            )}
                          </div>

                          {isSelected && (
                            <Check
                              size={16}
                              className="text-gray-900 dark:text-white shrink-0 ml-2"
                            />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Optional Remove Filter Quick Button at Bottom */}
                {selectedCategory !== 'all' && (
                  <div className="p-3 border-t border-gray-200 dark:border-[#282828] bg-gray-100 dark:bg-[#202020] flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {isFil ? `Naka-filter: ${activeLabel}` : `Filtered by: ${activeLabel}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCategory('all');
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <FilterX size={13} />
                      <span>{isFil ? 'Alisin ang Filter (Ipakita Lahat)' : 'Remove Filter (Show All)'}</span>
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #282828;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
};
