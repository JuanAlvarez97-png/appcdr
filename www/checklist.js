// ============================================================
// Checklist de Mantenimiento Preventivo
// Las listas, marcas/modelos y actividades vienen de config.js
// (se editan desde admin.html).
// ============================================================

const FUENTE = "'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif";
const OPCIONES = [
  { valor: 'si',  sufijo: 'si' },
  { valor: 'no',  sufijo: 'no' },
  { valor: 'n/a', sufijo: 'na' }
];

let CFG = cargarConfig();

// Fecha local (toISOString usa UTC y en la noche devolvería el día siguiente)
function fechaLocal() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ---------- Marca → Modelo ----------
function construirMarcas() {
  const sel = document.getElementById('marca');
  const previa = sel.value;
  sel.innerHTML = '';
  sel.add(new Option('Seleccione...', ''));
  CFG.checklist.marcas.forEach(m => sel.add(new Option(m.nombre, m.nombre)));
  sel.value = previa;
  if (sel.selectedIndex < 0) sel.value = '';
  construirModelos();
}

function construirModelos() {
  const marca = document.getElementById('marca').value;
  const sel = document.getElementById('modelo');
  const previo = sel.value;
  sel.innerHTML = '';

  if (!marca) {
    sel.add(new Option('Seleccione primero la marca', ''));
    return;
  }
  sel.add(new Option('Seleccione...', ''));
  const datos = CFG.checklist.marcas.find(m => m.nombre === marca);
  (datos ? datos.modelos : []).forEach(mod => sel.add(new Option(mod, mod)));
  sel.value = previo;
  if (sel.selectedIndex < 0) sel.value = '';
}

// ---------- Tabla de actividades ----------
function respuestasActuales() {
  const n = document.querySelectorAll('#actividadesBody tr').length;
  return Array.from({ length: n }, (_, i) => {
    const r = document.querySelector(`input[name="act-${i}"]:checked`);
    return r ? r.value : '';
  });
}

