const API_URL = "https://sistema-pasteleria-sql.onrender.com/api";
let productosOriginal = [];
let insumosPrecios = {}; 

async function cargarProductos() {
  const tabla = document.querySelector("#productos-table tbody");
  tabla.innerHTML = "<tr><td colspan='5'>Cargando...</td></tr>";
  try {
    const respuesta = await fetch(`${API_URL}/productos`);
    if (!respuesta.ok) throw new Error("Error al cargar productos");
    const productos = await respuesta.json();
    productosOriginal = productos;
    renderizarProductos(productos);
    cargarSelectsInsumosProducto();
    cargarSelectsCategorias();
  } catch (error) {
    tabla.innerHTML = "<tr><td colspan='5'>Error al cargar desde SQL Server.</td></tr>";
  }
}

function renderizarProductos(productos) {
  const tabla = document.querySelector("#productos-table tbody");
  tabla.innerHTML = "";
  const isAdmin = (typeof esAdmin === 'function') ? esAdmin() : false;

  productos.forEach((p) => {
    const nombreInsumo = p.insumo ? `<span class="badge bg-secondary">${p.insumo.nombre}</span>` : "-";
    const nombreCategoria = p.categoria ? `<span class="badge bg-primary">${p.categoria.nombre}</span>` : `<span class="badge bg-light text-dark">Sin categoría</span>`;

    const botonesAccion = isAdmin ? `
      <button class="btn btn-sm btn-danger" onclick="eliminarProducto(${p.id})" title="Eliminar"><i class="bi bi-trash"></i></button>
      <button class="btn btn-sm btn-info" onclick="abrirEditarProducto(${p.id})" title="Editar"><i class="bi bi-pencil"></i></button>
    ` : `<span class="badge bg-secondary">Sin permisos</span>`;

    const costo = p.costo || 0;
    const ganancia = p.precio - costo;
    let infoFinanciera = `<div class="fw-bold">C$ ${p.precio}</div>`;
    
    if (costo > 0) {
      infoFinanciera += `<small class="text-success fw-bold">Ganancia: C$ ${ganancia}</small>`;
    } else {
      infoFinanciera += `<small class="text-muted">Utilidad 100%</small>`;
    }

    const fila = `
      <tr>
        <td>${p.id}</td>
        <td>
          <div class="fw-bold">${p.nombre}</div>
          <small class="text-muted">Base: ${nombreInsumo}</small>
        </td>
        <td>${nombreCategoria}</td>
        <td>${infoFinanciera}</td>
        <td>${botonesAccion}</td>
      </tr>
    `;
    tabla.insertAdjacentHTML("beforeend", fila);
  });
}

async function cargarSelectsCategorias() {
  try {
    const respuesta = await fetch(`${API_URL}/categorias`);
    const categorias = await respuesta.json();
    const selectFiltro = document.getElementById("filtro-categoria");
    const selectAgregar = document.getElementById("categoria-principal");
    const selectEditar = document.getElementById("edit-categoria-principal");

    let htmlFiltro = '<option value="">Todas las categorías</option>';
    let htmlModal = '<option value="">Seleccione una categoría...</option>';
    
    categorias.forEach(c => {
      htmlFiltro += `<option value="${c.id}">${c.nombre}</option>`;
      htmlModal += `<option value="${c.id}">${c.nombre}</option>`;
    });

    if (selectFiltro) selectFiltro.innerHTML = htmlFiltro;
    if (selectAgregar) selectAgregar.innerHTML = htmlModal;
    if (selectEditar) selectEditar.innerHTML = htmlModal;
  } catch (error) {}
}

async function cargarSelectsInsumosProducto() {
  try {
    const respuesta = await fetch(`${API_URL}/insumos`);
    const insumos = await respuesta.json();
    insumosPrecios = {}; 

    const selectAgregar = document.getElementById("insumo-principal");
    const selectEditar = document.getElementById("edit-insumo-principal");
    let html = '<option value="">Ninguno / No aplica</option>';

    insumos.forEach(i => {
      html += `<option value="${i.id}">${i.nombre}</option>`;
      insumosPrecios[i.id] = i.precio || 0;
    });

    if (selectAgregar) selectAgregar.innerHTML = html;
    if (selectEditar) selectEditar.innerHTML = html;
  } catch (error) {}
}

