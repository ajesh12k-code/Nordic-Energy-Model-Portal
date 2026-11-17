import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { UNIT_GLOSSARY } from '../config/unitGlossary';

/**
 * Collapsible reference strip helping non-technical stakeholders interpret
 * power, energy, carbon intensity, wind speed, and heating units.
 */
export function UnitsExplainerBar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800/50 transition cursor-pointer"
      >
        <span className="flex items-center gap-2 font-medium">
          <HelpCircle className="w-4 h-4 text-sky-400 shrink-0" />
          <span>New to Energy Units? (Plain-English Guide to MW, MWh, gCO₂/kWh & m/s)</span>
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <span>{open ? 'Hide Units' : 'Explain Units'}</span>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-800 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {UNIT_GLOSSARY.map((item) => (
            <div
              key={item.unit}
              className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1"
            >
              <div className="font-mono font-bold text-emerald-400">{item.unit}</div>
              <div className="font-semibold text-slate-200">{item.name}</div>
              <p className="text-[11px] text-slate-400 leading-snug">{item.analogy}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
