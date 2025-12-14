"use client"

import * as React from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { addDays, format } from "date-fns"
import { Plus, Trash2, User, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ProductSearch } from "@/components/product-search"
import { supabase, Customer, Product, IVA_RATE } from "@/lib/supabase"

// Condiciones de pago predefinidas
const PAYMENT_CONDITIONS = [
  { value: "Contado", label: "Contado" },
  { value: "Crédito 30 días", label: "Crédito 30 días" },
  { value: "Crédito 60 días", label: "Crédito 60 días" },
  { value: "Crédito 90 días", label: "Crédito 90 días" },
]

// Schema de validación
const quoteItemSchema = z.object({
  product_id: z.string().optional(),
  product_name: z.string().min(1, "El nombre del producto es requerido"),
  product_description: z.string().optional(),
  quantity: z.number().min(1, "La cantidad debe ser al menos 1"),
  unit_price: z.number().min(0, "El precio debe ser mayor o igual a 0"),
})

const quoteFormSchema = z.object({
  customer_id: z.string().optional(),
  address_id: z.string().optional(),
  customer_name: z.string().min(1, "El nombre del cliente es requerido"),
  customer_rut: z.string().optional(),
  customer_email: z.string().email("Email inválido").optional().or(z.literal("")),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  payment_conditions: z.string().min(1, "Debe seleccionar condiciones de pago"),
  observations: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, "Debe agregar al menos un item"),
})

type QuoteFormValues = z.infer<typeof quoteFormSchema>

interface QuoteFormProps {
  onSubmit: (data: any) => void
  onCancel: () => void
  initialData?: Partial<QuoteFormValues>
  isLoading?: boolean
}

