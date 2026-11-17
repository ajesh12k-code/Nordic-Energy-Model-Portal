import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

export interface ModelGuideContent {
  title: string;
  whatItShows: string;
  howToRead: string[];
  realWorldTakeaway: string;
}

interface ModelExplainerCardProps {
  guide: ModelGuideContent;
  defaultOpen?: boolean;
}

export function ModelExplainerCard({ guide, defaultOpen = false }: ModelExplainerCardProps) {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  return (
    <div className="border border-slate-800 rounded-xl bg-slate-950/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-xs font-medium text-slate-200 hover:bg-slate-800/50 transition cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>How to Read This Model: {guide.title}</span>
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <span>{isOpen ? 'Hide Guide' : 'Show Plain-English Guide'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 grid md:grid-cols-3 gap-4 text-xs leading-relaxed">
          <div className="space-y-1">
            <h4 className="font-semibold text-sky-400 uppercase tracking-wider text-[11px]">
              1. What You Are Looking At
            </h4>
            <p className="text-slate-300">{guide.whatItShows}</p>
          </div>

          <div className="space-y-1">
            <h4 className="font-semibold text-amber-400 uppercase tracking-wider text-[11px]">
              2. How to Read the Lines
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              {guide.howToRead.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-1">
            <h4 className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px]">
              3. Why It Matters
            </h4>
            <p className="text-slate-300">{guide.realWorldTakeaway}</p>
          </div>
        </div>
      )}
    </div>
  );
}
