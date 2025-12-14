'use client'

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Trophy, Droplets, TrendingUp, Clock, Star, Award, Zap } from 'lucide-react'
import confetti from 'canvas-confetti'

interface WaterMasterStats {
  totalBottles: number
  totalRevenue: number
  totalOrders: number
  avgDeliveryTime: number
  customersServed: number
  daysActive: number
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  unlocked: boolean
  requirement: number
  current: number
  emoji: string
}

interface WaterMasterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stats: WaterMasterStats | null
}

export function WaterMasterModal({ open, onOpenChange, stats }: WaterMasterModalProps) {
  const [showAchievements, setShowAchievements] = useState(false)

  // Calcular achievements
  const achievements: Achievement[] = stats ? [
    {
      id: 'novato',
      title: '💧 Primer Paso',
      description: 'Despachar 100 botellones',
      icon: <Droplets className="w-6 h-6" />,
      unlocked: stats.totalBottles >= 100,
      requirement: 100,
      current: stats.totalBottles,
      emoji: '💧'
    },
    {
      id: 'hidratador',
      title: '🌊 Hidratador Profesional',
      description: 'Despachar 1,000 botellones',
      icon: <Trophy className="w-6 h-6" />,
      unlocked: stats.totalBottles >= 1000,
      requirement: 1000,
      current: stats.totalBottles,
      emoji: '🌊'
    },
    {
      id: 'tsunami',
      title: '🌀 Tsunami de Agua',
      description: 'Despachar 5,000 botellones',
      icon: <Award className="w-6 h-6" />,
      unlocked: stats.totalBottles >= 5000,
      requirement: 5000,
      current: stats.totalBottles,
      emoji: '🌀'
    },
    {
      id: 'oceano',
      title: '🌏 Océano Pacífico',
      description: 'Despachar 10,000 botellones',
      icon: <Star className="w-6 h-6" />,
      unlocked: stats.totalBottles >= 10000,
      requirement: 10000,
      current: stats.totalBottles,
      emoji: '🌏'
    },
    {
      id: 'millonario',
      title: '💰 Millonario del Agua',
      description: 'Facturar $1,000,000 CLP',
      icon: <TrendingUp className="w-6 h-6" />,
      unlocked: stats.totalRevenue >= 1000000,
      requirement: 1000000,
      current: stats.totalRevenue,
      emoji: '💰'
    },
    {
      id: 'velocista',
      title: '⚡ Rayo McQueen',
      description: 'Tiempo promedio < 2 horas',
      icon: <Zap className="w-6 h-6" />,
      unlocked: stats.avgDeliveryTime < 2,
      requirement: 2,
      current: stats.avgDeliveryTime,
      emoji: '⚡'
    },
    {
      id: 'popular',
      title: '👥 Estrella del Barrio',
      description: 'Servir a 100 clientes',
      icon: <Award className="w-6 h-6" />,
      unlocked: stats.customersServed >= 100,
      requirement: 100,
      current: stats.customersServed,
      emoji: '👥'
    },
    {
      id: 'veterano',
      title: '🏆 Veterano de Guerra',
      description: '365 días activos',
      icon: <Clock className="w-6 h-6" />,
      unlocked: stats.daysActive >= 365,
      requirement: 365,
      current: stats.daysActive,
      emoji: '🏆'
    }
  ] : []

  const unlockedCount = achievements.filter(a => a.unlocked).length

  useEffect(() => {
    if (open && stats) {
      // Confetti al abrir
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0891b2', '#06b6d4', '#22d3ee']
      })

      // Sonido de logro (opcional)
      const audio = new Audio('data:audio/wav;base64,UklGRhQAAABXQVZFZm10IBAAAAABAAEA')
      audio.volume = 0.1
      audio.play().catch(() => {}) // Ignorar errores de autoplay
    }
  }, [open, stats])

  const fireAchievementConfetti = () => {
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#0891b2', '#06b6d4', '#22d3ee', '#67e8f9']
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#0891b2', '#06b6d4', '#22d3ee', '#67e8f9']
      })
    }, 250)
  }

  if (!stats) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-cyan-50 via-white to-blue-50">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
            🎮 WATER MASTER STATS 🎮
          </DialogTitle>
          <p className="text-center text-muted-foreground text-sm">
            Easter Egg desbloqueado - Triple click en el logo
          </p>
        </DialogHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-lg p-4 shadow-lg transform hover:scale-105 transition-transform">
            <div className="text-3xl mb-2">💧</div>
            <div className="text-2xl font-bold">{stats.totalBottles.toLocaleString()}</div>
            <div className="text-sm opacity-90">Botellones</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-lg p-4 shadow-lg transform hover:scale-105 transition-transform">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-2xl font-bold">${(stats.totalRevenue / 1000).toFixed(0)}k</div>
            <div className="text-sm opacity-90">Facturado</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg p-4 shadow-lg transform hover:scale-105 transition-transform">
            <div className="text-3xl mb-2">📦</div>
            <div className="text-2xl font-bold">{stats.totalOrders.toLocaleString()}</div>
            <div className="text-sm opacity-90">Pedidos</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-lg p-4 shadow-lg transform hover:scale-105 transition-transform">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-2xl font-bold">{stats.avgDeliveryTime.toFixed(1)}h</div>
            <div className="text-sm opacity-90">Tiempo Avg</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg p-4 shadow-md border-2 border-cyan-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progreso de Logros</span>
            <Badge variant="secondary" className="bg-cyan-100 text-cyan-700">
              {unlockedCount}/{achievements.length}
            </Badge>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Achievements */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">🏆 Logros</h3>
            <button
              onClick={() => {
                setShowAchievements(!showAchievements)
                if (!showAchievements) fireAchievementConfetti()
              }}
              className="text-sm text-cyan-600 hover:text-cyan-800 font-medium"
            >
              {showAchievements ? 'Ocultar' : 'Ver Todos'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(showAchievements ? achievements : achievements.filter(a => a.unlocked)).map((achievement) => (
              <div
                key={achievement.id}
                className={`rounded-lg p-4 border-2 transition-all ${
                  achievement.unlocked
                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-400 shadow-md'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`text-4xl ${achievement.unlocked ? 'animate-bounce' : 'grayscale'}`}>
                    {achievement.emoji}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800">{achievement.title}</h4>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                    {!achievement.unlocked && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 mb-1">
                          {achievement.current.toLocaleString()} / {achievement.requirement.toLocaleString()}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-cyan-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min((achievement.current / achievement.requirement) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {achievement.unlocked && (
                    <Trophy className="w-5 h-5 text-yellow-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fun Facts */}
        <div className="mt-6 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg p-4 border-2 border-cyan-300">
          <h4 className="font-bold text-gray-800 mb-2">🎲 Datos Curiosos</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Has entregado {(stats.totalBottles * 20).toLocaleString()}L de agua 💧</li>
            <li>• Eso equivale a {(stats.totalBottles * 20 / 1000).toFixed(1)} m³ de agua purificada</li>
            <li>• Serviste a {stats.customersServed} clientes felices 😊</li>
            <li>• Llevas {stats.daysActive} días haciendo al mundo un lugar mejor hidratado 🌍</li>
          </ul>
        </div>

        {/* Easter Egg Signature */}
        <div className="text-center text-xs text-gray-400 mt-4">
          💧 Made with 💙 by Agua Tres Torres Team • Easter Egg v1.0
        </div>
      </DialogContent>
    </Dialog>
  )
}

