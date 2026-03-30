import { Calendar, Clock } from 'lucide-react';
import { useState } from 'react';

interface TimeRangeSelectorProps {
  onRangeChange: (start: Date, end: Date) => void;
}

export function TimeRangeSelector({ onRangeChange }: TimeRangeSelectorProps) {
  const [activeRange, setActiveRange] = useState('1h');

  const quickRanges = [
    { label: '最近 5 分钟', value: '5m', minutes: 5 },
    { label: '最近 15 分钟', value: '15m', minutes: 15 },
    { label: '最近 30 分钟', value: '30m', minutes: 30 },
    { label: '最近 1 小时', value: '1h', minutes: 60 },
    { label: '最近 3 小时', value: '3h', minutes: 180 },
    { label: '最近 6 小时', value: '6h', minutes: 360 },
    { label: '最近 12 小时', value: '12h', minutes: 720 },
    { label: '最近 24 小时', value: '24h', minutes: 1440 },
    { label: '最近 7 天', value: '7d', minutes: 10080 },
  ];

  const handleQuickRange = (range: typeof quickRanges[0]) => {
    const end = new Date();
    const start = new Date(end.getTime() - range.minutes * 60 * 1000);
    setActiveRange(range.value);
    onRangeChange(start, end);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">时间范围</span>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {quickRanges.map((range) => (
          <button
            key={range.value}
            onClick={() => handleQuickRange(range)}
            className={`px-3 py-2 text-sm rounded transition-colors ${
              activeRange === range.value
                ? 'bg-indigo-600 text-white font-medium'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-3">
        <Calendar className="w-4 h-4 text-gray-600" />
        <span className="text-sm text-gray-600">自定义时间范围:</span>
        <input
          type="datetime-local"
          className="px-3 py-1 text-sm border border-gray-300 rounded"
        />
        <span className="text-sm text-gray-600">至</span>
        <input
          type="datetime-local"
          className="px-3 py-1 text-sm border border-gray-300 rounded"
        />
        <button className="px-4 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700">
          应用
        </button>
      </div>
    </div>
  );
}
