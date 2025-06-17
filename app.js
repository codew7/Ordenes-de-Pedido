import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD1mkIC2sQwvpMm-x-R_ReL-3mvOFNZAcA",
  authDomain: "ordenes-de-pedido-e4248.firebaseapp.com",
  databaseURL: "https://ordenes-de-pedido-e4248-default-rtdb.firebaseio.com",
  projectId: "ordenes-de-pedido-e4248",
  storageBucket: "ordenes-de-pedido-e4248.firebasestorage.app",
  messagingSenderId: "244600094131",
  appId: "1:244600094131:web:f44687583d9395f15c9fc6"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const SHEETS_API_KEY = 'AIzaSyDwiZWDc66tv4usDIA-IreiJMLFuk0236Q';
const SPREADSHEET_ID = '1cD50d0-oSTogEe9tYo9ABUSP1ONCy3SAV92zsYYIG84';
const RANGE = 'Lista!A2:G';

let articulosData = [];
let items = [];
let editId = null;

async function loadArticulos() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${SHEETS_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.values) {
      articulosData = data.values.map(r => ({
        codigo: r[2],
        articulo: r[3],
        costo: parseFloat(r[6]) || 0,
        valor: parseFloat(r[4]) || 0
      }));
      const list = document.getElementById('articulosList');
      list.innerHTML = '';
      articulosData.forEach(a => {
        const option = document.createElement('option');
        option.value = a.articulo;
        list.appendChild(option);
      });
    }
  } catch (e) {
    console.error('Error loading articles', e);
  }
}

function addRow(item) {
  items.push(item);
  renderItems();
}

