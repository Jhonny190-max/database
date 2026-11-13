
// =====================================================
// GYM SYSTEM - SISTEMA DE GESTION DE GIMNASIO
// HTML + CSS + JAVASCRIPT + SUPABASE
// =====================================================

// 1. CONEXION CON SUPABASE
const SUPABASE_URL = 'https://tmgmwahxnklltehqtdsl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6LfSLUlrZEjl4D4P11kCSQ_gN05rqud';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =====================================================
// 2. UTILIDADES
// =====================================================

const $ = selector => document.querySelector(selector);

const cache = {
    alumnos: [],
    entrenadores: [],
    planes: [],
    pagos: [],
    asistencias: []
};

const ESTADOS = ['Activo', 'Inactivo', 'Vencido'];

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[char]));

const money = value => 'S/ ' + Number(value || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const nombre = persona =>
    persona ? `${persona.nombres || ''} ${persona.apellidos || ''}`.trim() : '—';

const byId = (table, id) =>
    cache[table]?.find(item => String(item.id) === String(id));

const fechaHoy = () => {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
};

// VALIDACION DE EDAD MINIMA: 13 AÑOS
function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return null;

    const nacimiento = new Date(fechaNacimiento + 'T00:00:00');
    const hoy = new Date(fechaHoy() + 'T00:00:00');

    if (Number.isNaN(nacimiento.getTime())) return null;
    if (nacimiento > hoy) return null;

    let edad = hoy.getFullYear() - nacimiento.getFullYear();

    const aunNoCumple =
        hoy.getMonth() < nacimiento.getMonth() ||
        (
            hoy.getMonth() === nacimiento.getMonth() &&
            hoy.getDate() < nacimiento.getDate()
        );

    if (aunNoCumple) edad--;

    return edad;
}

function validarEdadAlumno(fechaNacimiento) {
    if (!fechaNacimiento) {
        return 'Debes ingresar la fecha de nacimiento.';
    }

    const edad = calcularEdad(fechaNacimiento);

    if (edad === null) {
        return 'La fecha de nacimiento no es válida.';
    }

    if (edad < 13) {
        return 'No se permiten alumnos menores de 13 años.';
    }

    return null;
}

const badge = estado =>
    `<span class="badge b-${esc(estado)}">${esc(estado)}</span>`;

const icons = () => {
    if (window.lucide) lucide.createIcons();
};

// =====================================================
// 3. NOTIFICACIONES Y MODALES
// =====================================================

function toast(message, error = false) {
    const container = $('#toasts');

    if (!container) {
        alert(message);
        return;
    }

    const element = document.createElement('div');
    element.className = 'toast' + (error ? ' err' : '');
    element.textContent = message;

    container.appendChild(element);

    setTimeout(() => element.remove(), 4000);
}

function openModal(html) {
    $('#modalBox').innerHTML = html;
    $('#modal').classList.add('open');
    icons();
}

function closeModal() {
    $('#modal').classList.remove('open');
}

$('#modal').addEventListener('click', event => {
    if (event.target.id === 'modal') closeModal();
});

// =====================================================
// 4. CARGAR INFORMACION DE SUPABASE
// =====================================================

async function cargar(...tables) {
    for (const table of tables) {
        const { data, error } = await db
            .from(table)
            .select('*')
            .order('id', { ascending: false });

        if (error) {
            console.error(`Error en ${table}:`, error);
            toast(`Error al cargar ${table}: ${error.message}`, true);
            continue;
        }

        cache[table] = data || [];
    }
}

// =====================================================
// 5. CONFIGURACION DE LOS MODULOS
// =====================================================

