// ---------- Acceso ----------
// En la web publicada (Cloudflare) el usuario y la clave se validan en el servidor
// (secretos ADMIN_USER y ADMIN_PASSWORD) y los cambios se publican para todos los equipos.
// Si NO hay servidor (Live Server o app de escritorio) se usa este acceso local, y los
// cambios quedan solo en este equipo.
const LOCAL_USER = 'admin';
const LOCAL_PASS = 'admin123';
const SESSION_KEY = 'cdr_admin_sesion';

let sesion = null;   // { modo: 'servidor', usuario, clave } | { modo: 'local' }

let cfg = cargarConfig();
let tabActiva = 'cdr';
let focoClave = null;     // editor cuyo campo "añadir" recupera el foco tras redibujar

const $ = id => document.getElementById(id);

function elem(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
}

function boton(texto, clase, titulo, onClick) {
    const b = elem('button', clase, texto);
    b.type = 'button';
    b.title = titulo;
    b.addEventListener('click', onClick);
    return b;
}

let msgTimer;
function aviso(texto) {
    $('msg').textContent = texto;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => ($('msg').textContent = ''), 2500);
}

// Guarda en este equipo al instante y publica en el servidor (con una pequeña espera
// para agrupar varios cambios seguidos en una sola publicación).
let pubTimer;
function guardar() {
    guardarConfig(cfg);
    if (sesion && sesion.modo === 'servidor') {
        aviso('Guardando...');
        clearTimeout(pubTimer);
        pubTimer = setTimeout(publicar, 700);
    } else {
        aviso('✔ Cambios guardados (solo en este equipo)');
    }
}

async function publicar() {
    try {
        const estado = await publicarConfig(cfg, sesion.usuario, sesion.clave);
        if (estado === 204 || estado === 200) aviso('✔ Guardado para todos los equipos');
        else if (estado === 401) { alert('La sesión ya no es válida. Ingresa de nuevo.'); cerrarSesion(); }
        else aviso('⚠ No se pudo guardar en el servidor (código ' + estado + ')');
    } catch (e) {
        aviso('⚠ Sin conexión: el cambio solo quedó en este equipo');
    }
}

function repetido(arr, valor, ignorar = -1) {
    return arr.some((v, i) => i !== ignorar && v.toLowerCase() === valor.toLowerCase());
}

function mover(arr, i, dir) {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    guardar();
    render();
}

// ---------- Editor genérico de una lista de textos ----------
// o = { clave, titulo, items, multilinea, numerar, ancho, plano, placeholder }
function editorLista(o) {
    const card = elem('div', 'lista-card' + (o.ancho ? ' ancho' : '') + (o.plano ? ' plano' : ''));
    card.dataset.clave = o.clave;
    card.appendChild(elem('h3', null, `${o.titulo} (${o.items.length})`));

    if (!o.items.length) card.appendChild(elem('p', 'vacia', 'Lista vacía. Agrega opciones abajo.'));

    o.items.forEach((valor, i) => {
        const fila = elem('div', 'item-row');

        if (o.numerar) fila.appendChild(elem('span', 'num', String(i + 1)));

        const campo = o.multilinea ? elem('textarea') : elem('input');
        if (o.multilinea) campo.rows = 2; else campo.type = 'text';
        campo.value = valor;
        campo.addEventListener('change', () => {
            const nuevo = campo.value.trim();
            if (!nuevo) { campo.value = o.items[i]; return aviso('El valor no puede quedar vacío'); }
            if (repetido(o.items, nuevo, i)) { campo.value = o.items[i]; return aviso('Ya existe esa opción'); }
            o.items[i] = nuevo;
            campo.value = nuevo;
            guardar();
        });
        fila.appendChild(campo);

        fila.appendChild(boton('↑', '', 'Subir', () => mover(o.items, i, -1)));
        fila.appendChild(boton('↓', '', 'Bajar', () => mover(o.items, i, 1)));
        fila.appendChild(boton('✕', 'del', 'Eliminar', () => {
            o.items.splice(i, 1);
            guardar();
            render();
        }));
        card.appendChild(fila);
    });

    const add = elem('div', 'add-row');
    const nuevoInput = elem('input');
    nuevoInput.type = 'text';
    nuevoInput.placeholder = o.placeholder || 'Nueva opción...';
    const agregar = () => {
        const v = nuevoInput.value.trim();
        if (!v) return;
        if (repetido(o.items, v)) return aviso('Ya existe esa opción');
        o.items.push(v);
        focoClave = o.clave;
        guardar();
        render();
    };
    nuevoInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } });
    add.appendChild(nuevoInput);
    add.appendChild(boton('+ Añadir', '', 'Añadir', agregar));
    card.appendChild(add);

    return card;
}

