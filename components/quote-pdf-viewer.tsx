"use client"

import * as React from "react"
import { FileText, Download, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { downloadPDF } from "@/lib/storage"

interface QuotePDFViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pdfUrl: string
  quoteNumber: string
}

export function QuotePDFViewer({
  open,
  onOpenChange,
  pdfUrl,
  quoteNumber,
}: QuotePDFViewerProps) {
  const handleDownload = () => {
    downloadPDF(pdfUrl, `Presupuesto-${quoteNumber}.pdf`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] flex flex-col p-0">
        {/* Header compacto con botones integrados */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <DialogTitle className="text-lg font-semibold">
                Presupuesto {quoteNumber}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Vista previa del documento
              </DialogDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
          </div>
        </div>

        {/* Visor de PDF - ocupa todo el espacio restante */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-hidden">
          <iframe
            src={pdfUrl}
            className="w-full h-full"
            title={`Presupuesto ${quoteNumber}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}


