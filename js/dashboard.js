const API_URL_DASH = "https://sistema-pasteleria-sql.onrender.com/api";

async function cargarDashboard() {
  try {
    const resResumen = await fetch(`${API_URL_DASH}/dashboard/resumen`);
    if (resResumen.ok) {
      const data = await resResumen.json();
      document.getElementById("ventas-dia").innerText = `C$ ${data.dia}`;
      document.getElementById("ventas-semana").innerText = `C$ ${data.semana}`;
      document.getElementById("ventas-mes").innerText = `C$ ${data.mes}`;
    }
  } catch (error) { console.error("Error", error); }

  cargarGraficoVentasMes();
  cargarGraficoTopProductos();
}

let chartVentas, chartTop;

async function cargarGraficoVentasMes() {
  try {
    const res = await fetch(`${API_URL_DASH}/dashboard/ventas-mes`);
    const data = await res.json();
    const ctx = document.getElementById('grafico-ventas');
    if (!ctx) return;
    
    if (chartVentas) chartVentas.destroy();
    
    chartVentas = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.dia),
        datasets: [{
          label: 'Ingresos C$',
          data: data.map(d => d.total_dia),
          borderColor: '#ff69b7',
          backgroundColor: 'rgba(255, 105, 183, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0.3
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  } catch (error) { console.error(error); }
}

async function cargarGraficoTopProductos() {
  try {
    const res = await fetch(`${API_URL_DASH}/dashboard/top-productos`);
    const data = await res.json();
    const ctx = document.getElementById('grafico-top-productos');
    if (!ctx) return;
    
    if (chartTop) chartTop.destroy();
    
    chartTop = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.nombre),
        datasets: [{
          data: data.map(d => d.total_vendido),
          backgroundColor: ['#ff69b7', '#ff9f43', '#ffc107', '#28c76f', '#20c997'],
          borderWidth: 0
        }]
      },
      options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } } 
      }
    });
  } catch (error) { console.error(error); }
}

// --- FASE 4: EL REPORTE FINANCIERO CORREGIDO ---
window.abrirReporteCompleto = async function() {
  const modal = new bootstrap.Modal(document.getElementById("modalReporteProductos"));
  modal.show();
  
  const tbody = document.getElementById("tabla-reporte-general-body");
  tbody.innerHTML = "<tr><td colspan='4' class='text-center'>Cargando reporte contable...</td></tr>";

  try {
    const res = await fetch(`${API_URL_DASH}/reportes/financiero`);
    const datos = await res.json();
    
    tbody.innerHTML = "";
    
    if(datos.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' class='text-center text-muted'>No hay ventas registradas aún.</td></tr>";
        return;
    }

    datos.forEach(d => {
      // Pintamos de rojo si el producto ya fue borrado para alertar al contador
      const isEliminado = d.producto.includes("Eliminado");
      const colorNombre = isEliminado ? "text-danger" : "";

      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td class="fw-bold ${colorNombre}">${d.producto}</td>
          <td class="text-center">${d.tickets}</td>
          <td class="text-center fw-bold">${d.unidades}</td>
          <td class="text-end fw-bold text-success">C$ ${d.ingreso_total}</td>
        </tr>
      `);
    });
  } catch (error) { 
      tbody.innerHTML = "<tr><td colspan='4' class='text-center text-danger'>Error al conectar con la base de datos financiera.</td></tr>"; 
  }
};

document.getElementById("btn-ir-inicio")?.addEventListener("click", () => {
    cargarDashboard();
});

document.addEventListener("DOMContentLoaded", cargarDashboard);