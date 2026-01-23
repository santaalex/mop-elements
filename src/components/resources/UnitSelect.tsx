import * as React from "react"
import { Check, ChevronsUpDown, Clock, Coins, Hash, Percent, Ruler } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

const UNIT_GROUPS = [
    {
        label: "通用 (General)",
        icon: Hash,
        units: [
            { value: "个", label: "个 (Count)" },
            { value: "次", label: "次 (Times)" },
            { value: "件", label: "件 (Pieces)" },
            { value: "批", label: "批 (Batches)" },
        ]
    },
    {
        label: "比率 (Ratio)",
        icon: Percent,
        units: [
            { value: "%", label: "百分比 (%)" },
            { value: "‰", label: "千分比 (‰)" },
            { value: "score", label: "评分 (Score)" },
        ]
    },
    {
        label: "时间 (Time)",
        icon: Clock,
        units: [
            { value: "ms", label: "毫秒 (ms)" },
            { value: "s", label: "秒 (s)" },
            { value: "min", label: "分 (min)" },
            { value: "h", label: "小时 (h)" },
            { value: "d", label: "天 (d)" },
        ]
    },
    {
        label: "货币 (Currency)",
        icon: Coins,
        units: [
            { value: "¥", label: "人民币 (CNY)" },
            { value: "$", label: "美元 (USD)" },
            { value: "万元", label: "万元 (10k)" },
        ]
    },
    {
        label: "其他 (Other)",
        icon: Ruler,
        units: [
            { value: "kg", label: "千克 (kg)" },
            { value: "m", label: "米 (m)" },
        ]
    }
]

// Flattened list for search
const ALL_UNITS = UNIT_GROUPS.flatMap(g => g.units)

export interface UnitSelectProps {
    value?: string
    onChange: (value: string) => void
    disabled?: boolean
}

export function UnitSelect({ value, onChange, disabled }: UnitSelectProps) {
    const [open, setOpen] = React.useState(false)

    // Find label for current value
    const currentUnit = ALL_UNITS.find(u => u.value === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-between h-7 text-xs px-2"
                >
                    <span className="truncate">
                        {value ? (currentUnit?.value || value) : "单位..."}
                    </span>
                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-white dark:bg-zinc-950" align="end">
                <Command>
                    <CommandInput placeholder="搜索单位..." className="h-8 text-xs" />
                    <CommandList>
                        <CommandEmpty className="py-2 text-xs text-center text-muted-foreground">未找到单位</CommandEmpty>
                        {UNIT_GROUPS.map((group) => (
                            <CommandGroup key={group.label} heading={group.label}>
                                {group.units.map((unit) => (
                                    <CommandItem
                                        key={unit.value}
                                        value={unit.label} // Search by label
                                        onSelect={() => {
                                            onChange(unit.value)
                                            setOpen(false)
                                        }}
                                        className="text-xs py-1.5"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-3 w-3",
                                                value === unit.value ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {unit.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

/**
 * Smart inference helper
 */
export function inferUnitFromName(name: string): string | null {
    if (!name) return null;
    const n = name.trim().toLowerCase();

    // Ratio / Percentage (Priority as user requested)
    if (n.includes('率') || n.includes('比') || n.includes('rate') || n.includes('ratio') || n.includes('percent')) return '%';

    // Time
    if (n.includes('时') || n.includes('久') || n.includes('delay') || n.includes('duration') || n.includes('time')) {
        if (n.includes('秒') || n.includes('second')) return 's';
        if (n.includes('分') || n.includes('minute')) return 'min';
        if (n.includes('天') || n.includes('day')) return 'd';
        return 'h'; // Default common business time
    }

    // Money
    if (n.includes('额') || n.includes('费') || n.includes('钱') || n.includes('收') || n.includes('cost') || n.includes('price') || n.includes('revenue')) return '¥';

    // Count
    if (n.includes('数') || n.includes('量') || n.includes('count') || n.includes('amount') || n.includes('total')) return '个';

    return null;
}
