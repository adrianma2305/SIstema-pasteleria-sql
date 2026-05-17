let usuarioActual = null;
const API_URL_USUARIOS = "https://sistema-pasteleria-sql.onrender.com/api";
let listaEmpleadosAdmin = []; 

async function inicializarSistemaConLogin() {
  const mainContent = document.querySelector(".main-content");
  const sidebar = document.querySelector(".sidebar");

  if (mainContent) mainContent.style.display = "none";
  if (sidebar) sidebar.style.display = "none";

  const idGuardado = localStorage.getItem("usuario_id");

  if (idGuardado) {
    try {
      const res = await fetch(`${API_URL_USUARIOS}/empleados/${idGuardado}`);
      if (res.ok) {
        const data = await res.json();
        usuarioActual = data;
        actualizarHeaderUsuario(data);
        aplicarPermisosInterfaz(); 
        
        if (mainContent) mainContent.style.display = "block";
        if (sidebar) sidebar.style.display = "block";
        
        if (esAdmin()) { document.getElementById("btn-ir-inicio")?.click(); } 
        else { document.getElementById("btn-ir-ventas")?.click(); }
        return; 
      } else { localStorage.removeItem("usuario_id"); }
    } catch (error) { console.error("Error de sesión", error); }
  }

  const modalElement = document.getElementById("modalLoginInicio");
  let modalLogin = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement, { backdrop: 'static', keyboard: false });
  
  const select = document.getElementById("login-usuario");
  select.innerHTML = "<option value='' selected disabled>Selecciona tu usuario...</option>";

  try {
    const resEmp = await fetch(`${API_URL_USUARIOS}/empleados`);
    if (resEmp.ok) {
      const empleados = await resEmp.json();
      empleados.forEach(emp => {
        const option = document.createElement("option");
        option.value = emp.id;
        option.innerText = `${emp.nombre} (${emp.cargo || ''})`;
        select.appendChild(option);
      });
    }
  } catch (error) {}

  modalLogin.show();

  const formLogin = document.getElementById("form-login");
  formLogin.onsubmit = async (e) => {
    e.preventDefault();
    const idUsuario = select.value;
    const pass = document.getElementById("login-password").value;

    if (!idUsuario) return mostrarErrorLogin("Por favor selecciona un usuario.");

    try {
      const res = await fetch(`${API_URL_USUARIOS}/empleados/${idUsuario}`);
      if (!res.ok) return mostrarErrorLogin("Error al verificar usuario.");
      
      const data = await res.json();
      const hashIngresado = await hashPassword(pass);
      
      if (hashIngresado === data.contraseña) {
        usuarioActual = data;
        localStorage.setItem("usuario_id", data.id);
        actualizarHeaderUsuario(data);
        modalLogin.hide();
        forzarCierreBackdrop();

        if (mainContent) mainContent.style.display = "block";
        if (sidebar) sidebar.style.display = "block";
        
        aplicarPermisosInterfaz();
        if (esAdmin()) document.getElementById("btn-ir-inicio")?.click(); 
        else document.getElementById("btn-ir-ventas")?.click(); 

        mostrarNotificacion("Acceso Autorizado", `Bienvenido(a), ${data.nombre}`, "success");
      } else {
        mostrarErrorLogin("Contraseña incorrecta.");
        document.getElementById("login-password").value = "";
      }
    } catch (error) { mostrarErrorLogin("Error de red. Revisa tu conexión a Azure."); }
  };
}

function forzarCierreBackdrop() {
  const backdrops = document.querySelectorAll('.modal-backdrop');
  backdrops.forEach(backdrop => backdrop.remove());
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}

function actualizarHeaderUsuario(data) {
  const nombreEl = document.getElementById("header-usuario-nombre");
  const cargoEl = document.getElementById("header-usuario-cargo");
  if(nombreEl) nombreEl.textContent = data.nombre;
  if(cargoEl) cargoEl.textContent = "(" + (data.cargo || "") + ")";
}

