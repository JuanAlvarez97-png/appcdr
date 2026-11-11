// POST /api/login  { usuario, clave }  -> 204 si son correctos, 401 si no.
// Compara contra los secretos ADMIN_USER y ADMIN_PASSWORD (nunca viajan en el código de la página).

const enc = s => new TextEncoder().encode(s);

function igual(a, b) {
    const x = enc(a), y = enc(b);
    return x.byteLength === y.byteLength && crypto.subtle.timingSafeEqual(x, y);
}

export async function onRequestPost({ request, env }) {
    let cuerpo = {};
    try { cuerpo = await request.json(); } catch (e) { /* queda vacío */ }

    const configurado = env.ADMIN_USER && env.ADMIN_PASSWORD;
    const okUsuario = configurado && igual(String(cuerpo.usuario || ''), env.ADMIN_USER);
    const okClave = configurado && igual(String(cuerpo.clave || ''), env.ADMIN_PASSWORD);

    if (okUsuario && okClave) return new Response(null, { status: 204 });

    await new Promise(r => setTimeout(r, 500)); // frena intentos repetidos
    return new Response('No autorizado', { status: 401 });
}
