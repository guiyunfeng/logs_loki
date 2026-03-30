import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MultiSelectDropdown({ label, options, selected, onChange, disabled, placeholder }: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter(s => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const allSelected = options.length > 0 && selected.length === options.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors border ${
          disabled
            ? 'bg-gray-800/50 border-gray-700/50 text-gray-600 cursor-not-allowed'
            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
        }`}
      >
        <span className="text-gray-500">{label}:</span>
        {selected.length === 0 ? (
          <span className="text-gray-500">{placeholder || '全部'}</span>
        ) : selected.length === options.length ? (
          <span className="text-gray-400">全部</span>
        ) : selected.length <= 2 ? (
          <span className="text-gray-300 max-w-[120px] truncate">{selected.join(', ')}</span>
        ) : (
          <span className="text-gray-300">{selected.length} 项</span>
        )}
        <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 min-w-[200px] max-h-[280px] overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
          {/* 全选/取消 */}
          <button
            onClick={() => onChange(allSelected ? [] : [...options])}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:bg-gray-700/50 border-b border-gray-700"
          >
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
              allSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600'
            }`}>
              {allSelected && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            全选
          </button>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => toggle(opt)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700/50"
            >
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                selected.includes(opt) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600'
              }`}>
                {selected.includes(opt) && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="font-mono">{opt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
