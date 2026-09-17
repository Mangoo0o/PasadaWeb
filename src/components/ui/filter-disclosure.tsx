'use client';

import React, { useState, useRef, useEffect, useId, type FC, type ComponentType } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { Check, Filter, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FilterItem {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string; size?: number | string }>;
  description?: string;
  badge?: string | number;
}

export interface FilterDisclosureProps {
  items: FilterItem[];
  defaultActiveId?: string;
  activeId?: string;
  onChange?: (id: string) => void;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  label?: string;
  align?: 'left' | 'right';
}

const SPRING = {
  type: 'spring',
  stiffness: 380,
  damping: 26,
  mass: 0.9,
} as const;

export const FilterDisclosure: FC<FilterDisclosureProps> = ({
  items,
  defaultActiveId = 'all',
  activeId,
  onChange,
  className,
  buttonClassName,
  dropdownClassName,
  label,
  align = 'right',
}) => {
  const [open, setOpen] = useState(false);
  const [internalActive, setInternalActive] = useState<string>(activeId ?? defaultActiveId);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedId = useId().replace(/:/g, '');

  const currentActive = activeId !== undefined ? activeId : internalActive;
  const activeItem = items.find((i) => i.id === currentActive) || items[0];
  const ActiveIcon = activeItem?.icon || Filter;

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleSelect = (id: string) => {
    if (activeId === undefined) {
      setInternalActive(id);
    }
    onChange?.(id);
    setTimeout(() => setOpen(false), 180);
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left select-none z-30", className)}>
      <MotionConfig transition={SPRING}>
        {/* Trigger Button */}
        <motion.button
          type="button"
          onClick={() => setOpen(!open)}
          whileTap={{ scale: 0.97 }}
          className={cn(
            "h-9 px-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer flex items-center gap-2 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors",
            open && "border-[#0052d1] dark:border-sky-500 ring-2 ring-[#0052d1]/15",
            buttonClassName
          )}
        >
          <div className="flex items-center gap-1.5 shrink-0 text-[#0052d1] dark:text-sky-400">
            <ActiveIcon size={14} />
          </div>

          <span className="truncate max-w-[140px]">
            {activeItem?.label || 'Filter'}
          </span>

          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-slate-400 shrink-0 ml-0.5"
          >
            <ChevronDown size={13} />
          </motion.div>
        </motion.button>

        {/* Animated Expanding Filter Disclosure Dropdown */}
        <AnimatePresence>
          {open && (
            <motion.div
              layoutId={`filter-disclosure-${generatedId}`}
              initial={{ opacity: 0, scale: 0.94, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -6, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className={cn(
                "absolute mt-1.5 w-64 max-w-[90vw] z-50 overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 shadow-2xl ambient-shadow",
                align === 'left' ? "left-0" : "right-0",
                dropdownClassName
              )}
            >
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between mb-1">
                <span>{label || 'Filter By Category'}</span>
                <span className="text-[9px] font-semibold text-slate-400">{items.length} options</span>
              </div>

              <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto">
                {items.map((item, index) => {
                  const Icon = item.icon || Filter;
                  const isSelected = currentActive === item.id;

                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRING, delay: index * 0.025 }}
                      onClick={() => handleSelect(item.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors",
                        isSelected
                          ? "bg-[#0052d1]/10 dark:bg-sky-950/50 text-[#0052d1] dark:text-sky-300 font-bold"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 font-medium"
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <span className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs transition-colors",
                          isSelected
                            ? "bg-[#0052d1] text-white dark:bg-sky-500 dark:text-slate-900"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        )}>
                          <Icon size={14} />
                        </span>

                        <span className="text-xs truncate">
                          {item.label}
                        </span>
                      </div>

                      {/* Smooth check indicator from watermelon disclosure */}
                      <motion.div
                        animate={{
                          backgroundColor: isSelected ? '#0052d1' : 'transparent',
                          borderColor: isSelected ? '#0052d1' : 'rgba(148, 163, 184, 0.4)',
                        }}
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          isSelected ? "dark:bg-sky-500 dark:border-sky-500" : ""
                        )}
                      >
                        <motion.div
                          animate={{
                            scale: isSelected ? 1 : 0,
                            opacity: isSelected ? 1 : 0,
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 520,
                            damping: 28,
                          }}
                        >
                          <Check size={11} strokeWidth={3} className="text-white dark:text-slate-900" />
                        </motion.div>
                      </motion.div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </div>
  );
};
