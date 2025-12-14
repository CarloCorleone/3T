"use client"

import * as React from "react"
import { Check, ChevronsUpDown, User } from "lucide-react"
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
import { Customer } from "@/lib/supabase"

interface CustomerSearchProps {
  customers: Customer[]
  value?: string
  onSelect: (customer: Customer | null) => void
  placeholder?: string
}

export function CustomerSearch({
  customers,
  value,
  onSelect,
  placeholder = "Buscar cliente...",
}: CustomerSearchProps) {
  const [open, setOpen] = React.useState(false)

  const selectedCustomer = customers.find((c) => c.customer_id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCustomer ? (
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {selectedCustomer.name}
              {selectedCustomer.customer_type && (
                <span className="text-xs text-muted-foreground">
                  ({selectedCustomer.customer_type === 'Empresa' ? '🏢' : '🏠'})
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar cliente..." />
          <CommandList>
            <CommandEmpty>No se encontraron clientes.</CommandEmpty>
            <CommandGroup>
              {customers.map((customer) => (
                <CommandItem
                  key={customer.customer_id}
                  value={customer.name || ''}
                  onSelect={() => {
                    onSelect(customer.customer_id === value ? null : customer)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === customer.customer_id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{customer.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {customer.customer_type === 'Empresa' ? '🏢 Empresa' : '🏠 Hogar'}
                      </span>
                      {customer.phone && (
                        <span>• {customer.phone}</span>
                      )}
                    </div>
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

