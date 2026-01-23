import React, { useState, useEffect } from 'react';
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
    CommandSeparator,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useResourceStore } from '@/lib/store/resource-store';
import { ResourceRole } from '@/lib/schema/dsl';

interface CreativeRoleSelectProps {
    value?: string; // Role ID
    onChange: (roleId: string) => void;
    disabled?: boolean;
}

export function CreativeRoleSelect({ value, onChange, disabled }: CreativeRoleSelectProps) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');

    const roles = useResourceStore((state) => state.roles);
    const addRole = useResourceStore((state) => state.addRole);

    const selectedRole = roles.find((r) => r.id === value);

    const handleCreateRole = () => {
        if (!inputValue.trim()) return;

        const newId = `role_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newRole: ResourceRole = {
            id: newId,
            name: inputValue.trim(),
            description: '通过泳道编辑器创建 (Created via Swimlane Editor)',
        };

        addRole(newRole);
        onChange(newRole.id);
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
                    {selectedRole ? (
                        <div className="flex items-center gap-2">
                            {/* Future: Avatar or Color dot here */}
                            <span>{selectedRole.name}</span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">选择或创建角色 (Select or create)...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 bg-white dark:bg-zinc-950" align="start">
                <Command>
                    <CommandInput
                        placeholder="搜索或创建角色 (Search or create role)..."
                        value={inputValue}
                        onValueChange={setInputValue}
                    />
                    <CommandList>
                        <CommandEmpty className="py-2 px-2 text-sm">
                            {inputValue ? (
                                <button
                                    onClick={handleCreateRole}
                                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>创建 "{inputValue}" (Create)</span>
                                </button>
                            ) : (
                                <span>未找到相关角色 (No role found)</span>
                            )}
                        </CommandEmpty>

                        <CommandGroup heading="已有角色 (Existing Roles)">
                            {roles.map((role) => (
                                <CommandItem
                                    key={role.id}
                                    value={`${role.name}-${role.id}`.toLowerCase()} // Create unique, lowercase value for cmdk
                                    className="cursor-pointer data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"
                                    disabled={false}
                                    onSelect={() => {
                                        console.log('[CreativeRoleSelect] Clicked role:', role.name, role.id, 'Current value:', value);
                                        onChange(role.id === value ? '' : role.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === role.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {role.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
