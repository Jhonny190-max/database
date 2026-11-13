// ===== CONFIGURACIÓN SUPABASE (Project Settings > API) =====
const SUPABASE_URL = 'https://tmgmwahxnklltehqtdsl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6LfSLUlrZEjl4D4P11kCSQ_gN05rqud';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => 'S/ ' + Number(n || 0).toLocaleString('es-PE', {minimumFractionDigits: 2});
const cache = {alumnos: [], entrenadores: [], planes: [], pagos: [], asistencias: []};
const ESTADOS = ['Activo', 'Inactivo', 'Vencido'];
const byId = (t, id) => cache[t].find(x => x.id === id);
const nombre = a => a ? `${a.nombres} ${a.apellidos}` : '—';
const badge = e => `<span class="badge b-${esc(e)}">${esc(e)}</span>`;

// ===== Definición de módulos (columnas y campos del formulario) =====
const M = {
  alumnos: {titulo: 'Alumnos', uno: 'alumno', filtro: ESTADOS,
    cols: [['ID', r => r.id], ['Nombre', r => esc(nombre(r))], ['DNI', r => esc(r.dni)], ['Teléfono', r => esc(r.telefono)], ['Registro', r => esc(r.fecha_registro)], ['Estado', r => badge(r.estado)]],
    campos: [{k:'nombres',l:'Nombres',req:1},{k:'apellidos',l:'Apellidos',req:1},{k:'dni',l:'DNI',req:1},{k:'telefono',l:'Teléfono',t:'tel'},{k:'correo',l:'Correo electrónico',t:'email'},{k:'fecha_nacimiento',l:'Fecha de nacimiento',t:'date'},{k:'sexo',l:'Sexo',o:['Masculino','Femenino','Otro']},{k:'fecha_registro',l:'Fecha de registro',t:'date',def:'hoy'},{k:'direccion',l:'Dirección',full:1},{k:'estado',l:'Estado',o:ESTADOS,def:'Activo'}]},
  entrenadores: {titulo: 'Entrenadores', uno: 'entrenador', filtro: ['Activo', 'Inactivo'],
    cols: [['ID', r => r.id], ['Nombre', r => esc(nombre(r))], ['DNI', r => esc(r.dni)], ['Especialidad', r => esc(r.especialidad)], ['Teléfono', r => esc(r.telefono)], ['Estado', r => badge(r.estado)]],
    campos: [{k:'nombres',l:'Nombres',req:1},{k:'apellidos',l:'Apellidos',req:1},{k:'dni',l:'DNI'},{k:'telefono',l:'Teléfono',t:'tel'},{k:'correo',l:'Correo electrónico',t:'email'},{k:'especialidad',l:'Especialidad'},{k:'estado',l:'Estado',o:['Activo','Inactivo'],def:'Activo'}]},
  planes: {titulo: 'Planes', uno: 'plan', filtro: ['Activo', 'Inactivo'],
    cols: [['ID', r => r.id], ['Plan', r => esc(r.nombre)], ['Descripción', r => esc(r.descripcion)], ['Duración', r => r.duracion_dias + ' días'], ['Precio', r => money(r.precio)], ['Estado', r => badge(r.estado)]],
    campos: [{k:'nombre',l:'Nombre del plan',req:1,full:1},{k:'descripcion',l:'Descripción',full:1},{k:'duracion_dias',l:'Duración (días)',t:'number',req:1,def:30},{k:'precio',l:'Precio (S/)',t:'number',req:1},{k:'estado',l:'Estado',o:['Activo','Inactivo'],def:'Activo'}]},
  asistencias: {titulo: 'Asistencia', uno: 'asistencia',
    cols: [['ID', r => r.id], ['Alumno', r => esc(nombre(byId('alumnos', r.alumno_id)))], ['Fecha', r => esc(r.fecha)], ['Hora', r => esc((r.hora || '').slice(0, 5))]],
    campos: [{k:'alumno_id',l:'Alumno',req:1,sel:'alumnos',full:1},{k:'fecha',l:'Fecha',t:'date',def:'hoy'},{k:'hora',l:'Hora de entrada',t:'time'}]},
  pagos: {titulo: 'Pagos', uno: 'pago',
    cols: [['ID', r => r.id], ['Alumno', r => esc(nombre(byId('alumnos', r.alumno_id)))], ['Plan', r => esc(byId('planes', r.plan_id)?.nombre)], ['Monto', r => money(r.monto)], ['Fecha', r => esc(r.fecha_pago)], ['Método', r => esc(r.metodo)]],
    campos: [{k:'alumno_id',l:'Alumno',req:1,sel:'alumnos'},{k:'plan_id',l:'Plan',sel:'planes'},{k:'monto',l:'Monto (S/)',t:'number',req:1},{k:'fecha_pago',l:'Fecha de pago',t:'date',def:'hoy'},{k:'metodo',l:'Método',o:['Efectivo','Tarjeta','Yape/Plin','Transferencia'],def:'Efectivo'}]}
};

