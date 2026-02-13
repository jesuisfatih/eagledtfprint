'use client';

interface DateRangeFilterProps {
  onDateChange: (from: string, to: string) => void;
}

export default function DateRangeFilter({ onDateChange }: DateRangeFilterProps) {
  const getPreset = (preset: string) => {
    const now = new Date();
    let from = new Date();
    
    switch (preset) {
      case 'today':
        from = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        from = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        from = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        from = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        from = new Date(0);
    }
    
    onDateChange(from.toISOString(), new Date().toISOString());
  };

  return (
    <div className="d-flex gap-2 mb-4">
      <button onClick={() => getPreset('today')} className="btn btn-sm btn-label-primary">Today</button>
      <button onClick={() => getPreset('week')} className="btn btn-sm btn-label-primary">Last 7 Days</button>
      <button onClick={() => getPreset('month')} className="btn btn-sm btn-label-primary">Last Month</button>
      <button onClick={() => getPreset('year')} className="btn btn-sm btn-label-primary">Last Year</button>
    </div>
  );
}

