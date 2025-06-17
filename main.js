// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD1mkIC2sQwvpMm-x-R_ReL-3mvOFNZAcA",
    authDomain: "ordenes-de-pedido-e4248.firebaseapp.com",
    databaseURL: "https://ordenes-de-pedido-e4248-default-rtdb.firebaseio.com",
    projectId: "ordenes-de-pedido-e4248",
    storageBucket: "ordenes-de-pedido-e4248.firebasestorage.app",
    messagingSenderId: "244600094131",
    appId: "1:244600094131:web:f44687583d9395f15c9fc6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Google Sheets config
const GOOGLE_SHEETS_CONFIG = {
    API_KEY: 'AIzaSyDwiZWDc66tv4usDIA-IreiJMLFuk0236Q',
    SPREADSHEET_ID: '1cD50d0-oSTogEe9tYo9ABUSP1ONCy3SAV92zsYYIG84',
    RANGO: 'Lista!A2:G'
};

let articles = [];

async function loadArticles() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.RANGO}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    articles = data.values || [];
    const list = document.getElementById('articleList');
    list.innerHTML = '';
    articles.forEach(row => {
        const option = document.createElement('option');
        option.value = row[3]; // Articulo column D
        list.appendChild(option);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    document.getElementById('addItem').addEventListener('click', addItem);
    document.getElementById('orderForm').addEventListener('submit', saveOrder);
    loadOrders();
});

function findArticleByName(name) {
    return articles.find(r => r[3] === name);
}

function addItem() {
    const table = document.getElementById('items');
    const row = table.insertRow();

    const code = row.insertCell();
    const art = row.insertCell();
    const qty = row.insertCell();
    const cost = row.insertCell();
    const value = row.insertCell();
    const total = row.insertCell();

    code.innerHTML = `<input name="code" required>`;
    art.innerHTML = `<input list="articleList" name="article" required>`;
    qty.innerHTML = `<input type="number" name="qty" min="1" value="1" required>`;
    cost.innerHTML = `<input type="number" name="cost" step="0.01" required>`;
    value.innerHTML = `<input type="number" name="value" step="0.01" required>`;
    total.innerHTML = `<input type="number" name="total" step="0.01" readonly>`;

    row.querySelector('[name="article"]').addEventListener('input', function() {
        const info = findArticleByName(this.value);
        if (info) {
            row.querySelector('[name="code"]').value = info[2];
            row.querySelector('[name="cost"]').value = info[6];
            row.querySelector('[name="value"]').value = info[4];
        }
        updateRow(row);
    });
    row.querySelector('[name="qty"]').addEventListener('input', () => updateRow(row));
    row.querySelector('[name="value"]').addEventListener('input', () => updateRow(row));
}

function updateRow(row) {
    const qty = parseFloat(row.querySelector('[name="qty"]').value) || 0;
    const val = parseFloat(row.querySelector('[name="value"]').value) || 0;
    row.querySelector('[name="total"]').value = (qty * val).toFixed(2);
    updateTotals();
}

function updateTotals() {
    let subtotal = 0;
    let totalCost = 0;
    document.querySelectorAll('#items tr').forEach(row => {
        const qty = parseFloat(row.querySelector('[name="qty"]').value) || 0;
        const val = parseFloat(row.querySelector('[name="value"]').value) || 0;
        const cost = parseFloat(row.querySelector('[name="cost"]').value) || 0;
        subtotal += qty * val;
        totalCost += qty * cost;
    });
    document.getElementById('subtotal').value = subtotal.toFixed(2);
    document.getElementById('totalCosto').value = totalCost.toFixed(2);
    document.getElementById('totalGanancia').value = (subtotal - totalCost).toFixed(2);
    updateFinal();
}

function updateFinal() {
    const subtotal = parseFloat(document.getElementById('subtotal').value) || 0;
    let recargo = 0;
    if (document.getElementById('medioPago').value === 'MercadoPago') {
        recargo = subtotal * 0.06;
    }
    document.getElementById('recargo').value = recargo.toFixed(2);
    const envio = parseFloat(document.getElementById('costoEnvio').value) || 0;
    const descuento = parseFloat(document.getElementById('descuento').value) || 0;
    const totalFinal = subtotal + recargo + envio - descuento;
    document.getElementById('totalFinal').value = totalFinal.toFixed(2);
}

function gatherItems() {
    const items = [];
    document.querySelectorAll('#items tr').forEach(row => {
        items.push({
            codigo: row.querySelector('[name="code"]').value,
            articulo: row.querySelector('[name="article"]').value,
            cantidad: parseFloat(row.querySelector('[name="qty"]').value),
            costo: parseFloat(row.querySelector('[name="cost"]').value),
            valor: parseFloat(row.querySelector('[name="value"]').value),
            total: parseFloat(row.querySelector('[name="total"]').value)
        });
    });
    return items;
}