// ===== Utilidades de UI =====
function toast(msg, err) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 3500);
}
const icons = () => lucide.createIcons();
const openModal = html => { $('#modalBox').innerHTML = html; $('#modal').classList.add('open'); icons(); };
const closeModal = () => $('#modal').classList.remove('open');
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

async function cargar(...tablas) {
  for (const t of tablas) {
    const {data, error} = await db.from(t).select('*').order('id', {ascending: false});
    if (error) { toast(`Error al cargar ${t}: ${error.message}`, true); continue; }
    cache[t] = data;
  }
}

// ===== Dashboard =====
function ultimosMeses() {
  const out = [], hoy = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    out.push({key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('es-PE', {month: 'short'})});
  }
  return out;
}
function barras(items) {
  const max = Math.max(...items.map(i => i.v), 1);
  return `<div class="bars">${items.map(i => `<div class="bar"><span>${i.fmt ?? i.v}</span><i style="height:${i.v / max * 80}%"></i>${i.label}</div>`).join('')}</div>`;
}
async function dashboard() {
  await cargar('alumnos', 'pagos', 'planes');
  const A = cache.alumnos, P = cache.pagos, mes = new Date().toISOString().slice(0, 7);
  const ingresosMes = P.filter(p => (p.fecha_pago || '').startsWith(mes)).reduce((s, p) => s + Number(p.monto), 0);
  const meses = ultimosMeses();
  const ing = meses.map(m => {const v = P.filter(p => (p.fecha_pago || '').startsWith(m.key)).reduce((s, p) => s + Number(p.monto), 0); return {label: m.label, v, fmt: Math.round(v)};});
  const reg = meses.map(m => ({label: m.label, v: A.filter(a => (a.fecha_registro || '').startsWith(m.key)).length}));
  const stat = (ic, n, l) => `<div class="card stat"><div class="ic"><i data-lucide="${ic}"></i></div><div><b>${n}</b><span>${l}</span></div></div>`;
  const fila = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
  $('#view').innerHTML = `<div class="head"><h1>Dashboard</h1></div>
  <div class="grid">${stat('users', A.length, 'Alumnos registrados')}${stat('user-check', A.filter(a => a.estado === 'Activo').length, 'Alumnos activos')}${stat('alert-triangle', A.filter(a => a.estado === 'Vencido').length, 'Membresías vencidas')}${stat('wallet', money(ingresosMes), 'Ingresos del mes')}</div>
  <div class="two"><div class="card"><h3>Ingresos (S/) últimos 6 meses</h3>${barras(ing)}</div><div class="card"><h3>Alumnos nuevos por mes</h3>${barras(reg)}</div></div>
  <div class="two"><div class="card"><h3>Últimos pagos</h3><table style="min-width:0"><tbody>${P.slice(0, 5).map(p => fila(esc(nombre(byId('alumnos', p.alumno_id))), money(p.monto))).join('') || '<tr><td class="empty">Aún no hay pagos</td></tr>'}</tbody></table></div>
  <div class="card"><h3>Últimos alumnos</h3><table style="min-width:0"><tbody>${A.slice(0, 5).map(a => fila(esc(nombre(a)), badge(a.estado))).join('') || '<tr><td class="empty">Aún no hay alumnos</td></tr>'}</tbody></table></div></div>`;
  icons();
}

// ===== CRUD genérico =====
async function crud(t) {
  const cfg = M[t];
  await cargar(t, ...(t === 'pagos' || t === 'asistencias' ? ['alumnos', 'planes'] : []));
  $('#view').innerHTML = `<div class="head"><h1>${cfg.titulo}</h1><button class="btn" id="nuevo"><i data-lucide="plus"></i>Nuevo ${cfg.uno}</button></div>
  <div class="tools"><input id="q" type="search" placeholder="Buscar...">${cfg.filtro ? `<select id="f"><option value="">Todos los estados</option>${cfg.filtro.map(e => `<option>${e}</option>`).join('')}</select>` : ''}</div>
  <div class="tw"><table><thead><tr>${cfg.cols.map(c => `<th>${c[0]}</th>`).join('')}<th></th></tr></thead><tbody id="tb"></tbody></table></div>`;
  const pintar = () => {
    const q = $('#q').value.toLowerCase(), f = $('#f')?.value;
    const filas = cache[t].filter(r => (!f || r.estado === f) && (!q || (Object.values(r).join(' ') + ' ' + nombre(byId('alumnos', r.alumno_id))).toLowerCase().includes(q)));
    $('#tb').innerHTML = filas.map(r => `<tr>${cfg.cols.map(c => `<td>${c[1](r)}</td>`).join('')}<td><div class="acts"><button class="icon-btn" data-e="${r.id}" aria-label="Editar"><i data-lucide="pencil"></i></button><button class="icon-btn del" data-d="${r.id}" aria-label="Eliminar"><i data-lucide="trash-2"></i></button></div></td></tr>`).join('') || `<tr><td colspan="${cfg.cols.length + 1}" class="empty">Sin resultados. Usa “Nuevo ${cfg.uno}” para agregar uno.</td></tr>`;
    icons();
  };
  pintar();
  $('#q').oninput = pintar;
  if ($('#f')) $('#f').onchange = pintar;
  $('#nuevo').onclick = () => formulario(t);
  $('#tb').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.e) formulario(t, byId(t, +b.dataset.e));
    if (b.dataset.d) confirmar(t, +b.dataset.d);
  };
}