export function QuoteForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: QuoteFormProps) {
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [products, setProducts] = React.useState<Product[]>([])
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null)
  const [customerAddresses, setCustomerAddresses] = React.useState<any[]>([])

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: initialData || {
      customer_name: "",
      customer_rut: "",
      customer_email: "",
      customer_phone: "",
      customer_address: "",
      address_id: "",
      payment_conditions: "Contado",
      observations: "",
      items: [
        {
          product_name: "",
          product_description: "",
          quantity: 1,
          unit_price: 0,
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })
  const items = form.watch("items")

  // Cargar clientes y productos
  React.useEffect(() => {
    fetchCustomers()
    fetchProducts()
  }, [])

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("3t_customers")
      .select("*")
      .order("name")

    if (!error && data) {
      setCustomers(data)
    }
  }

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("3t_products")
      .select("*")
      .order("name")

    if (!error && data) {
      setProducts(data)
    }
  }

  // Manejar selección de cliente existente
  const handleCustomerSelect = async (customer: Customer) => {
    setSelectedCustomer(customer)
    form.setValue("customer_id", customer.customer_id)
    form.setValue("customer_name", customer.name || "")
    form.setValue("customer_rut", customer.rut || "")
    form.setValue("customer_email", customer.email || "")
    form.setValue("customer_phone", customer.phone || "")
    
    // Cargar las direcciones del cliente
    const { data: addresses, error } = await supabase
      .from("3t_addresses")
      .select("*")
      .eq("customer_id", customer.customer_id)
      .order("is_default", { ascending: false })
    
    if (!error && addresses && addresses.length > 0) {
      setCustomerAddresses(addresses)
      // Seleccionar la dirección por defecto o la primera
      const defaultAddress = addresses.find((addr: any) => addr.is_default) || addresses[0]
      form.setValue("address_id", defaultAddress.address_id)
      form.setValue("customer_address", defaultAddress.raw_address || "")
    } else {
      setCustomerAddresses([])
      form.setValue("address_id", "")
      form.setValue("customer_address", "")
    }
  }
  
  // Manejar selección de dirección
  const handleAddressSelect = (addressId: string) => {
    const address = customerAddresses.find((addr: any) => addr.address_id === addressId)
    if (address) {
      form.setValue("address_id", addressId)
      form.setValue("customer_address", address.raw_address || "")
    }
  }

  // Manejar selección de producto
  const handleProductSelect = (product: Product | null, index: number) => {
    if (product) {
      form.setValue(`items.${index}.product_id`, product.product_id)
      form.setValue(`items.${index}.product_name`, product.name || "")
      form.setValue(`items.${index}.unit_price`, product.price_neto || 0)
    }
  }

  // Agregar nuevo item
  const addItem = () => {
    append({
      product_name: "",
      product_description: "",
      quantity: 1,
      unit_price: 0,
    })
  }

  // Remover item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      remove(index)
    }
  }

  // Calcular totales
  const calculateTotals = () => {
    const subtotal = items.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
      0
    )
    const ivaAmount = Math.round(subtotal * IVA_RATE)
    const total = subtotal + ivaAmount

    return { subtotal, ivaAmount, total }
  }

  const { subtotal, ivaAmount, total } = calculateTotals()

  const handleSubmit = (data: QuoteFormValues) => {
    const totals = calculateTotals()
    const validUntil = format(addDays(new Date(), 15), 'yyyy-MM-dd')

    onSubmit({
      ...data,
      subtotal: totals.subtotal,
      iva_amount: totals.ivaAmount,
      total: totals.total,
      valid_until: validUntil,
      status: 'borrador',
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* DATOS DEL CLIENTE */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Datos del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Seleccionar cliente existente */}
            <div>
              <Label>Cliente Existente (opcional)</Label>
              <Select
                value={selectedCustomer?.customer_id}
                onValueChange={(value) => {
                  const customer = customers.find((c) => c.customer_id === value)
                  if (customer) handleCustomerSelect(customer)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.customer_id} value={customer.customer_id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seleccionar dirección del cliente */}
            {customerAddresses.length > 0 && (
              <div>
                <Label>Dirección del Cliente *</Label>
                <Select
                  value={form.watch("address_id")}
                  onValueChange={handleAddressSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar dirección..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customerAddresses.map((address: any) => (
                      <SelectItem key={address.address_id} value={address.address_id}>
                        {address.raw_address || `${address.street_name} ${address.street_number}`}
                        {address.is_default && " (Principal)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            {/* Datos manuales del cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre / Razón Social *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nombre del cliente" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_rut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RUT</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="12.345.678-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="cliente@ejemplo.cl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+56 9 1234 5678" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Calle 123, Comuna, Ciudad" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ITEMS DEL PRESUPUESTO */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Items del Presupuesto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Item {index + 1}</h4>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Buscar producto existente */}
                <div>
                  <Label>Producto del Sistema (opcional)</Label>
                  <ProductSearch
                    products={products}
                    value={item.product_id}
                    onSelect={(product) => handleProductSelect(product, index)}
                    placeholder="Buscar producto..."
                  />
                </div>

                {/* Datos del item */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Nombre del Producto *</Label>
                    <Input
                      {...form.register(`items.${index}.product_name`)}
                      placeholder="Nombre del producto"
                    />
                  </div>

                  <div>
                    <Label>Descripción</Label>
                    <Input
                      {...form.register(`items.${index}.product_description`)}
                      placeholder="Descripción opcional"
                    />
                  </div>

                  <div>
                    <Label>Cantidad *</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      {...form.register(`items.${index}.quantity`, {
                        valueAsNumber: true,
                      })}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>

                  <div>
                    <Label>Precio Unitario ($) *</Label>
                    <Input
                      type="number"
                      min="0"
                      {...form.register(`items.${index}.unit_price`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                </div>

                {/* Subtotal del item */}
                <div className="text-right font-medium">
                  Subtotal: ${((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('es-CL')}
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Item
            </Button>
          </CardContent>
        </Card>

        {/* CONDICIONES Y TOTALES */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <FormField
              control={form.control}
              name="payment_conditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condiciones de Pago *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar condición" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_CONDITIONS.map((condition) => (
                        <SelectItem key={condition.value} value={condition.value}>
                          {condition.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Observaciones adicionales..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* TOTALES */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">${subtotal.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IVA (19%):</span>
                <span className="font-medium">${ivaAmount.toLocaleString('es-CL')}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>TOTAL:</span>
                <span>${total.toLocaleString('es-CL')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BOTONES DE ACCIÓN */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar Presupuesto"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

