'use client';

interface DateRangePickerProps {
  onDateChange: (from: string | null, to: string | null) => void;
}

export default function DateRangePicker({ onDateChange }: DateRangePickerProps) {
  return (
    <div className="d-flex gap-2">
      <input
        type="date"
        className="form-control form-control-sm"
        onChange={(e) => onDateChange(e.target.value, null)}
        placeholder="Valid From"
      />
      <input
        type="date"
        className="form-control form-control-sm"
        onChange={(e) => onDateChange(null, e.target.value)}
        placeholder="Valid Until"
      />
    </div>
  );
}

