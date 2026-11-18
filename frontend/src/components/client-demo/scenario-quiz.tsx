'use client';

import React, { useState } from 'react';
import type { ScenarioQuiz } from '@/lib/client-demo/types';
import { HelpCircle, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScenarioQuizProps {
  quiz: ScenarioQuiz;
  savedAnswerId?: string;
  onAnswerSelected: (optionId: string) => void;
}

export function ScenarioQuizComponent({
  quiz,
  savedAnswerId,
  onAnswerSelected,
}: ScenarioQuizProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>(
    savedAnswerId,
  );
  const [showFeedback, setShowFeedback] = useState<boolean>(
    Boolean(savedAnswerId),
  );

  const handleSelect = (optionId: string) => {
    setSelectedId(optionId);
    setShowFeedback(true);
    onAnswerSelected(optionId);
  };

  const selectedOption = quiz.options.find((opt) => opt.id === selectedId);

  return (
    <div className="my-6 rounded-2xl border border-slate-300 bg-white p-5 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-100 text-[#152d50]">
          <HelpCircle className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              End-of-chapter Quiz
            </span>
            {quiz.standardReference && (
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                Ref: {quiz.standardReference}
              </span>
            )}
          </div>
          <h4 className="mt-2 text-base font-bold text-slate-900 leading-snug">
            {quiz.question}
          </h4>
          {quiz.context && (
            <p className="mt-1 text-xs text-slate-500 italic">
              Floor Context: {quiz.context}
            </p>
          )}
        </div>
      </div>

      {/* Options List */}
      <div
        className="mt-5 space-y-2.5"
        role="radiogroup"
        aria-label={quiz.question}
      >
        {quiz.options.map((option, index) => {
          const isSelected = selectedId === option.id;
          const isRevealed = showFeedback;
          const isCorrect = option.isCorrect;

          let optionStyle =
            'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-800';

          if (isRevealed) {
            if (isSelected) {
              optionStyle = isCorrect
                ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/30'
                : 'border-red-500 bg-red-50/80 text-red-950 ring-2 ring-red-500/30';
            } else if (isCorrect) {
              optionStyle =
                'border-emerald-300 bg-emerald-50/40 text-emerald-900';
            } else {
              optionStyle =
                'border-slate-200 bg-slate-50 text-slate-500 opacity-70';
            }
          }

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-label={option.text}
              aria-checked={isSelected}
              onClick={() => handleSelect(option.id)}
              className={cn(
                'group flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-xs transition-all focus-visible:outline-2 focus-visible:outline-[#203d68]',
                optionStyle,
              )}
            >
              <div
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-bold transition-colors',
                  isRevealed && isSelected
                    ? isCorrect
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-red-600 bg-red-600 text-white'
                    : isRevealed && isCorrect
                      ? 'border-emerald-600 bg-emerald-100 text-emerald-800'
                      : 'border-slate-300 bg-white text-slate-700 group-hover:border-slate-400',
                )}
              >
                {String.fromCharCode(65 + index)}
              </div>

              <div className="min-w-0 flex-1">
                <span className="font-medium leading-relaxed">
                  {option.text}
                </span>
              </div>

              {isRevealed && isSelected && (
                <div className="shrink-0">
                  {isCorrect ? (
                    <CheckCircle2
                      className="size-5 text-emerald-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <XCircle
                      className="size-5 text-red-600"
                      aria-hidden="true"
                    />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Immediate Feedback Box */}
      {showFeedback && selectedOption && (
        <div
          role="status"
          className={cn(
            'mt-4 rounded-xl border p-4 text-xs transition-all animate-in fade-in',
            selectedOption.isCorrect
              ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
              : 'border-red-300 bg-red-50 text-red-950',
          )}
        >
          <div className="flex items-start gap-2.5">
            {selectedOption.isCorrect ? (
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
            ) : (
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-red-700"
                aria-hidden="true"
              />
            )}
            <div className="space-y-1">
              <p className="font-bold">
                {selectedOption.isCorrect
                  ? 'Correct Decision'
                  : 'Incorrect Choice — Safety / Quality Risk'}
              </p>
              <p className="leading-relaxed">{selectedOption.explanation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
