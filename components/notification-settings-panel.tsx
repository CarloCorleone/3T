// =====================================================
// NOTIFICATION SETTINGS PANEL
// Panel de configuración de preferencias de notificaciones
// =====================================================

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, Smartphone, Monitor, Check } from 'lucide-react'
import { useNotificationSettings, useHasPushSubscription } from '@/hooks/use-notification-settings'
import { requestAndInitializePush, unsubscribeFromPush, sendTestNotification } from '@/lib/push-notifications'
import { useToast } from '@/hooks/use-toast'

const notificationTypes = [
  {
    type: 'pedido_despachado' as const,
    label: 'Pedido Despachado',
    description: 'Cuando un pedido cambia de "En Ruta" a "Despachado"',
    icon: '🚚',
    priority: 'high'
  },
  {
    type: 'pedido_ruta' as const,
    label: 'Pedido en Ruta',
    description: 'Cuando un pedido se marca como "En Ruta"',
    icon: '📦'
  },
  {
    type: 'pedido_creado' as const,
    label: 'Nuevo Pedido',
    description: 'Cuando se crea un nuevo pedido',
    icon: '🆕'
  },
  {
    type: 'compra_completada' as const,
    label: 'Compra Completada',
    description: 'Cuando se completa una orden de compra',
    icon: '✅'
  },
  {
    type: 'cliente_nuevo' as const,
    label: 'Nuevo Cliente',
    description: 'Cuando se registra un nuevo cliente',
    icon: '👤'
  }
]

const channelOptions = [
  { value: 'both', label: 'Ambos', icon: Bell },
  { value: 'in_app', label: 'Solo en App', icon: Monitor },
  { value: 'push', label: 'Solo Push', icon: Smartphone }
]

export function NotificationSettingsPanel() {
  const { settings, loading, updateSetting } = useNotificationSettings()
  const { hasPush, loading: loadingPush } = useHasPushSubscription()
  const [enableingPush, setEnablingPush] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const { toast } = useToast()
  
  const handleToggle = async (
    type: typeof notificationTypes[number]['type'],
    enabled: boolean
  ) => {
    const success = await updateSetting(type, enabled)
    
    if (success) {
      toast({
        title: 'Configuración actualizada',
        description: `Notificaciones ${enabled ? 'activadas' : 'desactivadas'} para ${
          notificationTypes.find(n => n.type === type)?.label
        }`
      })
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar la configuración'
      })
    }
  }
  
  const handleChannelChange = async (
    type: typeof notificationTypes[number]['type'],
    channel: 'in_app' | 'push' | 'both'
  ) => {
    const success = await updateSetting(type, undefined, channel)
    
    if (success) {
      toast({
        title: 'Canal actualizado',
        description: `Canal cambiado a ${channelOptions.find(c => c.value === channel)?.label}`
      })
    }
  }
  
  const handleEnablePush = async () => {
    setEnablingPush(true)
    
    try {
      const result = await requestAndInitializePush()
      
      if (result.success) {
        toast({
          title: '¡Push habilitado!',
          description: 'Ahora recibirás notificaciones push'
        })
      } else if (result.permission === 'denied') {
        toast({
          variant: 'destructive',
          title: 'Permiso denegado',
          description: 'Debes habilitar las notificaciones en la configuración de tu navegador'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo habilitar push notifications'
      })
    } finally {
      setEnablingPush(false)
    }
  }
  
  const handleDisablePush = async () => {
    const success = await unsubscribeFromPush()
    
    if (success) {
      toast({
        title: 'Push deshabilitado',
        description: 'Ya no recibirás notificaciones push'
      })
    }
  }
  
  const handleTestNotification = async () => {
    setSendingTest(true)
    
    try {
      const success = await sendTestNotification()
      
      if (success) {
        toast({
          title: '🧪 Notificación de prueba enviada',
          description: 'Deberías recibirla en unos segundos'
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo enviar la notificación de prueba'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error al enviar la prueba'
      })
    } finally {
      setSendingTest(false)
    }
  }
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones</CardTitle>
          <CardDescription>Cargando configuración...</CardDescription>
        </CardHeader>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Push Notifications Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Estado de Push Notifications
          </CardTitle>
          <CardDescription>
            Las notificaciones push te permiten recibir alertas incluso con la app cerrada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {hasPush ? 'Push Habilitado' : 'Push Deshabilitado'}
              </p>
              <p className="text-sm text-muted-foreground">
                {hasPush
                  ? 'Recibirás notificaciones en este dispositivo'
                  : 'Habilita push para recibir notificaciones en este dispositivo'}
              </p>
            </div>
            
            <Badge variant={hasPush ? 'default' : 'secondary'} className="gap-1">
              {hasPush ? <Check className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
              {hasPush ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            {hasPush ? (
              <Button
                variant="outline"
                onClick={handleDisablePush}
                disabled={loadingPush}
              >
                Deshabilitar Push
              </Button>
            ) : (
              <Button
                onClick={handleEnablePush}
                disabled={enableingPush || loadingPush}
              >
                {enableingPush ? 'Habilitando...' : 'Habilitar Push'}
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleTestNotification}
              disabled={sendingTest}
            >
              {sendingTest ? 'Enviando...' : 'Enviar Prueba'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferencias de Notificaciones</CardTitle>
          <CardDescription>
            Configura qué notificaciones quieres recibir y por cuál canal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {notificationTypes.map((notif) => {
              const setting = settings.find(s => s.notification_type === notif.type)
              
              if (!setting) return null
              
              return (
                <div
                  key={notif.type}
                  className="flex items-start justify-between gap-4 pb-6 border-b last:border-0 last:pb-0"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{notif.icon}</span>
                      <div>
                        <Label htmlFor={`notif-${notif.type}`} className="text-base">
                          {notif.label}
                          {notif.priority === 'high' && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Prioridad Alta
                            </Badge>
                          )}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {notif.description}
                        </p>
                      </div>
                    </div>
                    
                    {setting.enabled && (
                      <div className="ml-10">
                        <Label className="text-sm text-muted-foreground mb-2 block">
                          Canal de notificación:
                        </Label>
                        <Select
                          value={setting.channel}
                          onValueChange={(value) =>
                            handleChannelChange(
                              notif.type,
                              value as 'in_app' | 'push' | 'both'
                            )
                          }
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {channelOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <option.icon className="h-4 w-4" />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  <Switch
                    id={`notif-${notif.type}`}
                    checked={setting.enabled}
                    onCheckedChange={(checked) => handleToggle(notif.type, checked)}
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


