"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { RoleGuard } from "@/components/role-guard"
import {
  FileText,
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  Filter,
  RefreshCw,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { QuoteStatusBadge } from "@/components/quote-status-badge"
import { QuotePDFViewer } from "@/components/quote-pdf-viewer"
import { QuoteForm } from "@/components/quote-form"
import { supabase, Quote, QuoteItem } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { generateQuotePDF, downloadQuotePDF } from "@/lib/pdf-generator"
import { uploadQuotePDF, downloadPDF } from "@/lib/storage"

export default function PresupuestosPage() {
  const { toast } = useToast()
  const [quotes, setQuotes] = React.useState<Quote[]>([])
  const [filteredQuotes, setFilteredQuotes] = React.useState<Quote[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isCreating, setIsCreating] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [selectedQuote, setSelectedQuote] = React.useState<Quote | null>(null)
  const [viewingPDF, setViewingPDF] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [quoteToDelete, setQuoteToDelete] = React.useState<string | null>(null)
  const [editingQuote, setEditingQuote] = React.useState<Quote | null>(null)

  // Filtros
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")

  // Cargar presupuestos
  React.useEffect(() => {
    fetchQuotes()
  }, [])

  // Aplicar filtros
  React.useEffect(() => {
    let filtered = [...quotes]

    // Filtro de búsqueda
    if (searchQuery) {
      filtered = filtered.filter(
        (q) =>
          q.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filtro de estado
    if (statusFilter !== "all") {
      filtered = filtered.filter((q) => q.status === statusFilter)
    }

    setFilteredQuotes(filtered)
  }, [quotes, searchQuery, statusFilter])

  const fetchQuotes = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("3t_quotes")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setQuotes(data || [])
    } catch (error) {
      console.error("Error al cargar presupuestos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateQuote = async (formData: any) => {
    setIsSaving(true)
    try {
      // Generar número de presupuesto
      const { data: quoteNumberData, error: quoteNumberError } = await supabase
        .rpc("generate_quote_number")

      if (quoteNumberError) throw quoteNumberError
      const quoteNumber = quoteNumberData

      // Extraer items y crear datos del presupuesto sin el campo items
      const { items, ...quoteDataWithoutItems } = formData

      // Limpiar customer_id: debe ser null si no es un UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (quoteDataWithoutItems.customer_id && !uuidRegex.test(quoteDataWithoutItems.customer_id)) {
        quoteDataWithoutItems.customer_id = null
      }

      // Crear presupuesto
      const quoteData = {
        quote_number: quoteNumber,
        ...quoteDataWithoutItems,
      }

      const { data: newQuote, error: quoteError } = await supabase
        .from("3t_quotes")
        .insert([quoteData])
        .select()
        .single()

      if (quoteError) throw quoteError

      // Crear items (limpiar product_id si no es UUID válido)
      const itemsData = items.map((item: any, index: number) => {
        const itemData: any = {
          quote_id: newQuote.quote_id,
          product_name: item.product_name,
          product_description: item.product_description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price,
          order_index: index,
        }
        
        // Solo incluir product_id si es un UUID válido
        if (item.product_id && uuidRegex.test(item.product_id)) {
          itemData.product_id = item.product_id
        }
        
        return itemData
      })

      const { error: itemsError } = await supabase
        .from("3t_quote_items")
        .insert(itemsData)

      if (itemsError) throw itemsError

      // Generar y subir PDF
      const { data: itemsWithData } = await supabase
        .from("3t_quote_items")
        .select("*")
        .eq("quote_id", newQuote.quote_id)
        .order("order_index")

      const pdfBlob = await generateQuotePDF(newQuote, itemsWithData || [])
      const pdfUrl = await uploadQuotePDF(pdfBlob, quoteNumber)

      // Actualizar con URL del PDF
      if (pdfUrl) {
        await supabase
          .from("3t_quotes")
          .update({ pdf_url: pdfUrl })
          .eq("quote_id", newQuote.quote_id)
      }

      setIsCreating(false)
      fetchQuotes()
      toast({
        title: "Presupuesto creado",
        description: "El presupuesto se creó exitosamente"
      })
    } catch (error) {
      console.error("Error al crear presupuesto:", error)
      toast({
        variant: "destructive",
        title: "Error al crear presupuesto",
        description: "Por favor intenta nuevamente"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownloadPDF = async (quote: Quote) => {
    try {
      if (quote.pdf_url) {
        downloadPDF(quote.pdf_url, `Presupuesto-${quote.quote_number}.pdf`)
      } else {
        // Generar PDF si no existe
        const { data: items } = await supabase
          .from("3t_quote_items")
          .select("*")
          .eq("quote_id", quote.quote_id)
          .order("order_index")

        await downloadQuotePDF(quote, items || [])
      }
    } catch (error) {
      console.error("Error al descargar PDF:", error)
      toast({
        variant: "destructive",
        title: "Error al descargar PDF",
        description: "Por favor intenta nuevamente"
      })
    }
  }

  const handleViewPDF = (quote: Quote) => {
    setSelectedQuote(quote)
    setViewingPDF(true)
  }

  const handleChangeStatus = async (quoteId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("3t_quotes")
        .update({ status: newStatus })
        .eq("quote_id", quoteId)

      if (error) throw error
      fetchQuotes()
    } catch (error) {
      console.error("Error al cambiar estado:", error)
      toast({
        variant: "destructive",
        title: "Error al cambiar estado",
        description: "Por favor intenta nuevamente"
      })
    }
  }

  const openDeleteDialog = (quoteId: string) => {
    setQuoteToDelete(quoteId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteQuote = async () => {
    if (!quoteToDelete) return

    try {
      const { error } = await supabase
        .from("3t_quotes")
        .delete()
        .eq("quote_id", quoteToDelete)

      if (error) throw error
      setDeleteDialogOpen(false)
      setQuoteToDelete(null)
      fetchQuotes()
      toast({
        title: "Presupuesto eliminado",
        description: "El presupuesto se eliminó correctamente"
      })
    } catch (error) {
      console.error("Error al eliminar presupuesto:", error)
      toast({
        variant: "destructive",
        title: "Error al eliminar presupuesto",
        description: "Por favor intenta nuevamente"
      })
    }
  }

  // Calcular métricas
  const metrics = React.useMemo(() => {
    const total = filteredQuotes.length
    const totalAmount = filteredQuotes.reduce((sum, q) => sum + q.total, 0)
    const byStatus = {
      borrador: filteredQuotes.filter((q) => q.status === "borrador").length,
      enviado: filteredQuotes.filter((q) => q.status === "enviado").length,
      aprobado: filteredQuotes.filter((q) => q.status === "aprobado").length,
      rechazado: filteredQuotes.filter((q) => q.status === "rechazado").length,
    }

    return { total, totalAmount, byStatus }
  }, [filteredQuotes])

  return (
    <RoleGuard allowedRoles={['admin']} showMessage>
      <div className="p-6 space-y-6">
      {/* ENCABEZADO */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Presupuestos
          </h1>
          <p className="text-muted-foreground">
            Gestiona presupuestos y genera PDFs profesionales
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Presupuesto
        </Button>
      </div>

      {/* LISTA DE PRESUPUESTOS */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Presupuestos</CardTitle>
          <CardDescription>
            {filteredQuotes.length} presupuesto{filteredQuotes.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por número o cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="aprobado">Aprobado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={fetchQuotes}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>

          {/* Tabla */}
          <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Presupuesto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Válido Hasta</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : filteredQuotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No se encontraron presupuestos
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotes.map((quote) => (
                  <TableRow key={quote.quote_id}>
                    <TableCell className="font-medium">
                      {quote.quote_number}
                    </TableCell>
                    <TableCell>{quote.customer_name}</TableCell>
                    <TableCell>
                      {quote.created_at
                        ? format(new Date(quote.created_at), "dd/MM/yyyy", {
                            locale: es,
                          })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(quote.valid_until), "dd/MM/yyyy", {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${quote.total.toLocaleString('es-CL')}
                    </TableCell>
                    <TableCell>
                      <QuoteStatusBadge status={quote.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {quote.pdf_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPDF(quote)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDF(quote)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(quote.quote_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* DIALOG: CREAR PRESUPUESTO */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Presupuesto</DialogTitle>
            <DialogDescription>
              Complete los datos para generar un nuevo presupuesto
            </DialogDescription>
          </DialogHeader>
          <QuoteForm
            onSubmit={handleCreateQuote}
            onCancel={() => setIsCreating(false)}
            isLoading={isSaving}
          />
        </DialogContent>
      </Dialog>

      {/* DIALOG: VER PDF */}
      {selectedQuote && selectedQuote.pdf_url && (
        <QuotePDFViewer
          open={viewingPDF}
          onOpenChange={setViewingPDF}
          pdfUrl={selectedQuote.pdf_url}
          quoteNumber={selectedQuote.quote_number}
        />
      )}
      </div>
      {/* DIALOG: CONFIRMAR ELIMINACIÓN */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar presupuesto?</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este presupuesto? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteQuote}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleGuard>
  )
}


