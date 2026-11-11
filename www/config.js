// ============================================================
// Configuración compartida por las dos aplicaciones y el admin.
// Todo lo editable (listas, marcas/modelos, actividades) vive aquí
// y se guarda en el navegador (localStorage).
// ============================================================

const CONFIG_KEY = 'cdr_config_v2';
const LEGACY_KEY = 'cdr_listas_v1'; // versión anterior (solo listas del CDR)

// Listas del Reporte Técnico CDR (id del <select> y nombre en el admin)
const CFG_CDR_META = [
    { id: 'rdsResponsable',   titulo: 'RDS Responsable' },
    { id: 'componente',       titulo: 'Componente' },
    { id: 'marca',            titulo: 'Marca' },
    { id: 'discoDuro',        titulo: 'Disco Duro' },
    { id: 'ram',              titulo: 'RAM' },
    { id: 'sistemaOperativo', titulo: 'Sistema Operativo' }
];

// Listas simples del Checklist
const CFG_CHECKLIST_META = [
    { id: 'sede',        titulo: 'Sede' },
    { id: 'piso',        titulo: 'Piso' },
    { id: 'responsable', titulo: 'Responsable SWO' }
];

// Valores iniciales (los que tenían los formularios originalmente)
const CONFIG_DEFAULT = {
    cdr: {
        rdsResponsable: [
            'N/A',
            'Juan José Álvarez Herrera',
            'Jeison Alonso Gamboa Carvajal',
            'Jeferson Arias Sterling',
            'Andres Sebastian León Agudelo',
            'Andres Villarreal Diaz',
            'Edwin Alexander Toro Munera',
            'Nicolas Montoya Peñuela',
            'Brayan Gutiérrez Buendia'
        ],
        componente: ['Portátil', 'AIO', 'Tablet', 'Cargador', 'Teclado', 'Mouse', 'Monitor', 'Diadema', 'Base Refrigerante'],
        marca: ['Lenovo', 'Dell', 'Mac', 'Honeywell', 'Zebra', 'Jabra'],
        discoDuro: ['N/A', '256GB', '500GB', '1TB'],
        ram: ['N/A', '4GB', '8GB', '16GB', '24GB', '32GB'],
        sistemaOperativo: ['N/A', 'Windows 7', 'Windows 8', 'Windows 10', 'Windows 11']
    },
    checklist: {
        sede: ['Edificio Belcorp Perú', 'Isla', 'Tienda', 'Belcenter'],
        piso: ['1', '2', '3', '4', '5', '9', '10', '11', '13'],
        responsable: [
            'Alex Ayala', 'Allison Obregón', 'Brian Aguilar', 'Carla Caceres',
            'Daniel Yactayo', 'Eliseo Pineda', 'Juan Carlos Chavez'
        ],
        marcas: [
            { nombre: 'Lenovo', modelos: ['ThinkPad E14', 'ThinkPad L14', 'ThinkPad T14', 'ThinkPad T495', 'ThinkPad P14s Gen 5'] },
            { nombre: 'Dell',   modelos: ['Latitude 5330', 'Latitude 5420', 'Latitude 5430', 'Latitude 5440', 'Precision 7760'] },
            { nombre: 'Apple',  modelos: ['iMac 24 A2438', 'MacBook Air 15', 'MacBook Pro', 'Mac Mini A2686'] }
        ],
        actividades: [
            'Eliminar Netskope del equipo (si se encuentra instalado).',
            'Ejecución de agente Samy Help 2.0 (ejecutar todas las opciones).',
            'Verificar que los archivos locales y en OneDrive estén sincronizados correctamente.',
            'Se valida la instalación de herramientas RAP, antivirus TrendMicro y Portal Empresa.',
            'Se valida la conexión a la red Belcorp y la VPN (FortiClient) cuando aplique; si son equipos Desktop, eliminar la VPN.',
            'Se valida la versión de SAP en el equipo: versión 7.70 con su patch.',
            'Se verifican e instalan las actualizaciones pendientes de Windows y controladores, priorizando parches críticos y de seguridad.',
            'Se realiza cambio de pasta térmica.',
            'Se realiza limpieza de la pantalla con líquido limpia-pantalla.',
            'Se realiza limpieza de carcasa (cubierta externa) con alcohol.',
            'Se realiza limpieza de teclado con las brochas y espuma (se emplea silicona o cera).',
            'Se realiza limpieza de otros componentes o accesorios.'
        ]
    }
};

