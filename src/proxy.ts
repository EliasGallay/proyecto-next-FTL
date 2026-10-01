import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() valida el token contra Supabase (no confiar en getSession() en el servidor)
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Los Server Actions son POST con cabecera Next-Action. No redirigirlos: esperan
  // una respuesta JSON y una redirección HTTP causa "unexpected response" en el cliente.
  const isServerAction = request.method === 'POST' && request.headers.has('next-action')

  // Sin sesión fuera de /auth → redirigir al login
  if (!user && !isServerAction && !pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Con sesión en la raíz, login o registro → ir al inicio
  if (user && !isServerAction && (pathname === '/' || pathname === '/auth/login' || pathname === '/auth/registro')) {
    const url = request.nextUrl.clone()
    url.pathname = '/inicio'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
