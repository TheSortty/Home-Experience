'use client';

import React from 'react';
import { categorizeCycle, cycleTypeLabel, type ProgramChipData } from './types';

interface Props {
  program: ProgramChipData;
  size?: 'sm' | 'md';
  /** When provided, shows a small × to unlink (desvincular) the program. */
  onRemove?: () => void;
}

const STATUS_DOT: Record<ProgramChipData['status'], string> = {
  ACTIVE:    'bg-emerald-500',
  CONFLICT:  'bg-rose-500',
  GRADUATED: 'bg-slate-400',
};

const CATEGORY_STYLES: Record<'creser' | 'campus', { bg: string; text: string; border: string }> = {
  creser: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  campus: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
};

export default function ProgramChip({ program, size = 'sm', onRemove }: Props) {
  const category = categorizeCycle(program.cycleType);
  const styles = CATEGORY_STYLES[category];
  const dot = STATUS_DOT[program.status];
  const padding = size === 'md' ? 'px-2.5 py-1' : 'px-2 py-0.5';
  const textSize = size === 'md' ? 'text-[11px]' : 'text-[10px]';
  const typeLabel = category === 'creser' ? cycleTypeLabel(program.cycleType) : (program.courseTitle || cycleTypeLabel(program.cycleType));
  const subLabel = program.cycleName && program.cycleName !== typeLabel ? program.cycleName : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border font-bold uppercase tracking-wider whitespace-nowrap ${padding} ${textSize} ${styles.bg} ${styles.text} ${styles.border}`}
      title={`${typeLabel}${subLabel ? ` · ${subLabel}` : ''} — ${program.status}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span>
        {category === 'creser' ? 'CRESER ' : ''}{typeLabel}
        {subLabel && (
          <span className="opacity-70 font-medium normal-case tracking-normal"> · {subLabel}</span>
        )}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 -mr-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-rose-500 hover:text-white text-current opacity-60 hover:opacity-100 transition-colors"
          title="Desvincular programa"
          aria-label="Desvincular programa"
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </span>
  );
}

export function NoProgramChip() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-slate-200 bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
      Sin programa
    </span>
  );
}
