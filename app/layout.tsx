import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ClientLayout } from "@/components/client-layout";
import { Toaster } from "@/components/ui/toast";
import { NotificationProvider } from "@/lib/notification-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Agua Tres Torres - Sistema de Gestión",
    template: "%s | Agua Tres Torres"
  },
  description: "Sistema de gestión de pedidos, clientes y entregas de agua purificada Tres Torres. Optimización de rutas, presupuestos y control de inventario.",
  keywords: ["agua purificada", "tres torres", "gestión", "pedidos", "entregas", "rutas"],
  authors: [{ name: "Agua Tres Torres" }],
  creator: "Agua Tres Torres",
  publisher: "Agua Tres Torres",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/images/logos/favicon.ico" },
      { url: "/images/logos/favicon.png", type: "image/png" },
      { url: "/images/logos/logo-cuadrado-250x250.png", sizes: "250x250", type: "image/png" }
    ],
    apple: [
      { url: "/images/logos/logo-cuadrado-57x57-iphone.png", sizes: "57x57", type: "image/png" },
      { url: "/images/logos/logo-cuadrado-72x72-ipad.png", sizes: "72x72", type: "image/png" }
    ],
    shortcut: "/images/logos/favicon.ico"
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    title: "Agua Tres Torres - Sistema de Gestión",
    description: "Sistema de gestión de pedidos, clientes y entregas de agua purificada",
    siteName: "Agua Tres Torres"
  },
  twitter: {
    card: "summary",
    title: "Agua Tres Torres",
    description: "Sistema de gestión de agua purificada"
  }
};

// Configuración de viewport separada (Next.js 14+)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <NotificationProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
            <Toaster />
          </NotificationProvider>
        </ThemeProvider>
        {/* Carga única de Google Maps API para toda la aplicación */}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&libraries=places,visualization&loading=async`}
          strategy="lazyOnload"
          id="google-maps-script"
        />
        {/* Service Worker para notificaciones push */}
        <Script
          id="register-service-worker"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('[SW] Registrado:', reg.scope))
                    .catch(err => console.error('[SW] Error:', err));
                });
              }
            `
          }}
        />
      </body>
    </html>
  );
}
