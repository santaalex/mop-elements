import React, { useState } from 'react';
import { Plus, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useResourceStore } from '@/lib/store/resource-store';
import { ResourceKpi } from '@/lib/schema/dsl';
import { inferUnitFromName } from './UnitSelect';

interface CreativeKPISelectProps {
    value?: string; // KPI Definition ID
    onChange: (kpiId: string) => void; // Returns the Definition ID
    disabled?: boolean;
}

export function CreativeKPISelect({ value, onChange, disabled }: CreativeKPISelectProps) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');

    const kpiDefinitions = useResourceStore((state) => state.kpiDefinitions);
    const addKpiDefinition = useResourceStore((state) => state.addKpiDefinition);

    const selectedKpi = kpiDefinitions.find((k) => k.id === value);

    const handleCreateKpi = () => {
        if (!inputValue.trim()) return;

        const inferredUnit = inferUnitFromName(inputValue.trim()) || '个';
        const newId = `kpi_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newKpi: ResourceKpi = {
            id: newId,
            name: inputValue.trim(),
            unit: inferredUnit,
            thresholds: {
                warning: 80,
                critical: 50
            }
        };

        addKpiDefinition(newKpi);
        onChange(newKpi.id);
        setOpen(false);
        setInputValue('');
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-between"
                >
                    {selectedKpi ? (
                        <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{selectedKpi.name}</span>
                            <span className="text-xs text-muted-foreground">({selectedKpi.unit})</span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">选择或创建指标 (Select or create)...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 bg-white dark:bg-zinc-950" align="start">
                <Command>
                    <CommandInput
                        placeholder="搜索指标 (Search KPI)..."
                        value={inputValue}
                        onValueChange={setInputValue}
                    />
                    <CommandList>
                        <CommandEmpty className="py-2 px-2 text-sm">
                            {inputValue ? (
                                <button
                                    onClick={handleCreateKpi}
                                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>创建 "{inputValue}" (Create)</span>
                                </button>
                            ) : (
                                <span>未找到相关指标 (No KPI found)</span>
                            )}
                        </CommandEmpty>

                        <CommandGroup heading="已有指标 (Existing KPIs)">
                            {kpiDefinitions.map((kpi) => (
                                <CommandItem
                                    key={kpi.id}
                                    value={`${kpi.name}-${kpi.id}`.toLowerCase()}
                                    className="cursor-pointer data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"
                                    disabled={false}
                                    onSelect={() => {
                                        onChange(kpi.id === value ? '' : kpi.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === kpi.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <span>{kpi.name}</span>
                                    <span className="ml-auto text-xs text-muted-foreground">{kpi.unit}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
