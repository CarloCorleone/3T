'use client'

import * as React from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"
import { NotificationBell } from "@/components/notification-bell"
import { AuthGuard } from "@/components/auth-guard"
import { ChatWidget } from "@/components/chatbot/chat-widget"
import { WaterMasterModal } from "@/components/water-master-modal"
import { useTripleClick } from "@/hooks/useTripleClick"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { usePathname } from "next/navigation"

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const [showEasterEgg, setShowEasterEgg] = React.useState(false)
  const [stats, setStats] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)

  // Cargar stats del easter egg
  const loadEasterEggStats = async () => {
    if (loading) return
    setLoading(true)
    try {
      const { data: ordersData } = await supabase
        .from('3t_orders')
        .select('quantity, final_price, order_date, delivered_date, customer_id')
        .eq('status', 'Despachado')

      const { data: customersData } = await supabase
        .from('3t_customers')
        .select('customer_id')

      const totalBottles = ordersData?.reduce((sum, order) => sum + (order.quantity || 0), 0) || 0
      const totalRevenue = ordersData?.reduce((sum, order) => sum + (order.final_price || 0), 0) || 0
      const totalOrders = ordersData?.length || 0

      const deliveryTimes = ordersData
        ?.filter(o => o.order_date && o.delivered_date)
        .map(o => {
          const orderDate = new Date(o.order_date)
          const deliveredDate = new Date(o.delivered_date)
          return (deliveredDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60)
        }) || []

      const avgDeliveryTime = deliveryTimes.length > 0
        ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
        : 0

      const firstOrderDate = ordersData && ordersData.length > 0
        ? new Date(Math.min(...ordersData.map(o => new Date(o.order_date).getTime())))
        : new Date()
      const daysActive = Math.floor((new Date().getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24))

      setStats({
        totalBottles,
        totalRevenue,
        totalOrders,
        avgDeliveryTime,
        customersServed: customersData?.length || 0,
        daysActive: Math.max(daysActive, 1)
      })

      setShowEasterEgg(true)
    } catch (error) {
      console.error('Error cargando stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTripleClick = useTripleClick(() => {
    loadEasterEggStats()
  })

  // Si es página de login, renderizar sin sidebar
  if (isLoginPage) {
    return <AuthGuard>{children}</AuthGuard>
  }

  // Para otras páginas, renderizar con sidebar y auth guard
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex flex-1 items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Logo clickeable para Easter Egg */}
                <div 
                  onClick={handleTripleClick}
                  className="relative h-7 w-7 flex-shrink-0 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                  title="🎮 Triple-click para sorpresa..."
                >
                  <Image
                    src="/images/logos/logo-cuadrado-250x250.png"
                    alt="Tres Torres"
                    width={28}
                    height={28}
                    className="rounded object-contain"
                  />
                </div>
                <h1 className="text-lg font-semibold">Agua Tres Torres</h1>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <NotificationBell />
                <UserMenu />
              </div>
            </div>
          </header>
          <main className="flex flex-1 flex-col overflow-auto min-w-0">
            {children}
          </main>
        </SidebarInset>
        {/* Chatbot Widget - disponible en todas las páginas */}
        <ChatWidget />
        
        {/* Easter Egg Modal */}
        <WaterMasterModal 
          open={showEasterEgg}
          onOpenChange={setShowEasterEgg}
          stats={stats}
        />
      </SidebarProvider>
    </AuthGuard>
  )
}


