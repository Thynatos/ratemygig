import { X } from 'lucide-react'
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
        <div className="flex flex-wrap items-end gap-2">
            <div>
                <label htmlFor="date-from" className="input-label">
                    From
                </label>
                <input
                    id="date-from"
                    type="date"
                    value={fromDate}
                    onChange={e => onFromChange(e.target.value)}
                    className={cn(
                        'input-field w-full sm:w-40 voice-data text-ui-sm',
                        !fromDate && 'text-bone-faint'
                    )}
                />
            </div>

            <div>
                <label htmlFor="date-to" className="input-label">
                    Until
                </label>
                <input
                    id="date-to"
                    type="date"
                    value={toDate}
                    onChange={e => onToChange(e.target.value)}
                    min={fromDate || undefined}
                    className={cn(
                        'input-field w-full sm:w-40 voice-data text-ui-sm',
                        !toDate && 'text-bone-faint'
                    )}
                />
            </div>

            {hasValue && onClear && (
                <button
                    type="button"
                    onClick={onClear}
                    className="btn-icon"
                    aria-label="Clear the date range"
                >
                    <X className="w-4 h-4" aria-hidden="true" />
                </button>
            )}
        </div>
    )
}
