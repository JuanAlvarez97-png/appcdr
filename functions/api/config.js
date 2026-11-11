// GET  /api/config  -> devuelve la configuración publicada (la leen todos los equipos)
// PUT  /api/config  -> la reemplaza (solo con usuario y clave de administrador)
//
// Requiere en el proyecto de Cloudflare Pages:
//   - Binding KV:  CONFIG_KV
//   - Secretos:    ADMIN_USER y ADMIN_PASSWORD

const CLAVE_KV = 'config';
const MAX_BYTES = 500000;

const enc = s => new TextEncoder().encode(s);

function igual(a, b) {
    const x = enc(a), y = enc(b);
    return x.byteLength === y.byteLength && crypto.subtle.timingSafeEqual(x, y);
}

function autorizado(request, env) {
    if (!env.ADMIN_USER || !env.ADMIN_PASSWORD) return false;
    let usuario, clave;
    try {
        usuario = decodeURIComponent(request.headers.get('X-Admin-User') || '');
        clave = decodeURIComponent(request.headers.get('X-Admin-Pass') || '');
    } catch (e) {
        return false;
    }
    const okUsuario = igual(usuario, env.ADMIN_USER);
    const okClave = igual(clave, env.ADMIN_PASSWORD);
    return okUsuario && okClave;
}

const cabeceras = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

export async function onRequestGet({ env }) {
    if (!env.CONFIG_KV) {
        return new Response(JSON.stringify({ error: 'Falta el binding CONFIG_KV' }), { status: 500, headers: cabeceras });
    }
    const guardado = await env.CONFIG_KV.get(CLAVE_KV);
    return new Response(guardado === null ? 'null' : guardado, { status: 200, headers: cabeceras });
}

export async function onRequestPut({ request, env }) {
    if (!autorizado(request, env)) {
        await new Promise(r => setTimeout(r, 500)); // frena intentos repetidos
        return new Response('No autorizado', { status: 401 });
    }
    if (!env.CONFIG_KV) return new Response('Falta el binding CONFIG_KV', { status: 500 });

    const texto = await request.text();
    if (texto.length > MAX_BYTES) return new Response('Demasiado grande', { status: 413 });

    let datos;
    try { datos = JSON.parse(texto); } catch (e) { return new Response('JSON inválido', { status: 400 }); }

    const valido = datos && typeof datos === 'object' && !Array.isArray(datos) &&
        datos.cdr && typeof datos.cdr === 'object' &&
        datos.checklist && typeof datos.checklist === 'object';
    if (!valido) return new Response('Formato inválido', { status: 400 });

    await env.CONFIG_KV.put(CLAVE_KV, JSON.stringify(datos));
    return new Response(null, { status: 204 });
}