function renderItems() {
  const tbody = document.querySelector('#articulosTable tbody');
  tbody.innerHTML = '';
  items.forEach((it, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${it.codigo}</td><td>${it.articulo}</td><td>${it.cant}</td><td>${it.costo}</td><td>${it.valor}</td><td>${it.total}</td>`;
    const tdBtn = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Eliminar';
    btn.onclick = () => { items.splice(idx,1); renderItems(); };
    tdBtn.appendChild(btn);
    tr.appendChild(tdBtn);
    tbody.appendChild(tr);
  });
  recalcTotals();
}

function recalcTotals() {
  const subtotal = items.reduce((a,b)=>a+b.total,0);
  document.getElementById('subtotal').value = subtotal.toFixed(2);
  const totalCosto = items.reduce((a,b)=>a+(b.costo*b.cant),0);
  document.getElementById('totalCosto').value = totalCosto.toFixed(2);
  const medio = document.getElementById('medioPago').value;
  const recargo = medio === 'MercadoPago' ? subtotal*0.06 : 0;
  document.getElementById('recargo').value = recargo.toFixed(2);
  document.getElementById('totalGanancia').value = (subtotal - totalCosto).toFixed(2);
  const descuento = parseFloat(document.getElementById('descuento').value)||0;
  const costoEnvio = parseFloat(document.getElementById('costoEnvio').value)||0;
  document.getElementById('totalFinal').value = (subtotal + recargo + costoEnvio - descuento).toFixed(2);
}

function clearForm() {
  document.getElementById('orderForm').reset();
  items = [];
  renderItems();
  editId = null;
}

function loadOrder(id, data) {
  editId = id;
  document.getElementById('tipoCliente').value = data.cliente.tipoCliente;
  document.getElementById('nombre').value = data.cliente.nombre;
  document.getElementById('telefono').value = data.cliente.telefono;
  document.getElementById('direccion').value = data.cliente.direccion;
  items = data.items || [];
  renderItems();
  document.getElementById('medioPago').value = data.pagos.medioPago;
  document.getElementById('costoEnvio').value = data.pagos.costoEnvio;
  document.getElementById('descuento').value = data.pagos.descuento;
  document.getElementById('vendedor').value = data.pagos.vendedor;
  document.getElementById('nota').value = data.pagos.nota;
  recalcTotals();
}

function saveOrder(data) {
  if(editId){
    const historyRef = push(ref(db,'history/'+editId));
    set(historyRef, {previous:data, timestamp:Date.now()});
    update(ref(db,'orders/'+editId), data);
  } else {
    const newRef = push(ref(db,'orders'));
    set(newRef, data);
  }
}

function renderOrders(snapshot){
  const container = document.getElementById('ordersContainer');
  container.innerHTML='';
  snapshot.forEach(child=>{
    const data = child.val();
    const div = document.createElement('div');
    div.className='order-item';
    div.innerHTML = `<strong>${data.cliente.nombre}</strong> - ${child.key}`;
    const editBtn = document.createElement('button');
    editBtn.textContent='Editar';
    editBtn.onclick=()=>loadOrder(child.key, data);
    const delBtn=document.createElement('button');
    delBtn.textContent='Eliminar';
    delBtn.onclick=()=>{
      const historyRef = push(ref(db,'history_deleted/'+child.key));
      set(historyRef, {...data, deletedAt:Date.now()});
      remove(ref(db,'orders/'+child.key));
    };
    div.appendChild(editBtn);
    div.appendChild(delBtn);
    container.appendChild(div);
  });
}

document.getElementById('medioPago').addEventListener('change', recalcTotals);
document.getElementById('descuento').addEventListener('input', recalcTotals);
document.getElementById('costoEnvio').addEventListener('input', recalcTotals);

document.getElementById('addArticulo').addEventListener('click', ()=>{
  const artName = document.getElementById('articuloInput').value;
  const art = articulosData.find(a=>a.articulo===artName);
  const cant = parseFloat(document.getElementById('cantInput').value);
  if(!art || !cant) return;
  const costo = parseFloat(document.getElementById('costoInput').value)||art.costo;
  const valor = parseFloat(document.getElementById('valorInput').value)||art.valor;
  const item={
    codigo: art.codigo,
    articulo: artName,
    cant:cant,
    costo:costo,
    valor:valor,
    total:cant*valor
  };
  addRow(item);
  document.getElementById('articuloInput').value='';
  document.getElementById('codigoInput').value='';
  document.getElementById('cantInput').value='';
  document.getElementById('costoInput').value='';
  document.getElementById('valorInput').value='';
});

document.getElementById('articuloInput').addEventListener('change', (e)=>{
  const art = articulosData.find(a=>a.articulo===e.target.value);
  if(art){
    document.getElementById('codigoInput').value=art.codigo;
    document.getElementById('costoInput').value=art.costo;
    document.getElementById('valorInput').value=art.valor;
  }
});

document.getElementById('orderForm').addEventListener('submit', e=>{
  e.preventDefault();
  if(items.length===0) return alert('Agregue al menos un artículo');
  const data = {
    cliente:{
      tipoCliente: document.getElementById('tipoCliente').value,
      nombre: document.getElementById('nombre').value,
      telefono: document.getElementById('telefono').value,
      direccion: document.getElementById('direccion').value
    },
    items: items,
    pagos:{
      subtotal: parseFloat(document.getElementById('subtotal').value)||0,
      medioPago: document.getElementById('medioPago').value,
      costoEnvio: parseFloat(document.getElementById('costoEnvio').value)||0,
      totalCosto: parseFloat(document.getElementById('totalCosto').value)||0,
      totalGanancia: parseFloat(document.getElementById('totalGanancia').value)||0,
      recargo: parseFloat(document.getElementById('recargo').value)||0,
      descuento: parseFloat(document.getElementById('descuento').value)||0,
      totalFinal: parseFloat(document.getElementById('totalFinal').value)||0,
      vendedor: document.getElementById('vendedor').value,
      nota: document.getElementById('nota').value
    },
    timestamp: Date.now()
  };
  saveOrder(data);
  clearForm();
});

onValue(ref(db,'orders'), snapshot => renderOrders(snapshot));

loadArticulos();