function formulario(t, r = null) {
  const cfg = M[t];
  const campo = c => {
    const v = r ? (r[c.k] ?? '') : (c.def === 'hoy' ? new Date().toISOString().slice(0, 10) : (c.def ?? ''));
    let inp;
    if (c.sel) inp = `<select name="${c.k}" ${c.req ? 'required' : ''}><option value="">Seleccionar...</option>${cache[c.sel].map(o => `<option value="${o.id}" ${o.id == v ? 'selected' : ''}>${esc(o.nombres ? nombre(o) : o.nombre)}</option>`).join('')}</select>`;
    else if (c.o) inp = `<select name="${c.k}"><option value="">Seleccionar...</option>${c.o.map(o => `<option ${o == v ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    else inp = `<input name="${c.k}" type="${c.t || 'text'}" step="any" value="${esc(v)}" ${c.req ? 'required' : ''}>`;
    return `<div class="${c.full ? 'full' : ''}"><label>${c.l}</label>${inp}</div>`;
  };
  openModal(`<h2>${r ? 'Editar' : 'Nuevo'} ${cfg.uno}</h2><form id="frm"><div class="form">${cfg.campos.map(campo).join('')}</div><div class="foot"><button type="button" class="btn ghost" id="cancel">Cancelar</button><button class="btn">Guardar</button></div></form>`);
  $('#cancel').onclick = closeModal;
  if (t === 'pagos') $('[name=plan_id]').onchange = e => { const p = byId('planes', +e.target.value); if (p) $('[name=monto]').value = p.precio; };
  $('#frm').onsubmit = async e => {
    e.preventDefault();
    const d = {};
    cfg.campos.forEach(c => { let v = new FormData(e.target).get(c.k); d[c.k] = v === '' ? null : (c.t === 'number' || c.sel ? Number(v) : v); });
    const q = r ? db.from(t).update(d).eq('id', r.id) : db.from(t).insert(d);
    const {error} = await q;
    if (error) return toast(error.message.includes('duplicate') ? 'Ya existe un registro con ese DNI.' : `No se pudo guardar: ${error.message}`, true);
    if (t === 'pagos' && !r) await db.from('alumnos').update({estado: 'Activo'}).eq('id', d.alumno_id);
    closeModal(); toast('Guardado correctamente'); crud(t);
  };
}

function confirmar(t, id) {
  openModal(`<h2>¿Eliminar ${M[t].uno}?</h2><p>Esta acción no se puede deshacer.</p><div class="foot"><button class="btn ghost" id="cancel">Cancelar</button><button class="btn" id="ok">Eliminar</button></div>`);
  $('#cancel').onclick = closeModal;
  $('#ok').onclick = async () => {
    const {error} = await db.from(t).delete().eq('id', id);
    closeModal();
    if (error) return toast(`No se pudo eliminar: ${error.message}`, true);
    toast('Registro eliminado'); crud(t);
  };
}

// ===== Navegación, tema y arranque =====
function ir(v) {
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.v === v));
  $('#sidebar').classList.remove('open');
  v === 'dashboard' ? dashboard() : crud(v);
}
$('#nav').onclick = e => { const a = e.target.closest('a'); if (a) { e.preventDefault(); ir(a.dataset.v); } };
$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
$('#themeBtn').onclick = () => {
  const h = document.documentElement, n = h.dataset.theme === 'dark' ? 'light' : 'dark';
  h.dataset.theme = n; localStorage.setItem('gym-theme', n);
};
document.documentElement.dataset.theme = localStorage.getItem('gym-theme') || 'dark';
$('#today').textContent = new Date().toLocaleDateString('es-PE', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
icons();
ir('dashboard');