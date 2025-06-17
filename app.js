/* =========================  CONFIGURACIÓN  ========================= */
export const firebaseConfig = {
  apiKey: "AIzaSyD1mkIC2sQwvpMm-x-R_ReL-3mvOFNZAcA",
  authDomain: "ordenes-de-pedido-e4248.firebaseapp.com",
  databaseURL: "https://ordenes-de-pedido-e4248-default-rtdb.firebaseio.com",
  projectId: "ordenes-de-pedido-e4248",
  storageBucket: "ordenes-de-pedido-e4248".concat(".app"),
  messagingSenderId: "244600094131",
  appId: "1:244600094131:web:f44687583d9395f15c9fc6"
};
const GOOGLE_SHEETS_CONFIG = {
  API_KEY: 'AIzaSyDwiZWDc66tv4usDIA-IreiJMLFuk0236Q',
  SPREADSHEET_ID: '1cD50d0-oSTogEe9tYo9ABUSP1ONCy3SAV92zsYYIG84',
  RANGO: 'Lista!A2:G'
};

/* =========================  FIREBASE INIT  ========================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, update, remove, query, orderByKey, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-database.js";
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const pedidosRef = ref(db, 'Ordenes de Pedido');

/* =========================  ELEMENTOS DOM  ========================= */
const tbodyPedido = document.querySelector('#tablaPedido tbody');
const subtotalEl = document.getElementById('subtotal');
const totalCostoEl = document.getElementById('totalCosto');
const totalGananciaEl = document.getElementById('totalGanancia');
const recargoEl = document.getElementById('recargo');
const totalFinalEl = document.getElementById('totalFinal');
const medioPagoSel = document.getElementById('medioPago');
const costoEnvioEl = document.getElementById('costoEnvio');
const descuentoEl = document.getElementById('descuento');

/* =========================  UTILIDADES  ========================= */
function formatoNumero(n) { return Number(n || 0).toFixed(2); }
function calcularFila(row) {
  const cant = parseFloat(row.querySelector('.cant').value) || 0;
  const valor = parseFloat(row.querySelector('.valorU').value) || 0;
  const costo = parseFloat(row.querySelector('.costoU').value) || 0;
  row.querySelector('.total').value = formatoNumero(cant * valor);
  row.dataset.costoTotal = cant * costo;
}
function recalcularTotales() {
  let subtotal = 0, totalCosto = 0;
  tbodyPedido.querySelectorAll('tr').forEach(tr => {
    subtotal += parseFloat(tr.querySelector('.total').value) || 0;
    totalCosto += parseFloat(tr.dataset.costoTotal) || 0;
  });
  subtotalEl.value = formatoNumero(subtotal);
  totalCostoEl.value = formatoNumero(totalCosto);
  totalGananciaEl.value = formatoNumero(subtotal - totalCosto);
  const recargo = medioPagoSel.value === 'MercadoPago' ? subtotal * 0.06 : 0;
  recargoEl.value = formatoNumero(recargo);
  const totalFinal = subtotal + recargo + (parseFloat(costoEnvioEl.value) || 0) - (parseFloat(descuentoEl.value) || 0);
  totalFinalEl.value = formatoNumero(totalFinal);
}

/* =========================  CARGAR ITEMS DESDE SHEETS  ========================= */
let listaArticulos = [];
async function cargarArticulos() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.RANGO}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  listaArticulos = data.values.map(row => ({ codigo: row[2], nombre: row[3], valorU: parseFloat(row[4]), costoU: parseFloat(row[6]) }));
}