const M = {

    alumnos: {
        titulo: 'Alumnos',
        uno: 'alumno',
        filtro: ESTADOS,

        cols: [
            ['ID', r => r.id],
            ['Nombre', r => esc(nombre(r))],
            ['DNI', r => esc(r.dni)],
            ['Teléfono', r => esc(r.telefono)],
            ['Entrenador', r => esc(nombre(byId('entrenadores', r.entrenador_id)))],
            ['Registro', r => esc(r.fecha_registro)],
            ['Estado', r => badge(r.estado)]
        ],

        campos: [
            { k: 'nombres', l: 'Nombres', req: 1 },
            { k: 'apellidos', l: 'Apellidos', req: 1 },
            { k: 'dni', l: 'DNI', req: 1 },
            { k: 'telefono', l: 'Teléfono', t: 'tel' },
            { k: 'correo', l: 'Correo electrónico', t: 'email' },
            { k: 'fecha_nacimiento', l: 'Fecha de nacimiento', t: 'date', req: 1 },
            { k: 'sexo', l: 'Sexo', o: ['Masculino', 'Femenino', 'Otro'] },
            { k: 'direccion', l: 'Dirección', full: 1 },
            { k: 'entrenador_id', l: 'Entrenador asignado', sel: 'entrenadores', full: 1 },
            { k: 'fecha_registro', l: 'Fecha de registro', t: 'date', def: 'hoy' },
            { k: 'estado', l: 'Estado', o: ESTADOS, def: 'Activo' }
        ]
    },

    entrenadores: {
        titulo: 'Entrenadores',
        uno: 'entrenador',
        filtro: ['Activo', 'Inactivo'],

        cols: [
            ['ID', r => r.id],
            ['Nombre', r => esc(nombre(r))],
            ['DNI', r => esc(r.dni)],
            ['Especialidad', r => esc(r.especialidad)],
            ['Teléfono', r => esc(r.telefono)],
            ['Estado', r => badge(r.estado)]
        ],

        campos: [
            { k: 'nombres', l: 'Nombres', req: 1 },
            { k: 'apellidos', l: 'Apellidos', req: 1 },
            { k: 'dni', l: 'DNI' },
            { k: 'telefono', l: 'Teléfono', t: 'tel' },
            { k: 'correo', l: 'Correo electrónico', t: 'email' },
            { k: 'especialidad', l: 'Especialidad' },
            { k: 'estado', l: 'Estado', o: ['Activo', 'Inactivo'], def: 'Activo' }
        ]
    },

    planes: {
        titulo: 'Planes',
        uno: 'plan',
        filtro: ['Activo', 'Inactivo'],

        cols: [
            ['ID', r => r.id],
            ['Plan', r => esc(r.nombre)],
            ['Descripción', r => esc(r.descripcion)],
            ['Duración', r => r.duracion_dias + ' días'],
            ['Precio', r => money(r.precio)],
            ['Estado', r => badge(r.estado)]
        ],

        campos: [
            { k: 'nombre', l: 'Nombre del plan', req: 1, full: 1 },
            { k: 'descripcion', l: 'Descripción', full: 1 },
            { k: 'duracion_dias', l: 'Duración (días)', t: 'number', req: 1, def: 30 },
            { k: 'precio', l: 'Precio (S/)', t: 'number', req: 1 },
            { k: 'estado', l: 'Estado', o: ['Activo', 'Inactivo'], def: 'Activo' }
        ]
    },

    pagos: {
        titulo: 'Pagos',
        uno: 'pago',

        cols: [
            ['ID', r => r.id],
            ['Alumno', r => esc(nombre(byId('alumnos', r.alumno_id)))],
            ['Plan', r => esc(byId('planes', r.plan_id)?.nombre)],
            ['Monto', r => money(r.monto)],
            ['Fecha', r => esc(r.fecha_pago)],
            ['Método', r => esc(r.metodo)]
        ],

        campos: [
            { k: 'alumno_id', l: 'Alumno', req: 1, sel: 'alumnos' },
            { k: 'plan_id', l: 'Plan', req: 1, sel: 'planes' },
            { k: 'monto', l: 'Monto (S/)', t: 'number', req: 1 },
            { k: 'fecha_pago', l: 'Fecha de pago', t: 'date', def: 'hoy' },
            { k: 'metodo', l: 'Método', o: ['Efectivo', 'Tarjeta', 'Yape/Plin', 'Transferencia'], def: 'Efectivo' }
        ]
    },

    asistencias: {
        titulo: 'Asistencia',
        uno: 'asistencia',

        cols: [
            ['ID', r => r.id],
            ['Alumno', r => esc(nombre(byId('alumnos', r.alumno_id)))],
            ['Fecha', r => esc(r.fecha)],
            ['Hora', r => esc((r.hora || '').slice(0, 5))]
        ],

        campos: [
            { k: 'alumno_id', l: 'Alumno', req: 1, sel: 'alumnos', full: 1 },
            { k: 'fecha', l: 'Fecha', t: 'date', def: 'hoy' },
            { k: 'hora', l: 'Hora de entrada', t: 'time' }
        ]
    }
};