// ---------- Pestaña: Reporte Técnico CDR ----------
function renderCdr(cont) {
    const grid = elem('div', 'grid');
    CFG_CDR_META.forEach(m => {
        grid.appendChild(editorLista({ clave: 'cdr.' + m.id, titulo: m.titulo, items: cfg.cdr[m.id] }));
    });
    cont.appendChild(grid);
}

// ---------- Pestaña: Checklist ----------
function renderMarcas(cont) {
    const marcas = cfg.checklist.marcas;

    cont.appendChild(elem('h2', null, 'Marcas y modelos'));
    cont.appendChild(elem('p', 'nota', 'En el formulario, al elegir una marca solo aparecen los modelos de esa marca.'));

    const grid = elem('div', 'grid');
    marcas.forEach((marca, i) => {
        const card = elem('div', 'marca-card');

        const cab = elem('div', 'marca-card-cab');
        const nombre = elem('input');
        nombre.type = 'text';
        nombre.value = marca.nombre;
        nombre.title = 'Nombre de la marca';
        nombre.addEventListener('change', () => {
            const nuevo = nombre.value.trim();
            const otras = marcas.map(m => m.nombre);
            if (!nuevo) { nombre.value = marca.nombre; return aviso('El nombre no puede quedar vacío'); }
            if (repetido(otras, nuevo, i)) { nombre.value = marca.nombre; return aviso('Ya existe esa marca'); }
            marca.nombre = nuevo;
            guardar();
        });
        cab.appendChild(nombre);
        cab.appendChild(boton('↑', '', 'Subir marca', () => mover(marcas, i, -1)));
        cab.appendChild(boton('↓', '', 'Bajar marca', () => mover(marcas, i, 1)));
        cab.appendChild(boton('✕', 'del peligro', 'Eliminar marca', () => {
            if (!confirm(`¿Eliminar la marca "${marca.nombre}" y sus ${marca.modelos.length} modelos?`)) return;
            marcas.splice(i, 1);
            guardar();
            render();
        }));
        card.appendChild(cab);

        card.appendChild(editorLista({
            clave: 'modelos.' + i,
            titulo: 'Modelos',
            items: marca.modelos,
            plano: true,
            placeholder: 'Nuevo modelo...'
        }));
        grid.appendChild(card);
    });
    cont.appendChild(grid);

    // Añadir marca
    const add = elem('div', 'add-row');
    const input = elem('input');
    input.type = 'text';
    input.placeholder = 'Nueva marca...';
    const agregar = () => {
        const v = input.value.trim();
        if (!v) return;
        if (repetido(marcas.map(m => m.nombre), v)) return aviso('Ya existe esa marca');
        marcas.push({ nombre: v, modelos: [] });
        focoClave = 'modelos.' + (marcas.length - 1);
        guardar();
        render();
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } });
    add.appendChild(input);
    add.appendChild(boton('+ Añadir marca', '', 'Añadir marca', agregar));
    add.style.marginTop = '18px';
    cont.appendChild(add);
}

function renderChecklist(cont) {
    const grid = elem('div', 'grid');
    CFG_CHECKLIST_META.forEach(m => {
        grid.appendChild(editorLista({ clave: 'checklist.' + m.id, titulo: m.titulo, items: cfg.checklist[m.id] }));
    });
    cont.appendChild(grid);

    renderMarcas(cont);

    cont.appendChild(elem('h2', null, 'Actividades de la tabla'));
    cont.appendChild(elem('p', 'nota', 'Cada actividad es una fila de la tabla (SI / NO / N/A). El número se asigna según el orden.'));
    cont.appendChild(editorLista({
        clave: 'checklist.actividades',
        titulo: 'Actividades',
        items: cfg.checklist.actividades,
        multilinea: true,
        numerar: true,
        plano: true,
        placeholder: 'Nueva actividad...'
    }));
}

