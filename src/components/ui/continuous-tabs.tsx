'use client';

import React, { useState, useEffect, useId, type FC, type ReactNode } from 'react';
import { motion, LayoutGroup } from 'motion/react';
import { cn } from '../../lib/utils';

export interface ContinuousTabItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface ContinuousTabsProps {
  tabs?: ContinuousTabItem[];
  defaultActiveId?: string;
  activeId?: string;
  onChange?: (id: string) => void;
  className?: string;
  tabClassName?: string;
  pillClassName?: string;
  layoutId?: string;
}

const DEFAULT_TABS: ContinuousTabItem[] = [
  { id: 'cards', label: 'Cards' },
  { id: 'table', label: 'Table' },
];

export const ContinuousTabs: FC<ContinuousTabsProps> = ({
  tabs = DEFAULT_TABS,
  defaultActiveId = 'table',
  activeId,
  onChange,
  className,
  tabClassName,
  pillClassName,
  layoutId,
}) => {
  const [internalActive, setInternalActive] = useState<string>(activeId ?? defaultActiveId);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const generatedId = useId();
  const effectiveLayoutId = layoutId || `continuous-tab-pill-${generatedId.replace(/:/g, '')}`;

  const currentActive = activeId !== undefined ? activeId : internalActive;

  useEffect(() => {
    requestAnimationFrame(() => setIsMounted(true));
  }, []);

  const handleChange = (id: string) => {
    if (activeId === undefined) {
      setInternalActive(id);
    }
    onChange?.(id);
  };

  if (!isMounted) {
    // Render static fallback during SSR / initial frame
    return (
      <div className={cn(
        "h-9 relative flex items-center gap-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/80 p-0.5 shadow-2xs",
        className
      )}>
        {tabs.map((tab) => {
          const isActive = currentActive === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleChange(tab.id)}
              className={cn(
                "relative rounded-[5px] px-3 h-full text-xs font-bold outline-none cursor-pointer flex items-center justify-center gap-1.5 transition-colors",
                isActive
                  ? "bg-white dark:bg-slate-900 text-[#0052d1] dark:text-sky-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                tabClassName
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <LayoutGroup id={effectiveLayoutId}>
      <nav
        className={cn(
          "h-9 relative flex items-center gap-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/80 p-0.5 shadow-2xs",
          className
        )}
      >
        {tabs.map((tab) => {
          const isActive = currentActive === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleChange(tab.id)}
              className={cn(
                "relative rounded-[5px] px-3 h-full text-xs font-bold outline-none cursor-pointer flex items-center justify-center gap-1.5 z-0 transition-colors",
                tabClassName
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={`${effectiveLayoutId}-pill`}
                  transition={{
                    type: 'spring',
                    stiffness: 450,
                    damping: 32,
                    mass: 0.8,
                  }}
                  className={cn(
                    "absolute inset-0 bg-white dark:bg-slate-900 rounded-[5px] shadow-xs z-0",
                    pillClassName
                  )}
                />
              )}

              <motion.span
                layout="position"
                className={cn(
                  "relative z-10 flex items-center gap-1.5 transition-colors duration-200",
                  isActive
                    ? "text-[#0052d1] dark:text-sky-400 font-bold"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </motion.span>
            </button>
          );
        })}
      </nav>
    </LayoutGroup>
  );
};
