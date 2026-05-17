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
        
        // SOLUCIÓN AL BUG DE LA PANTALLA DE INICIO:
        if (esAdmin()) {
            document.getElementById("btn-ir-inicio")?.click(); 
        } else {
            document.getElementById("btn-ir-ventas")?.click(); 
        }
        return; 
      } else {
        localStorage.removeItem("usuario_id");
      }
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
  } catch (error) { console.error("Error cargando usuarios", error); }

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
        
        // SOLUCIÓN AL BUG (Redirige según su cargo):
        if (esAdmin()) {
            document.getElementById("btn-ir-inicio")?.click(); 
        } else {
            document.getElementById("btn-ir-ventas")?.click(); 
        }

        mostrarNotificacion({titulo: "Bienvenido", mensaje: `Hola, ${data.nombre}`, tipo: "success"});
      } else {
        mostrarErrorLogin("Contraseña incorrecta.");
        document.getElementById("login-password").value = "";
      }
    } catch (error) {
      mostrarErrorLogin("Error de red. Revisa tu servidor Node.");
    }
  };
}