import React, { useState } from 'react';
import { ChevronDown, ShieldCheck, Scale, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AccordionItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  content: React.ReactNode;
}

interface WatermelonAccordionProps {
  items: AccordionItem[];
  defaultOpenId?: string;
  className?: string;
}

/**
 * Watermelon UI inspired animated accordion block.
 * Smooth collapsible disclosure with cn-animations and modern web dev standards.
 */
export const WatermelonAccordion: React.FC<WatermelonAccordionProps> = ({
  items,
  defaultOpenId,
  className,
}) => {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId || null);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        const IconComponent = item.icon || FileText;

        return (
          <div
            key={item.id}
            className={cn(
              'rounded-xl border transition-all duration-200 overflow-hidden',
              'bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-xs',
              isOpen
                ? 'border-[#0052d1]/30 dark:border-sky-500/30 shadow-xs'
                : 'border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
            )}
          >
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              aria-expanded={isOpen}
              aria-controls={`accordion-content-${item.id}`}
              className={cn(
                'w-full p-3 flex items-center justify-between text-left transition-colors cursor-pointer',
                isOpen ? 'bg-[#0052d1]/5 dark:bg-sky-500/10' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/80'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200',
                    isOpen
                      ? 'bg-[#0052d1] text-white shadow-xs scale-105'
                      : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  )}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </span>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.subtitle && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0',
                  isOpen && 'rotate-180 text-[#0052d1] dark:text-sky-400'
                )}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Smooth animated accordion body */}
            <div
              id={`accordion-content-${item.id}`}
              role="region"
              aria-labelledby={item.id}
              className={cn(
                'grid transition-all duration-200 ease-out',
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              )}
            >
              <div className="overflow-hidden">
                <div className="p-3 pt-2 text-[11px] text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40 space-y-2">
                  {item.content}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
