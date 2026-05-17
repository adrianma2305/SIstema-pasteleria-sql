const API_URL_PROV = "https://sistema-pasteleria-sql.onrender.com/api";
let proveedoresOriginal = [];

async function cargarProveedores() {
  const tabla = document.querySelector("#proveedores-table tbody");
  tabla.innerHTML = "<tr><td colspan='5'>Cargando...</td></tr>";
  try {
    const res = await fetch(`${API_URL_PROV}/proveedores`);
    const proveedores = await res.json();
    proveedoresOriginal = proveedores;
    renderizarProveedores(proveedores);
  } catch (error) {}
}

function renderizarProveedores(proveedores) {
  const tabla = document.querySelector("#proveedores-table tbody");
  tabla.innerHTML = "";
  const hoyStr = new Date().toISOString().split('T')[0];

  proveedores.forEach((p) => {
    let claseFila = "", titulo = "", textoFechaClass = "", fechaMostrar = "Sin fecha";
    if (p.entrega) {
        const fechaFormat = p.entrega.split('T')[0];
        fechaMostrar = new Date(fechaFormat + 'T12:00:00').toLocaleDateString();
        if (fechaFormat <= hoyStr) {
            claseFila = "table-warning"; textoFechaClass = "fw-bold text-danger";
            titulo = 'title="⚠ Entrega pendiente o atrasada"';
        }
    }
    tabla.insertAdjacentHTML("beforeend", `
      <tr class="${claseFila}" ${titulo}>
        <td>${p.id}</td>
        <td class="fw-bold">${p.nombre}</td>
        <td>${p.telefono || "-"}</td>
        <td class="${textoFechaClass}">${fechaMostrar}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="eliminarProveedor(${p.id})"><i class="bi bi-trash"></i></button>
          <button class="btn btn-sm btn-info text-white" onclick="abrirEditarProveedor(${p.id})"><i class="bi bi-pencil"></i></button>
        </td>
      </tr>
    `);
  });
}

async function agregarProveedor(event) {
  event.preventDefault();
  const nombre = document.getElementById("nombre-proveedor").value.trim();
  const telefono = document.getElementById("telefono-proveedor").value.trim();
  const entrega = document.getElementById("entrega-proveedor").value || null;

  if (!nombre) return mostrarNotificacion({ titulo: "Error", mensaje: "Nombre obligatorio", tipo: "warning" });
  if (proveedoresOriginal.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
    return mostrarNotificacion({ titulo: "Duplicado", mensaje: "Este proveedor ya existe", tipo: "error" });
  }

  try {
    await fetch(`${API_URL_PROV}/proveedores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, telefono, entrega })
    });
    mostrarNotificacion({ titulo: "Éxito", mensaje: "Proveedor agregado.", tipo: "success" });
    bootstrap.Modal.getInstance(document.getElementById("modalAgregarProveedor")).hide();
    document.getElementById("form-agregar-proveedor").reset();
    cargarProveedores();
  } catch (error) {}
}

async function eliminarProveedor(id) {
  if (!confirm("¿Eliminar este proveedor?")) return;
  try {
    await fetch(`${API_URL_PROV}/proveedores/${id}`, { method: 'DELETE' });
    mostrarNotificacion({ titulo: "Eliminado", mensaje: "Proveedor eliminado.", tipo: "success" });
    cargarProveedores();
  } catch (error) {}
}

async function abrirEditarProveedor(id) {
  try {
    const res = await fetch(`${API_URL_PROV}/proveedores/${id}`);
    const data = await res.json();
    document.getElementById("edit-id-proveedor").value = data.id;
    document.getElementById("edit-nombre-proveedor").value = data.nombre;
    document.getElementById("edit-telefono-proveedor").value = data.telefono || "";
    document.getElementById("edit-entrega-proveedor").value = data.entrega ? data.entrega.split('T')[0] : "";
    new bootstrap.Modal(document.getElementById("modalEditarProveedor")).show();
  } catch (error) {}
}

async function actualizarProveedor(event) {
  event.preventDefault();
  const id = parseInt(document.getElementById("edit-id-proveedor").value);
  const nombre = document.getElementById("edit-nombre-proveedor").value.trim();
  const telefono = document.getElementById("edit-telefono-proveedor").value.trim();
  const entrega = document.getElementById("edit-entrega-proveedor").value || null;

  if (!nombre) return mostrarNotificacion({titulo: "Error", mensaje: "Nombre vacío", tipo: "warning"});

  try {
    await fetch(`${API_URL_PROV}/proveedores/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, telefono, entrega })
    });
    mostrarNotificacion({ titulo: "Actualizado", mensaje: "Proveedor actualizado.", tipo: "success" });
    bootstrap.Modal.getInstance(document.getElementById("modalEditarProveedor")).hide();
    cargarProveedores();
  } catch (error) {}
}

document.addEventListener("DOMContentLoaded", () => {
  cargarProveedores(); 
  document.getElementById("form-agregar-proveedor")?.addEventListener("submit", agregarProveedor);
  document.getElementById("form-editar-proveedor")?.addEventListener("submit", actualizarProveedor);
  document.getElementById("busqueda-proveedores")?.addEventListener("input", function() {
    renderizarProveedores(proveedoresOriginal.filter(p => p.nombre.toLowerCase().includes(this.value.trim().toLowerCase())));
  });
});