/* =========================  FILA NUEVA  ========================= */
function nuevaFila(item = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="codigo" list="listaCodigos" value="${item.codigo||''}"></td>
    <td><input class="articulo" list="listaArticulos" value="${item.nombre||''}"></td>
    <td><input class="cant" type="number" min="1" value="${item.cant||1}"></td>
    <td><input class="costoU" type="number" step="0.01" value="${item.costoU||''}" readonly></td>
    <td><input class="valorU" type="number" step="0.01" value="${item.valorU||''}" readonly></td>
    <td><input class="total" type="number" step="0.01" readonly></td>
    <td><button class="btn btn-danger">✖</button></td>
  `;

  // Eventos de cambios
  tr.querySelector('.cant').addEventListener('input', () => { calcularFila(tr); recalcularTotales(); });
  tr.querySelector('.codigo').addEventListener('change', e => completarPorCodigo(tr, e.target.value));
  tr.querySelector('.articulo').addEventListener('change', e => completarPorNombre(tr, e.target.value));
  tr.querySelector('.btn-danger').addEventListener('click', () => { tr.remove(); recalcularTotales(); });
  tbodyPedido.appendChild(tr);
  calcularFila(tr); recalcularTotales();
}

function completarPorCodigo(tr, codigo) {
  const art = listaArticulos.find(a => a.codigo === codigo);
  if (!art) return;
  tr.querySelector('.articulo').value = art.nombre;
  tr.querySelector('.valorU').value = art.valorU;
  tr.querySelector('.costoU').value = art.costoU;
  calcularFila(tr); recalcularTotales();
}
function completarPorNombre(tr, nombre) {
  const art = listaArticulos.find(a => a.nombre === nombre);
  if (!art) return;
  tr.querySelector('.codigo').value = art.codigo;
  tr.querySelector('.valorU').value = art.valorU;
  tr.querySelector('.costoU').value = art.costoU;
  calcularFila(tr); recalcularTotales();
}

/* =========================  DATALISTS DINÁMICOS  ========================= */
function crearDataLists() {
  const d1 = document.createElement('datalist');
  d1.id = 'listaCodigos';
  const d2 = document.createElement('datalist');
  d2.id = 'listaArticulos';
  listaArticulos.forEach(a => {
    const o1 = document.createElement('option'); o1.value = a.codigo; d1.appendChild(o1);
    const o2 = document.createElement('option'); o2.value = a.nombre; d2.appendChild(o2);
  });
  document.body.appendChild(d1);
  document.body.appendChild(d2);
}

/* =========================  GUARDAR PEDIDO EN FIREBASE  ========================= */
async function getNuevoId() {
  const idQuery = query(pedidosRef, orderByKey(), limitToLast(1));
  return new Promise(res => {
    onValue(idQuery, snap => {
      const lastId = snap.exists() ? Object.keys(snap.val())[0] : '7999';
      const next = (parseInt(lastId, 10) + 1).toString();
      res(next);
    }, { onlyOnce: true });
  });
}
async function guardarPedido() {
  if (!document.getElementById('tipoCliente').value || !tbodyPedido.children.length) {
    alert('Completa al menos el cliente y un ítem.');
    return;
  }
  const id = await getNuevoId();
  const pedido = {
    cliente: {
      tipo: document.getElementById('tipoCliente').value,
      nombre: document.getElementById('nombreCliente').value,
      telefono: document.getElementById('telefonoCliente').value,
      direccion: document.getElementById('direccionCliente').value
    },
    items: [...tbodyPedido.children].map(tr => ({
      codigo: tr.querySelector('.codigo').value,
      articulo: tr.querySelector('.articulo').value,
      cant: parseFloat(tr.querySelector('.cant').value),
      costoU: parseFloat(tr.querySelector('.costoU').value),
      valorU: parseFloat(tr.querySelector('.valorU').value),
      total: parseFloat(tr.querySelector('.total').value)
    })),
    pagos: {
      subtotal: parseFloat(subtotalEl.value),
      medio: medioPagoSel.value,
      recargo: parseFloat(recargoEl.value),
      costoEnvio: parseFloat(costoEnvioEl.value),
      descuento: parseFloat(descuentoEl.value),
      totalCosto: parseFloat(totalCostoEl.value),
      ganancia: parseFloat(totalGananciaEl.value),
      totalFinal: parseFloat(totalFinalEl.value)
    },
    vendedor: document.getElementById('vendedor').value,
    nota: document.getElementById('nota').value,
    fecha: new Date().toISOString()
  };
  await set(ref(db, `Ordenes de Pedido/${id}`), pedido);
  alert(`Pedido #${id} guardado✅`);
  limpiarFormulario();
}

