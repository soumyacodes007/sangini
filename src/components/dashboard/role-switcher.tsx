"use client"

import * as React from "react"
import { Check, ChevronsUpDown, User, Building, Briefcase } from "lucide-react"
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
import { useStore } from "@/lib/store"
import { UserRole } from "@/lib/contracts/config"

const roles = [
    {
        value: UserRole.Supplier,
        label: "Supplier View",
        icon: Building,
        desc: "Mint invoices, receive funds"
    },
    {
        value: UserRole.Buyer,
        label: "Buyer View",
        icon: Briefcase,
        desc: "Verify invoices, settle payments"
    },
    {
        value: UserRole.Investor,
        label: "Investor View",
        icon: User,
        desc: "Browse market, earn yield"
    },
    {
        value: UserRole.Admin,
        label: "Admin View",
        icon: User,
        desc: "Manage Platform"
    }
]

export function RoleSwitcher() {
    const [open, setOpen] = React.useState(false)
    const { demoRole, setDemoRole } = useStore()

    const activeRole = roles.find((role) => role.value === demoRole) || roles[0]

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-14 px-3 border-dashed"
                >
                    <div className="flex items-center gap-3 text-left">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <activeRole.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-semibold text-sm">{activeRole.label}</span>
                            <span className="text-xs text-muted-foreground">Demo Mode</span>
                        </div>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0">
                <Command>
                    <CommandList>
                        <CommandGroup heading="Switch Role (Demo)">
                            {roles.map((role) => (
                                <CommandItem
                                    key={role.value}
                                    value={role.value}
                                    onSelect={(currentValue) => {
                                        setDemoRole(role.value)
                                        setOpen(false)
                                    }}
                                    className="cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            demoRole === role.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span>{role.label}</span>
                                        <span className="text-xs text-muted-foreground">{role.desc}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