// ---------- Dibujar ----------
function render() {
    document.querySelectorAll('.tab').forEach(t => {
        const activa = t.dataset.tab === tabActiva;
        t.classList.toggle('activa', activa);
        t.setAttribute('aria-selected', activa);
    });

    const cont = $('contenido');
    cont.innerHTML = '';
    if (tabActiva === 'cdr') renderCdr(cont); else renderChecklist(cont);

    if (focoClave) {
        const campo = cont.querySelector(`[data-clave="${focoClave}"] .add-row input`);
        if (campo) campo.focus();
        focoClave = null;
    }
}

document.querySelectorAll('.tab').forEach(t =>
    t.addEventListener('click', () => { tabActiva = t.dataset.tab; render(); })
);

// ---------- Exportar / Importar / Restaurar ----------
$('btnExportar').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'configuracion_cdr.json';
    a.click();
    URL.revokeObjectURL(a.href);
});

const archivo = $('archivoImportar');
$('btnImportar').addEventListener('click', () => archivo.click());
archivo.addEventListener('change', () => {
    const f = archivo.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            let datos = JSON.parse(e.target.result);
            if (!datos || typeof datos !== 'object') throw new Error('Formato inválido');
            // Acepta también el archivo de la versión anterior (solo listas del CDR)
            if (!datos.cdr && !datos.checklist) datos = { cdr: datos };
            if (!confirm('Se reemplazará la configuración actual con la del archivo. ¿Continuar?')) return;
            cfg = normalizarConfig(datos);
            guardar();
            render();
            aviso('✔ Configuración importada');
        } catch (err) {
            aviso('✖ Archivo inválido');
        }
    };
    reader.readAsText(f);
    archivo.value = '';
});

$('btnRestaurar').addEventListener('click', () => {
    const alcance = sesion && sesion.modo === 'servidor' ? ' para TODOS los equipos' : '';
    if (!confirm('¿Restaurar TODO (listas, marcas, modelos y actividades) a los valores originales' + alcance + '? Se perderán los cambios.')) return;
    cfg = copiarConfig(CONFIG_DEFAULT);
    guardar();
    render();
});

// ---------- Login ----------
function mostrarPanel() {
    $('login').hidden = true;
    $('panel').hidden = false;
    $('modo').textContent = sesion.modo === 'servidor'
        ? 'Los cambios se guardan en el servidor y los ven todos los equipos.'
        : 'Modo local: los cambios se guardan solo en este navegador/equipo. Usa Exportar e Importar para llevarlos a otro.';
    render();
}

async function entrar() {
    if (sesion.modo === 'servidor') {
        const estado = await sincronizarConfig();
        cfg = cargarConfig();
        if (estado === 'vacio') {
            // Primera vez: el servidor aún no tiene datos, se publican los de este equipo
            const st = await publicarConfig(cfg, sesion.usuario, sesion.clave).catch(() => 0);
            if (st === 204) aviso('✔ Las listas de este equipo se publicaron en el servidor');
        }
    }
    mostrarPanel();
}

function cerrarSesion() {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
}

async function intentarLogin() {
    const usuario = $('loginUser').value.trim();
    const clave = $('loginPass').value;
    const error = $('loginError');
    error.textContent = '';

    let estado = 0;
    try {
        const r = await fetch(API_LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, clave })
        });
        estado = r.status;
    } catch (e) { /* sin servidor */ }

    if (estado === 204) {
        sesion = { modo: 'servidor', usuario, clave };
    } else if (estado !== 401 && usuario === LOCAL_USER && clave === LOCAL_PASS) {
        sesion = { modo: 'local' };
    } else {
        error.textContent = 'Usuario o contraseña incorrectos';
        $('loginPass').value = '';
        return;
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
    entrar();
}

$('btnLogin').addEventListener('click', intentarLogin);
['loginUser', 'loginPass'].forEach(id =>
    $(id).addEventListener('keydown', e => { if (e.key === 'Enter') intentarLogin(); })
);
$('btnSalir').addEventListener('click', cerrarSesion);

try { sesion = JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { sesion = null; }
if (sesion && sesion.modo) entrar();