/* =========================  HISTORIAL  ========================= */
function cargarHistorial() {
  onValue(pedidosRef, snap => {
    const tbody = document.querySelector('#tablaHistorial tbody');
    tbody.innerHTML = '';
    snap.forEach(child => {
      const id = child.key;
      const ped = child.val();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${id}</td>
        <td>${ped.cliente.nombre}</td>
        <td>${new Date(ped.fecha).toLocaleString()}</td>
        <td>$${ped.pagos.totalFinal.toFixed(2)}</td>
        <td>
          <button class="btn" data-id="${id}" data-action="edit">✏️</button>
          <button class="btn btn-danger" data-id="${id}" data-action="delete">🗑️</button>
        </td>`;
      tbody.appendChild(tr);
    });
  });
}

document.querySelector('#tablaHistorial').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === 'delete') {
    if (confirm('¿Eliminar pedido ' + id + '?')) remove(ref(db, `Ordenes de Pedido/${id}`));
  } else if (btn.dataset.action === 'edit') {
    onValue(ref(db, `Ordenes de Pedido/${id}`), snap => {
      const ped = snap.val();
      cargarPedidoEnFormulario(id, ped);
    }, { onlyOnce: true });
  }
});

function cargarPedidoEnFormulario(id, ped) {
  document.getElementById('tipoCliente').value = ped.cliente.tipo;
  document.getElementById('nombreCliente').value = ped.cliente.nombre;
  document.getElementById('telefonoCliente').value = ped.cliente.telefono;
  document.getElementById('direccionCliente').value = ped.cliente.direccion;
  tbodyPedido.innerHTML = '';
  ped.items.forEach(it => nuevaFila(it));
  medioPagoSel.value = ped.pagos.medio;
  costoEnvioEl.value = ped.pagos.costoEnvio;
  descuentoEl.value = ped.pagos.descuento;
  document.getElementById('vendedor').value = ped.vendedor;
  document.getElementById('nota').value = ped.nota;
  recalcularTotales();
  // Guardar actualizaciones sobre el mismo ID
  document.getElementById('btnGuardar').onclick = async () => {
    const pedidoAct = { ...ped, /* mismos campos del guardarPedido pero sin crear nuevo id*/ };
    // reconstruir con valores actuales:
    pedidoAct.cliente = {
      tipo: document.getElementById('tipoCliente').value,
      nombre: document.getElementById('nombreCliente').value,
      telefono: document.getElementById('telefonoCliente').value,
      direccion: document.getElementById('direccionCliente').value
    };
    pedidoAct.items = [...tbodyPedido.children].map(tr => ({
      codigo: tr.querySelector('.codigo').value,
      articulo: tr.querySelector('.articulo').value,
      cant: parseFloat(tr.querySelector('.cant').value),
      costoU: parseFloat(tr.querySelector('.costoU').value),
      valorU: parseFloat(tr.querySelector('.valorU').value),
      total: parseFloat(tr.querySelector('.total').value)
    }));
    pedidoAct.pagos = {
      subtotal: parseFloat(subtotalEl.value),
      medio: medioPagoSel.value,
      recargo: parseFloat(recargoEl.value),
      costoEnvio: parseFloat(costoEnvioEl.value),
      descuento: parseFloat(descuentoEl.value),
      totalCosto: parseFloat(totalCostoEl.value),
      ganancia: parseFloat(totalGananciaEl.value),
      totalFinal: parseFloat(totalFinalEl.value)
    };
    pedidoAct.vendedor = document.getElementById('vendedor').value;
    pedidoAct.nota = document.getElementById('nota').value;
    await update(ref(db, `Ordenes de Pedido/${id}`), pedidoAct);
    alert('Pedido actualizado✅');
    limpiarFormulario();
    document.getElementById('btnGuardar').onclick = guardarPedido; // restaurar
  };
}

/* =========================  LIMPIAR FORMULARIO  ========================= */
function limpiarFormulario() {
  document.querySelector('form')?.reset();
  document.getElementById('tipoCliente').value = '';
  tbodyPedido.innerHTML = '';
  nuevaFila();
  recalcularTotales();
}

/* =========================  EVENTOS PRINCIPALES  ========================= */
window.addEventListener('DOMContentLoaded', async () => {
  await cargarArticulos();
  crearDataLists();
  nuevaFila();
  cargarHistorial();
});

document.getElementById('btnAgregarItem').addEventListener('click', () => nuevaFila());
medioPagoSel.addEventListener('change', recalcularTotales);
costoEnvioEl.addEventListener('input', recalcularTotales);
descuentoEl.addEventListener('input', recalcularTotales);
document.getElementById('btnGuardar').addEventListener('click', guardarPedido);
document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);