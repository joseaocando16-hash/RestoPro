import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RestoPro — Gestión de Restaurante',
  description: 'Sistema de pedidos e inventario para restaurantes',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