// =====================================================
// 6. DASHBOARD
// =====================================================

function ultimosMeses() {
    const resultado = [];
    const hoy = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);

        resultado.push({
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: d.toLocaleDateString('es-PE', { month: 'short' })
        });
    }

    return resultado;
}

function barras(items) {
    const max = Math.max(...items.map(i => i.v), 1);

    return `<div class="bars">
        ${items.map(i => `
            <div class="bar">
                <span>${i.fmt ?? i.v}</span>
                <i style="height:${Math.max(i.v / max * 80, 2)}%"></i>
                ${esc(i.label)}
            </div>
        `).join('')}
    </div>`;
}

async function dashboard() {
    await cargar('alumnos', 'entrenadores', 'planes', 'pagos', 'asistencias');

    const A = cache.alumnos;
    const P = cache.pagos;

    const mes = fechaHoy().slice(0, 7);

    const ingresosMes = P
        .filter(p => (p.fecha_pago || '').startsWith(mes))
        .reduce((s, p) => s + Number(p.monto), 0);

    const meses = ultimosMeses();

    const ingresos = meses.map(m => {
        const v = P
            .filter(p => (p.fecha_pago || '').startsWith(m.key))
            .reduce((s, p) => s + Number(p.monto), 0);

        return { label: m.label, v, fmt: Math.round(v) };
    });

    const registros = meses.map(m => ({
        label: m.label,
        v: A.filter(a => (a.fecha_registro || '').startsWith(m.key)).length
    }));

    const stat = (icon, value, label) => `
        <div class="card stat">
            <div class="ic"><i data-lucide="${icon}"></i></div>
            <div><b>${value}</b><span>${label}</span></div>
        </div>`;

    const fila = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;

    $('#view').innerHTML = `
        <div class="head"><h1>Dashboard</h1></div>

        <div class="grid">
            ${stat('users', A.length, 'Alumnos registrados')}
            ${stat('user-check', A.filter(a => a.estado === 'Activo').length, 'Alumnos activos')}
            ${stat('dumbbell', cache.entrenadores.length, 'Entrenadores')}
            ${stat('wallet', money(ingresosMes), 'Ingresos del mes')}
        </div>

        <div class="two">
            <div class="card">
                <h3>Ingresos (S/) últimos 6 meses</h3>
                ${barras(ingresos)}
            </div>

            <div class="card">
                <h3>Alumnos nuevos por mes</h3>
                ${barras(registros)}
            </div>
        </div>

        <div class="two">
            <div class="card">
                <h3>Últimos pagos</h3>
                <table style="min-width:0">
                    <tbody>
                        ${P.slice(0, 5).map(p =>
                            fila(esc(nombre(byId('alumnos', p.alumno_id))), money(p.monto))
                        ).join('') || '<tr><td class="empty">Aún no hay pagos</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div class="card">
                <h3>Últimos alumnos</h3>
                <table style="min-width:0">
                    <tbody>
                        ${A.slice(0, 5).map(a =>
                            fila(esc(nombre(a)), badge(a.estado))
                        ).join('') || '<tr><td class="empty">Aún no hay alumnos</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    icons();
}

// =====================================================
// 7. FORMULARIOS GENERALES
// =====================================================

function crearCampo(campo, registro = null) {
    const valor = registro
        ? (registro[campo.k] ?? '')
        : (campo.def === 'hoy' ? fechaHoy() : (campo.def ?? ''));

    let input = '';

    if (campo.sel) {
        const opciones = cache[campo.sel] || [];

        input = `
            <select name="${campo.k}" ${campo.req ? 'required' : ''}>
                <option value="">Seleccionar...</option>
                ${opciones.map(o => `
                    <option value="${esc(o.id)}" ${String(o.id) === String(valor) ? 'selected' : ''}>
                        ${esc(o.nombres ? nombre(o) : o.nombre)}
                    </option>
                `).join('')}
            </select>`;
    } else if (campo.o) {
        input = `
            <select name="${campo.k}" ${campo.req ? 'required' : ''}>
                <option value="">Seleccionar...</option>
                ${campo.o.map(o => `
                    <option value="${esc(o)}" ${o === valor ? 'selected' : ''}>
                        ${esc(o)}
                    </option>
                `).join('')}
            </select>`;
    } else {
        input = `
            <input
                name="${campo.k}"
                type="${campo.t || 'text'}"
                value="${esc(valor)}"
                ${campo.k === 'fecha_nacimiento' ? `max="${fechaHoy()}" required` : ''}
                ${campo.t === 'number' ? 'min="0" step="0.01"' : ''}
                ${campo.req ? 'required' : ''}
            >`;
    }

    return `
        <div class="${campo.full ? 'full' : ''}">
            <label>${esc(campo.l)}${campo.k === 'fecha_nacimiento' ? ' *' : ''}</label>
            ${input}
        </div>`;
}

function formulario(t, registro = null) {
    const cfg = M[t];

    openModal(`
        <h2>${registro ? 'Editar' : 'Nuevo'} ${cfg.uno}</h2>

        <form id="frm">
            <div class="form">
                ${cfg.campos.map(c => crearCampo(c, registro)).join('')}
            </div>

            <div class="foot">
                <button type="button" class="btn ghost" id="cancel">Cancelar</button>
                <button type="submit" class="btn">Guardar</button>
            </div>
        </form>
    `);

    $('#cancel').onclick = closeModal;

    if (t === 'pagos') {
        const planSelect = $('[name="plan_id"]');
        const monto = $('[name="monto"]');

        planSelect.onchange = () => {
            const plan = byId('planes', planSelect.value);
            if (plan) monto.value = Number(plan.precio);
        };
    }

    $('#frm').onsubmit = async event => {
        event.preventDefault();

        const formData = new FormData(event.target);

        // VALIDAR EDAD AL REGISTRAR O EDITAR ALUMNOS
        if (t === 'alumnos') {
            const errorEdad = validarEdadAlumno(formData.get('fecha_nacimiento'));

            if (errorEdad) {
                return toast(errorEdad, true);
            }
        }

        const datos = {};

        cfg.campos.forEach(c => {
            const value = formData.get(c.k);

            datos[c.k] = value === ''
                ? null
                : (c.t === 'number' || c.sel ? Number(value) : value);
        });

        if (t === 'alumnos' && !datos.entrenador_id) {
            datos.entrenador_id = null;
        }

        const query = registro
            ? db.from(t).update(datos).eq('id', registro.id)
            : db.from(t).insert(datos);

        const { error } = await query;

        if (error) {
            console.error(error);
            return toast(`No se pudo guardar: ${error.message}`, true);
        }

        closeModal();
        toast('Registro guardado correctamente');
        await crud(t);
    };
}

// =====================================================
// 8. NUEVA INSCRIPCION INTEGRAL
// =====================================================

async function nuevaInscripcion() {
    await cargar('entrenadores', 'planes');

    const entrenadores = cache.entrenadores.filter(e => e.estado === 'Activo');
    const planes = cache.planes.filter(p => p.estado === 'Activo');

    if (!planes.length) {
        toast('Primero debes crear al menos un plan activo.', true);
        ir('planes');
        return;
    }

    openModal(`
        <h2>Nueva inscripción</h2>

        <p style="color:var(--muted);margin-bottom:16px">
            Registra al alumno, selecciona su plan, asigna un entrenador y registra su primer pago.
        </p>

        <form id="frmInscripcion">

            <h3 class="full">1. Datos personales</h3>

            <div class="form">

                <div>
                    <label>Nombres *</label>
                    <input name="nombres" required maxlength="100">
                </div>

                <div>
                    <label>Apellidos *</label>
                    <input name="apellidos" required maxlength="100">
                </div>

                <div>
                    <label>DNI *</label>
                    <input name="dni" required maxlength="20">
                </div>

                <div>
                    <label>Teléfono</label>
                    <input name="telefono" type="tel">
                </div>

                <div>
                    <label>Correo electrónico</label>
                    <input name="correo" type="email">
                </div>

                <div>
                    <label>Fecha de nacimiento *</label>
                    <input name="fecha_nacimiento" type="date" max="${fechaHoy()}" required>
                </div>

                <div>
                    <label>Sexo</label>
                    <select name="sexo">
                        <option value="">Seleccionar...</option>
                        <option>Masculino</option>
                        <option>Femenino</option>
                        <option>Otro</option>
                    </select>
                </div>

                <div>
                    <label>Fecha de inscripción</label>
                    <input name="fecha_registro" type="date" value="${fechaHoy()}" required>
                </div>

                <div class="full">
                    <label>Dirección</label>
                    <input name="direccion">
                </div>

                <h3 class="full">2. Selección del plan</h3>

                <div class="full">
                    <label>Plan de membresía *</label>
                    <select name="plan_id" id="ins_plan" required>
                        <option value="">Seleccionar plan...</option>
                        ${planes.map(p => `
                            <option value="${p.id}" data-precio="${p.precio}" data-duracion="${p.duracion_dias}">
                                ${esc(p.nombre)} - ${money(p.precio)} / ${p.duracion_dias} días
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div>
                    <label>Precio del plan</label>
                    <input id="ins_precio" readonly placeholder="Selecciona un plan">
                </div>

                <div>
                    <label>Duración</label>
                    <input id="ins_duracion" readonly placeholder="En días">
                </div>

                <h3 class="full">3. Asignación del entrenador</h3>

                <div class="full">
                    <label>Entrenador asignado</label>
                    <select name="entrenador_id">
                        <option value="">Sin entrenador asignado</option>
                        ${entrenadores.map(e => `
                            <option value="${e.id}">
                                ${esc(nombre(e))} - ${esc(e.especialidad || 'General')}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <h3 class="full">4. Pago inicial</h3>

                <div>
                    <label>Monto pagado (S/) *</label>
                    <input name="monto" id="ins_monto" type="number" min="0.01" step="0.01" required>
                </div>

                <div>
                    <label>Método de pago *</label>
                    <select name="metodo" required>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Yape/Plin">Yape/Plin</option>
                        <option value="Tarjeta">Tarjeta</option>
                        <option value="Transferencia">Transferencia</option>
                    </select>
                </div>

                <div class="full">
                    <label>Fecha del pago</label>
                    <input name="fecha_pago" type="date" value="${fechaHoy()}" required>
                </div>

            </div>

            <div class="foot">
                <button type="button" class="btn ghost" id="cancelIns">Cancelar</button>
                <button type="submit" class="btn" id="guardarIns">Registrar inscripción</button>
            </div>

        </form>
    `);

    $('#cancelIns').onclick = closeModal;

    // ACTUALIZAR PRECIO Y DURACION AL ELEGIR UN PLAN
    $('#ins_plan').onchange = event => {
        const option = event.target.selectedOptions[0];

        if (!option.value) {
            $('#ins_precio').value = '';
            $('#ins_duracion').value = '';
            $('#ins_monto').value = '';
            return;
        }

        const precio = Number(option.dataset.precio);
        const duracion = option.dataset.duracion;

        $('#ins_precio').value = money(precio);
        $('#ins_duracion').value = `${duracion} días`;
        $('#ins_monto').value = precio.toFixed(2);
    };

    $('#frmInscripcion').onsubmit = async event => {
        event.preventDefault();

        const boton = $('#guardarIns');
        boton.disabled = true;
        boton.textContent = 'Registrando...';

        const fd = new FormData(event.target);

        // VALIDAR EDAD MINIMA DE 13 AÑOS
        const errorEdad = validarEdadAlumno(fd.get('fecha_nacimiento'));

        if (errorEdad) {
            boton.disabled = false;
            boton.textContent = 'Registrar inscripción';
            return toast(errorEdad, true);
        }

        const alumno = {
            nombres: fd.get('nombres').trim(),
            apellidos: fd.get('apellidos').trim(),
            dni: fd.get('dni').trim(),
            telefono: fd.get('telefono') || null,
            correo: fd.get('correo') || null,
            fecha_nacimiento: fd.get('fecha_nacimiento'),
            sexo: fd.get('sexo') || null,
            direccion: fd.get('direccion') || null,
            fecha_registro: fd.get('fecha_registro'),
            estado: 'Activo',
            entrenador_id: fd.get('entrenador_id')
                ? Number(fd.get('entrenador_id'))
                : null
        };

        const planId = Number(fd.get('plan_id'));
        const monto = Number(fd.get('monto'));

        if (!planId || !Number.isFinite(monto) || monto <= 0) {
            boton.disabled = false;
            boton.textContent = 'Registrar inscripción';
            return toast('Selecciona un plan e ingresa un monto válido.', true);
        }

        // PASO 1: GUARDAR ALUMNO
        const { data: nuevoAlumno, error: errorAlumno } = await db
            .from('alumnos')
            .insert(alumno)
            .select()
            .single();

        if (errorAlumno) {
            console.error(errorAlumno);
            boton.disabled = false;
            boton.textContent = 'Registrar inscripción';
            return toast(`Error al registrar alumno: ${errorAlumno.message}`, true);
        }

        // PASO 2: GUARDAR PAGO INICIAL
        const pago = {
            alumno_id: nuevoAlumno.id,
            plan_id: planId,
            monto: monto,
            fecha_pago: fd.get('fecha_pago'),
            metodo: fd.get('metodo')
        };

        const { error: errorPago } = await db
            .from('pagos')
            .insert(pago);

        if (errorPago) {
            console.error(errorPago);

            closeModal();
            await cargar('alumnos');

            toast(
                `El alumno fue registrado (ID ${nuevoAlumno.id}), pero el pago no se guardó: ${errorPago.message}. Registra el pago desde el módulo Pagos.`,
                true
            );

            return;
        }

        closeModal();

        toast('¡Inscripción y pago registrados correctamente!');

        await cargar('alumnos', 'pagos', 'entrenadores');
        await crud('alumnos');
    };
}

// =====================================================
// 9. CRUD DE LOS MODULOS
// =====================================================

async function crud(table) {
    const cfg = M[table];

    if (!cfg) return;

    const relacionadas = {
        alumnos: ['entrenadores'],
        pagos: ['alumnos', 'planes'],
        asistencias: ['alumnos']
    };

    await cargar(table, ...(relacionadas[table] || []));

    const botonNuevo = table === 'alumnos'
        ? `<button class="btn" id="nuevo"><i data-lucide="user-plus"></i>Nueva inscripción</button>`
        : `<button class="btn" id="nuevo"><i data-lucide="plus"></i>Nuevo ${cfg.uno}</button>`;

    $('#view').innerHTML = `
        <div class="head">
            <h1>${cfg.titulo}</h1>
            ${botonNuevo}
        </div>

        <div class="tools">
            <input id="q" type="search" placeholder="Buscar...">

            ${cfg.filtro ? `
                <select id="f">
                    <option value="">Todos los estados</option>
                    ${cfg.filtro.map(e => `<option value="${e}">${e}</option>`).join('')}
                </select>
            ` : ''}
        </div>

        <div class="tw">
            <table>
                <thead>
                    <tr>
                        ${cfg.cols.map(c => `<th>${c[0]}</th>`).join('')}
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="tb"></tbody>
            </table>
        </div>
    `;

    const pintar = () => {
        const q = $('#q').value.toLowerCase();
        const filtro = $('#f')?.value;

        const filas = cache[table].filter(r => {
            const entrenador = table === 'alumnos'
                ? nombre(byId('entrenadores', r.entrenador_id))
                : '';

            const texto = (
                Object.values(r).join(' ') + ' ' + entrenador
            ).toLowerCase();

            return (!filtro || r.estado === filtro) &&
                   (!q || texto.includes(q));
        });

        $('#tb').innerHTML = filas.map(r => `
            <tr>
                ${cfg.cols.map(c => `<td>${c[1](r)}</td>`).join('')}

                <td>
                    <div class="acts">
                        <button class="icon-btn" data-e="${r.id}" title="Editar">
                            <i data-lucide="pencil"></i>
                        </button>

                        <button class="icon-btn del" data-d="${r.id}" title="Eliminar">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') || `
            <tr>
                <td colspan="${cfg.cols.length + 1}" class="empty">
                    Sin resultados.
                </td>
            </tr>
        `;

        icons();
    };

    pintar();

    $('#q').oninput = pintar;

    if ($('#f')) {
        $('#f').onchange = pintar;
    }

    $('#nuevo').onclick = () => {
        if (table === 'alumnos') {
            nuevaInscripcion();
        } else {
            formulario(table);
        }
    };

    $('#tb').onclick = event => {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.dataset.e) {
            formulario(table, byId(table, button.dataset.e));
        }

        if (button.dataset.d) {
            confirmar(table, button.dataset.d);
        }
    };
}

// =====================================================
// 10. ELIMINAR REGISTROS
// =====================================================

function confirmar(table, id) {
    openModal(`
        <h2>¿Eliminar ${M[table].uno}?</h2>

        <p>Esta acción no se puede deshacer.</p>

        <div class="foot">
            <button class="btn ghost" id="cancel">Cancelar</button>
            <button class="btn" id="ok">Eliminar</button>
        </div>
    `);

    $('#cancel').onclick = closeModal;

    $('#ok').onclick = async () => {
        const { error } = await db
            .from(table)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(error);
            return toast(`No se pudo eliminar: ${error.message}`, true);
        }

        closeModal();

        toast('Solicitud de eliminación procesada.');

        await crud(table);
    };
}

// =====================================================
// 11. NAVEGACION
// =====================================================

async function ir(view) {
    document.querySelectorAll('#nav a').forEach(a => {
        a.classList.toggle('active', a.dataset.v === view);
    });

    $('#sidebar').classList.remove('open');

    if (view === 'dashboard') {
        await dashboard();
    } else {
        await crud(view);
    }
}

$('#nav').onclick = event => {
    const link = event.target.closest('a');

    if (!link) return;

    event.preventDefault();
    ir(link.dataset.v);
};

// =====================================================
// 12. MENU MOVIL
// =====================================================

$('#menuBtn').onclick = () => {
    $('#sidebar').classList.toggle('open');
};

// =====================================================
// 13. MODO OSCURO Y CLARO
// =====================================================

$('#themeBtn').onclick = () => {
    const html = document.documentElement;

    const nuevoTema = html.dataset.theme === 'dark'
        ? 'light'
        : 'dark';

    html.dataset.theme = nuevoTema;

    localStorage.setItem('gym-theme', nuevoTema);
};

document.documentElement.dataset.theme =
    localStorage.getItem('gym-theme') || 'dark';

// =====================================================
// 14. FECHA ACTUAL
// =====================================================

$('#today').textContent = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
});

// =====================================================
// 15. INICIAR SISTEMA
// =====================================================

icons();
ir('dashboard');