function mostrarErrorLogin(mensaje) {
  const errorDiv = document.getElementById("login-error");
  if(errorDiv) {
    errorDiv.innerText = mensaje;
    errorDiv.style.display = "block";
  }
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

window.abrirModalUsuarios = function() {
  new bootstrap.Modal(document.getElementById("modalConfirmarLogout")).show();
};

window.ejecutarLogout = function() {
  localStorage.removeItem("usuario_id");
  window.location.reload(); 
};

window.abrirModalAgregarUsuario = function () {
  const form = document.getElementById("form-agregar-usuario");
  if (form) form.reset();
  new bootstrap.Modal(document.getElementById("modalAgregarUsuario")).show();
};

document.getElementById("form-agregar-usuario")?.addEventListener("submit", async function (e) {
  e.preventDefault();
  const nombre = document.getElementById("nombre-usuario").value.trim();
  const cargo = document.getElementById("cargo-usuario").value.trim();
  const contrasea = document.getElementById("contrasea-usuario").value.trim();

  if (!nombre || !cargo || !contrasea) return mostrarNotificacion("Faltan datos", "Todos los campos son obligatorios.", "warning");
  const hash = await hashPassword(contrasea);
  
  try {
    const respuesta = await fetch(`${API_URL_USUARIOS}/empleados`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, cargo, contraseña: hash }) });
    if (!respuesta.ok) throw new Error("Error");
    mostrarNotificacion("Completado", "Nuevo usuario del sistema creado.", "success");
    bootstrap.Modal.getInstance(document.getElementById("modalAgregarUsuario")).hide();
    if (document.getElementById("seccion-usuarios").style.display === "block") cargarTablaUsuariosAdmin();
  } catch (error) { mostrarNotificacion("Fallo", "El servidor denegó la creación.", "error"); }
});

window.abrirEditarUsuario = function(id) {
  const emp = listaEmpleadosAdmin.find(u => u.id === id);
  if(!emp) return;
  document.getElementById("edit-id-usuario").value = emp.id;
  document.getElementById("edit-nombre-usuario").value = emp.nombre;
  document.getElementById("edit-cargo-usuario").value = emp.cargo || '';
  document.getElementById("edit-contrasea-usuario").value = ''; 
  new bootstrap.Modal(document.getElementById("modalEditarUsuario")).show();
};

document.getElementById("form-editar-usuario")?.addEventListener("submit", async function(e) {
  e.preventDefault();
  const id = document.getElementById("edit-id-usuario").value;
  const nombre = document.getElementById("edit-nombre-usuario").value.trim();
  const cargo = document.getElementById("edit-cargo-usuario").value.trim();
  const passRaw = document.getElementById("edit-contrasea-usuario").value.trim();

  if (!nombre || !cargo) return mostrarNotificacion("Atención", "El nombre y rol son requeridos", "warning");

  const bodyData = { nombre, cargo };
  if (passRaw) bodyData.password = await hashPassword(passRaw);

  try {
      const res = await fetch(`${API_URL_USUARIOS}/empleados/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) });
      if(!res.ok) throw new Error();
      mostrarNotificacion("Actualizado", "Modificaciones al usuario guardadas.", "success");
      bootstrap.Modal.getInstance(document.getElementById("modalEditarUsuario")).hide();
      if (usuarioActual && usuarioActual.id == id) {
          usuarioActual.nombre = nombre;
          usuarioActual.cargo = cargo;
          actualizarHeaderUsuario(usuarioActual);
      }
      cargarTablaUsuariosAdmin();
  } catch(error) { mostrarNotificacion("Error", "No se pudo actualizar.", "error"); }
});

window.eliminarUsuario = async function(id) {
  if (usuarioActual.id === id) return mostrarNotificacion("Error de Seguridad", "No puedes eliminar tu cuenta mientras esté activa.", "error");
  
  mostrarConfirmacion("⚠️ Vas a eliminar a este usuario permanentemente, ¿Estás seguro?", async () => {
      try {
        const res = await fetch(`${API_URL_USUARIOS}/empleados/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        mostrarNotificacion("Eliminado", "Se ha revocado el acceso.", "success");
        cargarTablaUsuariosAdmin();
      } catch (error) { mostrarNotificacion("Fallo", "El servidor no borró el usuario.", "error"); }
  });
};

window.cargarTablaUsuariosAdmin = async function() {
  const tbody = document.querySelector("#usuarios-table-admin tbody");
  if (!tbody) return;
  tbody.innerHTML = "<tr><td colspan='4' class='text-center'>Cargando...</td></tr>";

  try {
    const res = await fetch(`${API_URL_USUARIOS}/empleados`);
    if (!res.ok) throw new Error();
    const empleados = await res.json();
    listaEmpleadosAdmin = empleados;
    renderizarTablaUsuarios(empleados);
  } catch (error) { tbody.innerHTML = "<tr><td colspan='4' class='text-center text-danger'>Fallo de red.</td></tr>"; }
};

