# 🍽️ RestoPro — Guía de instalación

Sistema de gestión de pedidos e inventario para restaurantes.
Stack: **Next.js 14 + Supabase + Tailwind CSS + Recharts**

---

## Paso 1 — Crear tu proyecto en Supabase (gratis)

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita
2. Crea un nuevo proyecto (elige una región cercana, ej. us-east-1)
3. En el menú lateral ve a **SQL Editor**
4. Copia y pega el contenido de `supabase-schema.sql` y ejecuta
5. Ve a **Project Settings → API** y copia:
   - `Project URL`
   - `anon / public` key

---

## Paso 2 — Crear tu primer usuario (login)

1. En Supabase, ve a **Authentication → Users**
2. Haz clic en **Invite user** o **Add user**
3. Ingresa el email y contraseña con los que quieres entrar a la app

---

## Paso 3 — Configurar variables de entorno

1. Copia `.env.example` como `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Edita `.env.local` con tus credenciales de Supabase:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```

---

## Paso 4 — Subir a Vercel (gratis)

1. Sube este proyecto a GitHub (nuevo repositorio)
2. Ve a [vercel.com](https://vercel.com) y crea cuenta gratuita
3. Haz clic en **Add New Project** e importa tu repo de GitHub
4. En **Environment Variables** agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Haz clic en **Deploy**
6. ¡Listo! Vercel te dará una URL pública tipo `restopro.vercel.app`

---

## Desarrollo local (opcional)

```bash
npm install
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000)

---

## Estructura del proyecto

```
app/
  login/          → Página de login
  dashboard/      → Dashboard con métricas y gráficas
  pedidos/        → Lista y gestión de pedidos
  nuevo-pedido/   → Crear nuevo pedido
  inventario/     → Control de inventario
  reportes/       → Estadísticas y reportes
  alertas/        → Alertas de stock bajo
lib/
  supabase.ts     → Cliente de Supabase
supabase-schema.sql → SQL para crear las tablas
```

---

## Soporte

¿Problemas? Los pasos más comunes:
- Asegúrate de que el SQL se ejecutó sin errores en Supabase
- Verifica que las variables de entorno estén bien escritas
- En Vercel, ve a **Deployments → Redeploy** si cambias las env vars