function copiarConfig(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Limpia una lista: textos sin espacios sobrantes, sin vacíos y sin repetidos
function limpiarLista(arr) {
    if (!Array.isArray(arr)) return null;
    return [...new Set(arr.map(v => String(v).trim()).filter(Boolean))];
}

// Mezcla unos datos (guardados o importados) sobre los valores por defecto
function normalizarConfig(datos) {
    const cfg = copiarConfig(CONFIG_DEFAULT);
    if (!datos || typeof datos !== 'object') return cfg;

    CFG_CDR_META.forEach(m => {
        const a = limpiarLista(datos.cdr && datos.cdr[m.id]);
        if (a) cfg.cdr[m.id] = a;
    });

    const ck = datos.checklist || {};
    [...CFG_CHECKLIST_META.map(m => m.id), 'actividades'].forEach(k => {
        const a = limpiarLista(ck[k]);
        if (a) cfg.checklist[k] = a;
    });

    if (Array.isArray(ck.marcas)) {
        cfg.checklist.marcas = ck.marcas
            .filter(m => m && typeof m.nombre === 'string' && m.nombre.trim())
            .map(m => ({ nombre: m.nombre.trim(), modelos: limpiarLista(m.modelos) || [] }));
    }
    return cfg;
}

function cargarConfig() {
    try {
        const raw = localStorage.getItem(CONFIG_KEY);
        if (raw) return normalizarConfig(JSON.parse(raw));

        // Migración: listas del CDR guardadas con la versión anterior
        const vieja = localStorage.getItem(LEGACY_KEY);
        if (vieja) return normalizarConfig({ cdr: JSON.parse(vieja) });
    } catch (e) {
        console.warn('No se pudo leer la configuración guardada; se usan los valores de fábrica.', e);
    }
    return copiarConfig(CONFIG_DEFAULT);
}

function guardarConfig(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

function restaurarConfig() {
    localStorage.removeItem(CONFIG_KEY);
    localStorage.removeItem(LEGACY_KEY);
}

// ------------------------------------------------------------
// Sincronización con el servidor (Cloudflare Pages + KV)
// Si no hay servidor (Live Server, app de escritorio) todo sigue
// funcionando solo con el almacenamiento local del equipo.
// ------------------------------------------------------------
const API_CONFIG = '/api/config';
const API_LOGIN = '/api/login';

// Descarga la configuración publicada y la deja como caché local.
// Devuelve: 'cambio' | 'igual' | 'vacio' (el servidor aún no tiene datos) | 'sin-servidor'
async function sincronizarConfig() {
    try {
        const r = await fetch(API_CONFIG, { cache: 'no-store' });
        if (!r.ok) return 'sin-servidor';
        const datos = await r.json();
        if (datos === null) return 'vacio';
        const nueva = JSON.stringify(normalizarConfig(datos));
        if (nueva === JSON.stringify(cargarConfig())) return 'igual';
        localStorage.setItem(CONFIG_KEY, nueva);
        return 'cambio';
    } catch (e) {
        return 'sin-servidor';   // sin red, o /api no existe
    }
}

// Publica la configuración para todos los equipos (solo administrador).
// Devuelve el código HTTP (204 = guardado, 401 = credenciales inválidas).
async function publicarConfig(cfg, usuario, clave) {
    const r = await fetch(API_CONFIG, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-User': encodeURIComponent(usuario),
            'X-Admin-Pass': encodeURIComponent(clave)
        },
        body: JSON.stringify(cfg)
    });
    return r.status;
}

async function sincronizarYRefrescar() {
    if (window.CONFIG_NO_AUTOSYNC) return;   // el admin gestiona su propia sincronización
    const estado = await sincronizarConfig();
    if (estado === 'cambio') {
        poblarSelects();
        if (typeof alActualizarConfig === 'function') alActualizarConfig();
    }
}

// Llena los <select data-lista="grupo.id"> (por ejemplo "cdr.marca" o "checklist.sede")
function poblarSelects() {
    const cfg = cargarConfig();
    document.querySelectorAll('select[data-lista]').forEach(select => {
        const [grupo, id] = select.dataset.lista.split('.');
        const valores = (cfg[grupo] && cfg[grupo][id]) || [];
        const actual = select.value;

        select.innerHTML = '';
        select.add(new Option('Seleccione...', ''));
        valores.forEach(v => select.add(new Option(v, v)));

        select.value = actual;               // conserva la selección si aún existe
        if (select.selectedIndex < 0) select.value = '';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    poblarSelects();          // inmediato, con lo último que se conoce
    sincronizarYRefrescar();  // y luego se actualiza con lo que haya en el servidor
});
// Si la pestaña estaba abierta mucho tiempo, se actualiza al volver a ella
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sincronizarYRefrescar();
});

// Si se edita en otra pestaña, esta página se actualiza sola
window.addEventListener('storage', e => {
    if (e.key === CONFIG_KEY) {
        poblarSelects();
        if (typeof alActualizarConfig === 'function') alActualizarConfig();
    }
});
// Al volver con el botón "atrás"
window.addEventListener('pageshow', e => {
    if (e.persisted) {
        poblarSelects();
        if (typeof alActualizarConfig === 'function') alActualizarConfig();
    }
});