function renderizarTablaUsuarios(empleados) {
  const tbody = document.querySelector("#usuarios-table-admin tbody");
  tbody.innerHTML = "";
  
  empleados.forEach(emp => {
    let badgeRole = emp.cargo.toLowerCase().includes('admin') ? `<span class="badge bg-danger">${emp.cargo}</span>` : `<span class="badge bg-secondary">${emp.cargo}</span>`;

    let botones = `<button class="btn btn-sm btn-info me-1 text-white" onclick="abrirEditarUsuario(${emp.id})" title="Editar"><i class="bi bi-pencil"></i></button>`;
    if (usuarioActual && emp.id === usuarioActual.id) {
        botones += `<button class="btn btn-sm btn-outline-secondary" disabled title="Tú"><i class="bi bi-person-fill"></i></button>`;
    } else {
        botones += `<button class="btn btn-sm btn-danger" onclick="eliminarUsuario(${emp.id})" title="Eliminar Acceso"><i class="bi bi-trash"></i></button>`;
    }

    tbody.insertAdjacentHTML("beforeend", `
      <tr>
        <td class="fw-bold">${emp.id}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-person-circle fs-4 text-muted"></i>
            ${emp.nombre}
          </div>
        </td>
        <td>${badgeRole}</td>
        <td class="text-center">${botones}</td>
      </tr>
    `);
  });
}

document.getElementById("busqueda-usuarios-tabla")?.addEventListener("input", function(e) {
  const val = e.target.value.toLowerCase();
  const filtrados = listaEmpleadosAdmin.filter(emp => emp.nombre.toLowerCase().includes(val) || emp.cargo.toLowerCase().includes(val));
  renderizarTablaUsuarios(filtrados);
});

window.iniciarRecuperacion = function() {
  const idUsuario = document.getElementById("login-usuario").value;
  if (!idUsuario) return mostrarNotificacion("Pausa", "Selecciona tu nombre en la lista de arriba antes de recuperar.", "warning");
  new bootstrap.Modal(document.getElementById("modalRecuperarPass")).show();
};

document.getElementById("form-recuperar-pass")?.addEventListener("submit", async function(e) {
  e.preventDefault();
  const idAdmin = document.getElementById("login-usuario").value;
  const pinMaestro = document.getElementById("recup-pin-maestro").value;
  const nuevaClave = document.getElementById("recup-nueva-pass").value;
  const confirmarClave = document.getElementById("recup-confirmar-pass").value;

  if (nuevaClave !== confirmarClave) return mostrarNotificacion("Error", "Las nuevas contraseñas no son iguales.", "error");
  if (pinMaestro !== "UNI-2026") return mostrarNotificacion("Bloqueado", "PIN Administrativo denegado.", "error");

  try {
    const hashNuevo = await hashPassword(nuevaClave);
    const res = await fetch(`${API_URL_USUARIOS}/empleados/${idAdmin}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: hashNuevo, es_recuperacion: true }) });

    if (res.ok) {
      mostrarNotificacion("Desbloqueado", "Tu nueva contraseña fue asignada.", "success");
      bootstrap.Modal.getInstance(document.getElementById("modalRecuperarPass")).hide();
      document.getElementById("form-recuperar-pass").reset();
    } else throw new Error();
  } catch (error) { mostrarNotificacion("Error", "Hubo un fallo con el servidor de la base de datos.", "error"); }
});

function esAdmin() {
  if (!usuarioActual) return false;
  return usuarioActual.cargo.toLowerCase().trim().includes("admin"); 
}

function aplicarPermisosInterfaz() {
  const elementos = {
    reporte: document.getElementById("btn-accion-reporte"),
    inicio: document.getElementById("btn-ir-inicio")?.parentElement,
    productos: document.getElementById("btn-ir-productos")?.parentElement,
    proveedores: document.getElementById("btn-ir-proveedores")?.parentElement,
    usuarios: document.getElementById("nav-item-usuarios"),
    addProd: document.querySelector("#seccion-productos .agregarprod"),
    addProv: document.querySelector("#seccion-proveedores .agregarprod")
  };

  const mostrar = esAdmin() ? "block" : "none";
  const mostrarInline = esAdmin() ? "inline-block" : "none";

  if(elementos.reporte) elementos.reporte.style.display = mostrar;
  if(elementos.inicio) elementos.inicio.style.display = mostrar;
  if(elementos.productos) elementos.productos.style.display = mostrar;
  if(elementos.proveedores) elementos.proveedores.style.display = mostrar;
  if(elementos.usuarios) elementos.usuarios.style.display = mostrar;
  if(elementos.addProd) elementos.addProd.style.display = mostrarInline;
  if(elementos.addProv) elementos.addProv.style.display = mostrarInline;

  if (!esAdmin() && document.getElementById("btn-ir-ventas")) {
    document.getElementById("btn-ir-ventas").click();
    document.getElementById("seccion-dashboard").style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => inicializarSistemaConLogin());