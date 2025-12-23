import { Calendar, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface DateRangePickerProps {
    fromDate: string
    toDate: string
    onFromChange: (date: string) => void
    onToChange: (date: string) => void
    onClear?: () => void
}

export function DateRangePicker({
    fromDate,
    toDate,
    onFromChange,
    onToChange,
    onClear,
}: DateRangePickerProps) {
    const hasValue = fromDate || toDate

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none" />
                <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => onFromChange(e.target.value)}
                    className={cn(
                        'input-field pl-10 pr-4 w-full sm:w-40 text-sm',
                        !fromDate && 'text-surface-500'
                    )}
                    aria-label="From date"
                />
            </div>

            <span className="text-surface-500 text-center">to</span>

            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none" />
                <input
                    type="date"
                    value={toDate}
                    onChange={(e) => onToChange(e.target.value)}
                    min={fromDate || undefined}
                    className={cn(
                        'input-field pl-10 pr-4 w-full sm:w-40 text-sm',
                        !toDate && 'text-surface-500'
                    )}
                    aria-label="To date"
                />
            </div>

            {hasValue && onClear && (
                <button
                    type="button"
                    onClick={onClear}
                    className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
                    aria-label="Clear date range"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    )
}