function saveOrder(e) {
    e.preventDefault();
    const order = {
        cliente: {
            tipo: document.getElementById('tipoCliente').value,
            nombre: document.getElementById('nombre').value,
            telefono: document.getElementById('telefono').value,
            direccion: document.getElementById('direccion').value
        },
        items: gatherItems(),
        pagos: {
            subtotal: parseFloat(document.getElementById('subtotal').value),
            medioPago: document.getElementById('medioPago').value,
            costoEnvio: parseFloat(document.getElementById('costoEnvio').value),
            totalCosto: parseFloat(document.getElementById('totalCosto').value),
            totalGanancia: parseFloat(document.getElementById('totalGanancia').value),
            recargo: parseFloat(document.getElementById('recargo').value),
            descuento: parseFloat(document.getElementById('descuento').value),
            totalFinal: parseFloat(document.getElementById('totalFinal').value),
            vendedor: document.getElementById('vendedor').value,
            nota: document.getElementById('nota').value
        },
        timestamp: Date.now()
    };

    const newRef = db.ref('ordenes').push();
    newRef.set(order).then(() => {
        alert('Pedido guardado');
        document.getElementById('orderForm').reset();
        document.getElementById('items').innerHTML = '';
        loadOrders();
    });
}

function loadOrders() {
    db.ref('ordenes').once('value').then(snap => {
        const tbody = document.getElementById('orders');
        tbody.innerHTML = '';
        snap.forEach(child => {
            const order = child.val();
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${order.cliente.nombre}</td><td>${order.pagos.totalFinal.toFixed(2)}</td><td class="actions"></td>`;
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar';
            editBtn.onclick = () => editOrder(child.key, order);
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Eliminar';
            delBtn.onclick = () => deleteOrder(child.key);
            tr.querySelector('.actions').append(editBtn, delBtn);
            tbody.appendChild(tr);
        });
    });
}

function editOrder(key, order) {
    if (!confirm('¿Editar pedido? Esto reemplazará el formulario actual.')) return;
    document.getElementById('tipoCliente').value = order.cliente.tipo;
    document.getElementById('nombre').value = order.cliente.nombre;
    document.getElementById('telefono').value = order.cliente.telefono;
    document.getElementById('direccion').value = order.cliente.direccion;

    document.getElementById('items').innerHTML = '';
    order.items.forEach(i => {
        addItem();
        const row = document.querySelector('#items tr:last-child');
        row.querySelector('[name="code"]').value = i.codigo;
        row.querySelector('[name="article"]').value = i.articulo;
        row.querySelector('[name="qty"]').value = i.cantidad;
        row.querySelector('[name="cost"]').value = i.costo;
        row.querySelector('[name="value"]').value = i.valor;
        updateRow(row);
    });

    document.getElementById('subtotal').value = order.pagos.subtotal;
    document.getElementById('medioPago').value = order.pagos.medioPago;
    document.getElementById('costoEnvio').value = order.pagos.costoEnvio;
    document.getElementById('totalCosto').value = order.pagos.totalCosto;
    document.getElementById('totalGanancia').value = order.pagos.totalGanancia;
    document.getElementById('recargo').value = order.pagos.recargo;
    document.getElementById('descuento').value = order.pagos.descuento;
    document.getElementById('totalFinal').value = order.pagos.totalFinal;
    document.getElementById('vendedor').value = order.pagos.vendedor;
    document.getElementById('nota').value = order.pagos.nota;

    document.getElementById('orderForm').onsubmit = function(ev) {
        ev.preventDefault();
        const updated = gatherFormData();
        db.ref('ordenes/' + key).set(updated).then(() => {
            alert('Pedido actualizado');
            document.getElementById('orderForm').reset();
            document.getElementById('items').innerHTML = '';
            document.getElementById('orderForm').onsubmit = saveOrder;
            loadOrders();
        });
    };
}

function gatherFormData() {
    return {
        cliente: {
            tipo: document.getElementById('tipoCliente').value,
            nombre: document.getElementById('nombre').value,
            telefono: document.getElementById('telefono').value,
            direccion: document.getElementById('direccion').value
        },
        items: gatherItems(),
        pagos: {
            subtotal: parseFloat(document.getElementById('subtotal').value),
            medioPago: document.getElementById('medioPago').value,
            costoEnvio: parseFloat(document.getElementById('costoEnvio').value),
            totalCosto: parseFloat(document.getElementById('totalCosto').value),
            totalGanancia: parseFloat(document.getElementById('totalGanancia').value),
            recargo: parseFloat(document.getElementById('recargo').value),
            descuento: parseFloat(document.getElementById('descuento').value),
            totalFinal: parseFloat(document.getElementById('totalFinal').value),
            vendedor: document.getElementById('vendedor').value,
            nota: document.getElementById('nota').value
        },
        timestamp: Date.now()
    };
}

function deleteOrder(key) {
    if (confirm('¿Eliminar pedido?')) {
        db.ref('ordenes/' + key).remove().then(loadOrders);
    }
}
