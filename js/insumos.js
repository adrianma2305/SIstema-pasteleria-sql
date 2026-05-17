const API_URL_INS = "https://sistema-pasteleria-sql.onrender.com/api";
let insumosOriginal = [];
let proveedoresMap = {}; 

async function cargarInsumos() {
  const tabla = document.querySelector("#insumos-table tbody");
  tabla.innerHTML = "<tr><td colspan='6'>Cargando...</td></tr>";
  try {
    const res = await fetch(`${API_URL_INS}/insumos`);
    const insumos = await res.json();
    insumosOriginal = insumos;
    renderizarInsumos(insumos);
    llenarSelectCalculadora(insumos);
  } catch (error) { tabla.innerHTML = "<tr><td colspan='6'>Error al cargar.</td></tr>"; }
}

function renderizarInsumos(insumos) {
  const tabla = document.querySelector("#insumos-table tbody");
  tabla.innerHTML = "";
  insumos.forEach((i) => {
    tabla.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${i.id}</td>
        <td class="fw-bold">${i.nombre}</td>
        <td>${i.unidad || ""}</td>
        <td class="text-primary fw-bold">C$ ${i.precio !== null ? i.precio : ""}</td>
        <td>${i.proveedores?.nombre || "-"}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="eliminarInsumo(${i.id})"><i class="bi bi-trash"></i></button>
          <button class="btn btn-sm btn-info text-white" onclick="abrirEditarInsumo(${i.id})"><i class="bi bi-pencil"></i></button>
        </td>
      </tr>
    `);
  });
}

async function cargarProveedoresSelect(selectId, seleccionado = null) {
  try {
    const res = await fetch(`${API_URL_INS}/proveedores`);
    const proveedores = await res.json();
    const select = document.getElementById(selectId);
    select.innerHTML = "<option value=''>Sin proveedor</option>";
    
    proveedores.forEach(p => {
      proveedoresMap[p.id] = p.nombre;
      const option = document.createElement("option");
      option.value = p.id; option.innerText = p.nombre;
      if (seleccionado && parseInt(seleccionado) === p.id) option.selected = true;
      select.appendChild(option);
    });
  } catch (error) {}
}

async function agregarInsumo(event) {
  event.preventDefault();
  const nombre = document.getElementById("nombre-insumo").value.trim();
  const unidad = document.getElementById("unidad-insumo").value.trim();
  const precio = parseInt(document.getElementById("precio-insumo").value, 10);
  const proveedor_id = document.getElementById("proveedor-insumo").value || null;

  if (!nombre || !unidad || isNaN(precio) || precio <= 0) {
    return mostrarNotificacion({ titulo: "Inválido", mensaje: "Nombre, Unidad y Precio positivo son obligatorios.", tipo: "warning" });
  }
  if (insumosOriginal.some(i => i.nombre.toLowerCase() === nombre.toLowerCase())) {
    return mostrarNotificacion({ titulo: "Duplicado", mensaje: "Ya existe ese insumo.", tipo: "error" });
  }

  try {
    const res = await fetch(`${API_URL_INS}/insumos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, unidad, precio, proveedor_id: proveedor_id ? parseInt(proveedor_id) : null })
    });
    if (!res.ok) throw new Error("Error al guardar");
    mostrarNotificacion({ titulo: "Éxito", mensaje: "Insumo agregado.", tipo: "success" });
    bootstrap.Modal.getInstance(document.getElementById("modalAgregarInsumo")).hide();
    document.getElementById("form-agregar-insumo").reset();
    cargarInsumos();
  } catch (error) {}
}

async function eliminarInsumo(id) {
  if (!confirm("¿Estás seguro que quieres eliminar este insumo?")) return;
  try {
    await fetch(`${API_URL_INS}/insumos/${id}`, { method: 'DELETE' });
    mostrarNotificacion({ titulo: "Eliminado", mensaje: "Insumo eliminado.", tipo: "success" });
    cargarInsumos();
  } catch (error) {}
}

async function abrirEditarInsumo(id) {
  try {
    const res = await fetch(`${API_URL_INS}/insumos/${id}`);
    const data = await res.json();
    await cargarProveedoresSelect("edit-proveedor-insumo", data.proveedor_id);
    
    document.getElementById("edit-id-insumo").value = data.id;
    document.getElementById("edit-nombre-insumo").value = data.nombre;
    document.getElementById("edit-unidad-insumo").value = data.unidad || "";
    document.getElementById("edit-precio-insumo").value = data.precio !== null ? data.precio : "";
    new bootstrap.Modal(document.getElementById("modalEditarInsumo")).show();
  } catch (error) {}
}

