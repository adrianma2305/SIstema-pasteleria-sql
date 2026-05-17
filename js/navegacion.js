document.addEventListener("DOMContentLoaded", () => {
  const botonesNav = {
    inicio: document.getElementById("btn-ir-inicio"),
    ventas: document.getElementById("btn-ir-ventas"),
    productos: document.getElementById("btn-ir-productos"),
    proveedores: document.getElementById("btn-ir-proveedores"),
    usuarios: document.getElementById("btn-ir-usuarios")
  };

  const secciones = {
    inicio: document.getElementById("seccion-dashboard"),
    ventas: document.getElementById("seccion-ventas"),
    productos: document.getElementById("seccion-productos"),
    proveedores: document.getElementById("seccion-proveedores"),
    usuarios: document.getElementById("seccion-usuarios")
  };

  function ocultarTodasLasSecciones() {
    Object.values(secciones).forEach(seccion => {
      if (seccion) seccion.style.display = "none";
    });
    document.querySelectorAll(".nav-links li a").forEach(a => a.classList.remove("active"));
  }

  if (botonesNav.inicio) {
    botonesNav.inicio.addEventListener("click", async (e) => {
      e.preventDefault(); ocultarTodasLasSecciones();
      if (secciones.inicio) secciones.inicio.style.display = "block";
      botonesNav.inicio.classList.add("active");
      if (typeof refrescarTotales === 'function') await refrescarTotales();
      if (typeof graficarSemana === 'function') graficarSemana();
      if (typeof refrescarTopProductos === 'function') refrescarTopProductos();
    });
  }

  if (botonesNav.ventas) {
    botonesNav.ventas.addEventListener("click", (e) => {
      e.preventDefault(); ocultarTodasLasSecciones();
      if (secciones.ventas) secciones.ventas.style.display = "block";
      botonesNav.ventas.classList.add("active");
      if (typeof iniciarPOSVenta === 'function') iniciarPOSVenta();
      if (typeof cargarVentas === 'function') cargarVentas(); 
    });
  }

  if (botonesNav.productos) {
    botonesNav.productos.addEventListener("click", (e) => {
      e.preventDefault(); ocultarTodasLasSecciones();
      if (secciones.productos) secciones.productos.style.display = "block";
      botonesNav.productos.classList.add("active");
      if (typeof cargarProductos === 'function') cargarProductos();
    });
  }

  if (botonesNav.proveedores) {
    botonesNav.proveedores.addEventListener("click", (e) => {
      e.preventDefault(); ocultarTodasLasSecciones();
      if (secciones.proveedores) secciones.proveedores.style.display = "block";
      botonesNav.proveedores.classList.add("active");
      if (typeof cargarProveedores === 'function') cargarProveedores();
      if (typeof cargarInsumos === 'function') cargarInsumos();
    });
  }

  if (botonesNav.usuarios) {
    botonesNav.usuarios.addEventListener("click", (e) => {
      e.preventDefault(); ocultarTodasLasSecciones();
      if (secciones.usuarios) secciones.usuarios.style.display = "block";
      botonesNav.usuarios.classList.add("active");
      if (typeof cargarTablaUsuariosAdmin === 'function') cargarTablaUsuariosAdmin();
    });
  }
});