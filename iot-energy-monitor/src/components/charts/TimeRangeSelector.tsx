import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Clock } from 'lucide-react';

export type TimeRange = '1hr' | '12hrs' | '24hrs' | '7days' | '30days' | 'custom';

interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  selectedRange,
  onRangeChange
}) => {
  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: '1hr', label: 'Last 1 Hour' },
    { value: '12hrs', label: 'Last 12 Hours' },
    { value: '24hrs', label: 'Last 24 Hours' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
  ];

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center">
          <Clock className="h-4 w-4 mr-2 text-blue-600" />
          Time Range
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => onRangeChange(range.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                selectedRange === range.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeRangeSelector;
