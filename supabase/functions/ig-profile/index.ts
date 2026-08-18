import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Converte ArrayBuffer em base64 sem estourar a call stack
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  const chunks: string[] = []
  const size = 0x8000
  for (let i = 0; i < bytes.length; i += size) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + size)))
  }
  return btoa(chunks.join(''))
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { username } = await req.json()
    const handle = String(username).replace(/^@/, '').trim()

    if (!handle) {
      return Response.json({ error: 'Username obrigatório' }, { status: 400, headers: CORS })
    }

    // Usar facebookexternalhit como User-Agent faz o Instagram
    // retornar as OG tags completas (usado para link previews)
    const pageRes = await fetch(`https://www.instagram.com/${handle}/`, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
    })

    if (!pageRes.ok) {
      return Response.json({ error: 'Perfil não encontrado' }, { status: 404, headers: CORS })
    }

    const html = await pageRes.text()

    // Extrai og:title  →  "Nome Completo (@handle) • Instagram..."
    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
      ?? html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/i)

    // Extrai og:image
    const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
      ?? html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i)

    if (!titleMatch) {
      return Response.json(
        { error: 'Perfil privado ou não encontrado. Verifique se o usuário existe e é público.' },
        { status: 404, headers: CORS }
      )
    }

    // "Display Name (@handle) • Instagram photos and videos"  →  "Display Name"
    const rawTitle = titleMatch[1]
    const name = rawTitle
      .replace(/\s*\(@[^)]+\).*$/, '')   // remove (@handle) e tudo depois
      .replace(/\s*•.*$/, '')             // remove "• Instagram..."
      .trim()

    // Baixa a foto e retorna como base64 para o frontend poder re-fazer upload
    let photoBase64: string | null = null
    if (imageMatch) {
      const photoUrl = imageMatch[1].replace(/&amp;/g, '&')
      try {
        const photoRes = await fetch(photoUrl)
        if (photoRes.ok) {
          const buf = await photoRes.arrayBuffer()
          const mime = photoRes.headers.get('content-type') ?? 'image/jpeg'
          photoBase64 = `data:${mime};base64,${toBase64(buf)}`
        }
      } catch {
        // foto opcional — segue sem ela
      }
    }

    return Response.json({ name, photo: photoBase64 }, { headers: CORS })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Erro interno' }, { status: 500, headers: CORS })
  }
})
