import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  const chunks: string[] = []
  const size = 0x8000
  for (let i = 0; i < bytes.length; i += size) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + size)))
  }
  return btoa(chunks.join(''))
}

async function downloadPhoto(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
    })
    if (!res.ok) return null
    const buf  = await res.arrayBuffer()
    const mime = res.headers.get('content-type') ?? 'image/jpeg'
    return `data:${mime};base64,${toBase64(buf)}`
  } catch {
    return null
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { username } = await req.json()
    const handle = String(username).replace(/^@/, '').trim().toLowerCase()
    if (!handle) {
      return Response.json({ error: 'Username obrigatório' }, { status: 400, headers: CORS })
    }

    // ── Estratégia 1: API interna do Instagram (app mobile) ──────────────
    // O X-IG-App-ID 936619743392459 é o ID público do Instagram web/mobile
    const apiRes = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${handle}`,
      {
        headers: {
          'User-Agent':
            'Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2194; ' +
            'google/Google; Pixel 7; panther; google; en_US; 458229237)',
          'X-IG-App-ID': '936619743392459',
          'Accept': '*/*',
          'Accept-Language': 'en-US',
          'Referer': 'https://www.instagram.com/',
        },
      }
    )

    if (apiRes.ok) {
      const json = await apiRes.json().catch(() => null)
      const user = json?.data?.user
      if (user?.full_name) {
        const photoUrl  = user.profile_pic_url_hd ?? user.profile_pic_url ?? null
        const photoB64  = photoUrl ? await downloadPhoto(photoUrl) : null
        return Response.json(
          { name: user.full_name, photo: photoB64 },
          { headers: CORS }
        )
      }
    }

    // ── Estratégia 2: scraping de OG tags ───────────────────────────────
    const pageRes = await fetch(`https://www.instagram.com/${handle}/`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
      },
    })

    const html = pageRes.ok ? await pageRes.text() : ''

    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
                    ?? html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/i)
    const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
                    ?? html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i)

    if (titleMatch) {
      const name = titleMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&#064;/g, '@')
        .replace(/&#x2022;/g, '•')
        .replace(/\s*\(@[^)]+\).*$/, '')
        .replace(/\s*•.*$/, '')
        .trim()

      const photoUrl = imageMatch ? imageMatch[1].replace(/&amp;/g, '&') : null
      const photoB64 = photoUrl ? await downloadPhoto(photoUrl) : null

      return Response.json({ name, photo: photoB64 }, { headers: CORS })
    }

    return Response.json(
      { error: 'Perfil privado ou não encontrado. Verifique se o usuário é público.' },
      { status: 404, headers: CORS }
    )
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Erro interno' }, { status: 500, headers: CORS })
  }
})