async function actualizarInsumo(event) {
  event.preventDefault();
  const id = document.getElementById("edit-id-insumo").value;
  const nombre = document.getElementById("edit-nombre-insumo").value.trim();
  const unidad = document.getElementById("edit-unidad-insumo").value.trim();
  const precio = parseInt(document.getElementById("edit-precio-insumo").value, 10);
  const proveedor_id = document.getElementById("edit-proveedor-insumo").value || null;

  if (!nombre || !unidad || isNaN(precio) || precio <= 0) {
    return mostrarNotificacion({ titulo: "Error", mensaje: "Datos inválidos", tipo: "warning" });
  }

  try {
    await fetch(`${API_URL_INS}/insumos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, unidad, precio, proveedor_id: proveedor_id ? parseInt(proveedor_id) : null })
    });
    mostrarNotificacion({ titulo: "Actualizado", mensaje: "Insumo actualizado.", tipo: "success" });
    bootstrap.Modal.getInstance(document.getElementById("modalEditarInsumo")).hide();
    cargarInsumos();
  } catch (error) {}
}

// MAGIA DE LA CALCULADORA
window.abrirCalculadora = function() {
  new bootstrap.Modal(document.getElementById("modalCalculadora")).show();
}

function llenarSelectCalculadora(insumos) {
  const select = document.getElementById("calc-insumo");
  select.innerHTML = '<option value="">Selecciona qué insumo usarás...</option>';
  insumos.forEach(i => {
    select.innerHTML += `<option value="${i.id}" data-precio="${i.precio}" data-unidad="${i.unidad}">${i.nombre} (Costo: C$ ${i.precio})</option>`;
  });
}

function calcularReceta() {
  const select = document.getElementById("calc-insumo");
  const rendimiento = parseInt(document.getElementById("calc-rendimiento").value);
  const meta = parseInt(document.getElementById("calc-meta").value);
  const divRes = document.getElementById("calc-resultado");

  if (!select.value || isNaN(rendimiento) || isNaN(meta) || rendimiento <= 0 || meta <= 0) {
    divRes.innerHTML = `<h6 class="text-muted">Llena los datos correctamente para ver el cálculo</h6>`;
    return;
  }

  const optionSel = select.options[select.selectedIndex];
  const precioSaco = parseFloat(optionSel.dataset.precio);
  const unidad = optionSel.dataset.unidad;
  
  // Lógica: Si 1 insumo rinde 50. Para hacer 20 ocupo 20/50 = 0.4 insumos.
  const insumosNecesarios = meta / rendimiento;
  const costoTotalProduccion = insumosNecesarios * precioSaco;
  const costoUnidad = costoTotalProduccion / meta;

  divRes.innerHTML = `
    <h5 class="fw-bold text-dark">Para fabricar ${meta} unidades necesitas:</h5>
    <h3 class="text-warning fw-bold">${insumosNecesarios.toFixed(2)} x [${unidad}]</h3>
    <hr>
    <div class="row text-start mt-2">
      <div class="col-6"><strong>Inversión en Insumo:</strong></div>
      <div class="col-6 text-end text-danger fw-bold">C$ ${Math.ceil(costoTotalProduccion)}</div>
      <div class="col-6"><strong>Costo por 1 unidad:</strong></div>
      <div class="col-6 text-end text-muted">C$ ${costoUnidad.toFixed(2)}</div>
    </div>
  `;
}

document.getElementById("busqueda-insumos").addEventListener("input", function() {
  const valor = this.value.trim().toLowerCase();
  renderizarInsumos(insumosOriginal.filter((i) => i.nombre.toLowerCase().includes(valor)));
});

document.getElementById("form-agregar-insumo").addEventListener("submit", agregarInsumo);
document.getElementById("form-editar-insumo").addEventListener("submit", actualizarInsumo);
document.getElementById("modalAgregarInsumo").addEventListener("show.bs.modal", () => cargarProveedoresSelect("proveedor-insumo"));
document.addEventListener("DOMContentLoaded", cargarInsumos);

// Listeners Calculadora
document.getElementById("calc-insumo").addEventListener("change", calcularReceta);
document.getElementById("calc-rendimiento").addEventListener("input", calcularReceta);
document.getElementById("calc-meta").addEventListener("input", calcularReceta);