function construirTabla(respuestas = []) {
  const tbody = document.getElementById('actividadesBody');
  tbody.innerHTML = '';

  CFG.checklist.actividades.forEach((texto, i) => {
    const tr = document.createElement('tr');

    const tdNum = document.createElement('td');
    tdNum.textContent = i + 1;
    tr.appendChild(tdNum);

    const tdDesc = document.createElement('td');
    tdDesc.className = 'descrip';
    tdDesc.textContent = texto;
    tr.appendChild(tdDesc);

    OPCIONES.forEach(op => {
      const td = document.createElement('td');
      td.className = 'select-checkbox';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `act-${i}`;
      radio.id = `act-${i}-${op.sufijo}`;
      radio.value = op.valor;
      if (respuestas[i] === op.valor) radio.checked = true;
      td.appendChild(radio);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// config.js lo llama si la configuración cambia en otra pestaña
function alActualizarConfig() {
  const respuestas = respuestasActuales();
  CFG = cargarConfig();
  construirMarcas();
  construirTabla(respuestas);
}

// ---------- Vista previa de imágenes ----------
document.getElementById('imagenes').addEventListener('change', function (event) {
  const imagePreview = document.getElementById('imagePreview');
  imagePreview.innerHTML = '';

  Array.from(event.target.files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.classList.add('image-preview');
      imagePreview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

// ---------- Validación ----------
function validarFormulario() {
  const faltantes = [];

  [
    ['fecha', 'Fecha'], ['sede', 'Sede'], ['area', 'Área'], ['piso', 'Piso'],
    ['marca', 'Marca'], ['modelo', 'Modelo'], ['serial', 'Serial'], ['placa', 'Placa'],
    ['observaciones', 'Observaciones y Recomendaciones'],
    ['responsable', 'Responsable SWO'], ['usuario', 'Usuario Belcorp'], ['cargo', 'Cargo']
  ].forEach(([id, nombre]) => {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) faltantes.push(nombre);
  });

  if (!document.querySelector('input[name="tipo"]:checked')) faltantes.push('Tipo de equipo');
  if (!document.querySelector('input[name="sistema"]:checked')) faltantes.push('Sistema Operativo');

  const actividades = [];
  CFG.checklist.actividades.forEach((_, i) => {
    if (!document.querySelector(`input[name="act-${i}"]:checked`)) actividades.push(i + 1);
  });

  return { faltantes, actividades };
}

// ---------- PDF ----------
function aplicar(raiz, selector, estilos) {
  raiz.querySelectorAll(selector).forEach(el => Object.assign(el.style, estilos));
}

function cajaPDF(texto, extra = {}) {
  const d = document.createElement('div');
  d.textContent = texto;
  Object.assign(d.style, {
    border: '1px solid #ddd',
    borderRadius: '6px',
    padding: '3px',
    width: '100%',
    minHeight: '18px',
    backgroundColor: '#f9f9f9',
    fontSize: '10px',
    fontFamily: FUENTE
  }, extra);
  return d;
}

// Lee una imagen, la reduce (máx. 1600 px) y la devuelve como JPEG.
// Así funciona con PNG/WEBP y el PDF no pesa de más.
function leerImagen(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer ' + file.name));
    reader.onload = e => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen no válida: ' + file.name));
      img.onload = () => {
        const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ data: canvas.toDataURL('image/jpeg', 0.85), width: canvas.width, height: canvas.height });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Agrega las imágenes al PDF: 2 por página (1 sola ocupa la página completa)
async function agregarImagenes(pdf, files) {
  const lista = Array.from(files).filter(f => f.type.startsWith('image/'));
  const ANCHO = 210, ALTO = 297, M = 5, SEP = 3;
  const utilW = ANCHO - 2 * M;
  const utilH = ALTO - 2 * M;

  for (let i = 0; i < lista.length; i += 2) {
    const grupo = await Promise.all(lista.slice(i, i + 2).map(leerImagen));
    pdf.addPage();
    const altoMax = grupo.length === 2 ? (utilH - SEP) / 2 : utilH;

    grupo.forEach((img, k) => {
      const ratio = img.width / img.height;
      let w = utilW;
      let h = w / ratio;
      if (h > altoMax) { h = altoMax; w = h * ratio; }
      const x = (ANCHO - w) / 2;
      const y = grupo.length === 2 ? M + k * (altoMax + SEP) : (ALTO - h) / 2;
      pdf.addImage(img.data, 'JPEG', x, y, w, h, undefined, 'FAST');
    });
  }
}

function generarPDF() {
  const btn = document.getElementById('generatePdfBtn');
  btn.disabled = true;
  btn.textContent = 'Generando PDF...';
  const restaurarBoton = () => { btn.disabled = false; btn.textContent = 'Generar PDF'; };

  // Copia del contenido para no afectar la pantalla
  const copia = document.querySelector('.main').cloneNode(true);

  // Diseño más compacto para el PDF
  copia.style.padding = '5px';
  aplicar(copia, '.header', { padding: '3px', marginBottom: '3px' });
  aplicar(copia, '#logo1', { maxWidth: '50%' });
  aplicar(copia, '#logo2', { maxWidth: '85%' });
  aplicar(copia, 'h1', { fontSize: '12px', margin: '2px auto', lineHeight: '1.2' });
  aplicar(copia, '.section2-form, .form-section3', { marginTop: '3px', marginBottom: '3px' });
  aplicar(copia, '.componente', { margin: '5px auto' });
  aplicar(copia, '.componente label', { fontSize: '14px' });
  aplicar(copia, '.form-group', { padding: '2px', marginBottom: '2px' });
  aplicar(copia, '.form-group label, h3', { fontSize: '11px' });
  aplicar(copia, '.table-section4', { marginTop: '5px', marginBottom: '5px' });
  aplicar(copia, 'table', { marginTop: '5px', fontSize: '10px' });
  aplicar(copia, 'td, th', { padding: '2px', fontSize: '10px' });
  // No forzar salto de página antes de observaciones: que fluya
  aplicar(copia, '.sectionObservation', { marginTop: '5px', marginBottom: '5px', pageBreakBefore: 'auto', breakBefore: 'auto' });

  // Ocultar lo que no va en el PDF
  aplicar(copia, '.pdf-button, #imagePreview', { display: 'none' });
  const inputArchivo = copia.querySelector('#imagenes');
  if (inputArchivo && inputArchivo.parentElement) inputArchivo.parentElement.style.display = 'none';

  // Selects → texto
  copia.querySelectorAll('select').forEach(select => {
    const original = document.getElementById(select.id);
    const opcion = original && original.selectedIndex >= 0 ? original.options[original.selectedIndex] : null;
    select.replaceWith(cajaPDF(opcion && original.value ? opcion.text : ''));
  });

  // Observaciones → texto completo
  const textarea = copia.querySelector('#observaciones');
  if (textarea) {
    textarea.replaceWith(cajaPDF(document.getElementById('observaciones').value, {
      minHeight: '60px', padding: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word'
    }));
  }

  // Inputs de texto/fecha → texto
  copia.querySelectorAll('input[type="text"], input[type="date"]').forEach(input => {
    const original = document.getElementById(input.id);
    if (original) input.replaceWith(cajaPDF(original.value));
  });

  // Radios → círculos (relleno si está marcado)
  copia.querySelectorAll('input[type="radio"]').forEach(radio => {
    const original = document.getElementById(radio.id);
    if (!original) return;
    const c = document.createElement('div');
    Object.assign(c.style, {
      width: '8px', height: '8px', border: '1px solid #333', borderRadius: '50%',
      margin: '0 auto', backgroundColor: original.checked ? '#007bff' : '#fff'
    });
    radio.replaceWith(c);
  });

  const opt = {
    margin: [3, 3, 3, 3],
    filename: `Checklist_Mantenimiento_Preventivo_${fechaLocal()}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: {
      scale: 2, useCORS: true, logging: false, letterRendering: true, allowTaint: true,
      scrollX: 0, scrollY: 0, windowHeight: document.documentElement.scrollHeight
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
    pagebreak: { mode: ['avoid-all', 'css'], avoid: '.table-section4' }
  };

  const temporal = document.createElement('div');
  temporal.style.fontFamily = FUENTE;
  temporal.appendChild(copia);

  const imagenes = document.getElementById('imagenes').files;

  html2pdf()
    .from(temporal)
    .set(opt)
    .toPdf()
    .get('pdf')
    .then(pdf => (imagenes.length ? agregarImagenes(pdf, imagenes).then(() => pdf) : pdf))
    .save()
    .then(restaurarBoton)
    .catch(error => {
      console.error('Error generando PDF:', error);
      alert('Ocurrió un error al generar el PDF. Detalles: ' + error.message);
      restaurarBoton();
    });
}

document.getElementById('generatePdfBtn').addEventListener('click', () => {
  const { faltantes, actividades } = validarFormulario();

  if (faltantes.length || actividades.length) {
    let mensaje = 'Por favor complete los siguientes campos obligatorios:\n';
    if (faltantes.length) mensaje += '- ' + faltantes.join('\n- ') + '\n';
    if (actividades.length) mensaje += '\nActividades sin completar (filas):\n- ' + actividades.join('\n- ');
    alert(mensaje);
    return;
  }
  generarPDF();
});

// ---------- Inicialización ----------
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fecha').value = fechaLocal();

  construirMarcas();
  construirTabla();
  document.getElementById('marca').addEventListener('change', construirModelos);

  // El campo de observaciones crece con el texto
  const obs = document.getElementById('observaciones');
  obs.style.minHeight = '100px';
  obs.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });
});