async function agregarProducto(event) {
  event.preventDefault();
  const nombre = document.getElementById("nombre").value.trim();
  const precio = parseInt(document.getElementById("precio").value, 10);
  const insumo_id = document.getElementById("insumo-principal").value ? parseInt(document.getElementById("insumo-principal").value) : null;
  const categoria_id = document.getElementById("categoria-principal").value ? parseInt(document.getElementById("categoria-principal").value) : null;

  if (!nombre || isNaN(precio) || !categoria_id) {
    return alert("Nombre, Precio y Categoría son campos obligatorios.");
  }
  if (precio <= 0) return alert("El precio debe ser un número entero positivo.");
  if (productosOriginal.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
    return alert("Ya existe un producto registrado con ese mismo nombre.");
  }
  
  try {
    const respuesta = await fetch(`${API_URL}/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, precio, insumo_id, categoria_id }) 
    });

    if (!respuesta.ok) throw new Error("Error al guardar");

    alert("🎉 Producto añadido exitosamente.");
    document.getElementById("form-agregar").reset();
    document.getElementById("info-ganancia").innerHTML = "Selecciona un insumo y pon un precio...";
    bootstrap.Modal.getInstance(document.getElementById("modalAgregar")).hide();
    cargarProductos();
  } catch (error) { alert("Error al guardar en el servidor"); }
}

async function abrirEditarProducto(id) {
  try {
    const respuesta = await fetch(`${API_URL}/productos/${id}`);
    const data = await respuesta.json();

    document.getElementById("edit-id").value = data.id;
    document.getElementById("edit-nombre").value = data.nombre;
    document.getElementById("edit-precio").value = data.precio;
    document.getElementById("edit-insumo-principal").value = data.insumo_id || "";
    document.getElementById("edit-categoria-principal").value = data.categoria_id || ""; 
    
    new bootstrap.Modal(document.getElementById("modalEditar")).show();
  } catch (error) {}
}

async function actualizarProducto(event) {
  event.preventDefault();
  const id = document.getElementById("edit-id").value;
  const nombre = document.getElementById("edit-nombre").value.trim();
  const precio = parseInt(document.getElementById("edit-precio").value, 10);
  const insumo_id = document.getElementById("edit-insumo-principal").value ? parseInt(document.getElementById("edit-insumo-principal").value) : null;
  const categoria_id = document.getElementById("edit-categoria-principal").value ? parseInt(document.getElementById("edit-categoria-principal").value) : null;

  if (!nombre || isNaN(precio) || precio <= 0 || !categoria_id) return alert("Datos incorrectos o incompletos.");

  try {
    const respuesta = await fetch(`${API_URL}/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, precio, insumo_id, categoria_id }) 
    });
    if (!respuesta.ok) throw new Error("Error");
    alert("Producto actualizado.");
    bootstrap.Modal.getInstance(document.getElementById("modalEditar")).hide();
    cargarProductos();
  } catch (error) { alert("Error al actualizar"); }
}

async function eliminarProducto(id) {
  if (!confirm("¿Deseas eliminar este producto?")) return;
  try {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    cargarProductos();
  } catch (error) {}
}

function filtrarProductos() {
  const valor = document.getElementById("busqueda-productos").value.trim().toLowerCase();
  const precioBuscado = document.getElementById("busqueda-precio").value;
  const categoriaBuscada = document.getElementById("filtro-categoria").value;
  
  let filtrados = productosOriginal.filter((p) => p.nombre.toLowerCase().includes(valor));
  if (precioBuscado !== "") filtrados = filtrados.filter((p) => p.precio == parseInt(precioBuscado));
  if (categoriaBuscada !== "") filtrados = filtrados.filter((p) => p.categoria_id == parseInt(categoriaBuscada));
  renderizarProductos(filtrados);
}

function calcularGananciaEnVivo() {
  const precioInput = parseInt(document.getElementById("precio").value) || 0;
  const insumoSelect = document.getElementById("insumo-principal");
  const infoDiv = document.getElementById("info-ganancia");

  if (!insumoSelect.value) {
    infoDiv.innerHTML = `<span class="text-success">Venta C$ ${precioInput} (Utilidad 100%)</span>`;
    return;
  }
  const costoInsumo = insumosPrecios[insumoSelect.value] || 0;
  const ganancia = precioInput - costoInsumo;

  if (ganancia > 0) {
    infoDiv.innerHTML = `Costo Insumo: C$ ${costoInsumo} <br> <span class="text-success fs-5">Ganancia Neta: C$ ${ganancia}</span>`;
  } else {
    infoDiv.innerHTML = `Costo Insumo: C$ ${costoInsumo} <br> <span class="text-danger fs-5">Pérdida de: C$ ${Math.abs(ganancia)}</span>`;
  }
}

document.addEventListener("DOMContentLoaded", cargarProductos);
document.getElementById("busqueda-productos").addEventListener("input", filtrarProductos);
document.getElementById("busqueda-precio").addEventListener("input", filtrarProductos);
document.getElementById("filtro-categoria").addEventListener("change", filtrarProductos);
document.getElementById("form-agregar").addEventListener("submit", agregarProducto);
document.getElementById("form-editar").addEventListener("submit", actualizarProducto);
document.getElementById("precio").addEventListener("input", calcularGananciaEnVivo);
document.getElementById("insumo-principal").addEventListener("change", calcularGananciaEnVivo);