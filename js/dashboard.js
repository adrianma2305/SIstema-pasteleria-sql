const API_URL_DASH = "https://sistema-pasteleria-sql.onrender.com/api";
let chartVentas, chartTop;

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
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  } catch (error) { console.error(error); }
}

// --- RENDIMIENTO CONTABLE (LLENADO SIMULTÁNEO DE LAS DOS PESTAÑAS) ---
window.abrirReporteCompleto = async function() {
  const modal = new bootstrap.Modal(document.getElementById("modalReporteProductos"));
  modal.show();
  
  const tbody = document.getElementById("tabla-reporte-general-body");
  const divMensual = document.getElementById("contenido-reporte-mensual");
  
  tbody.innerHTML = "<tr><td colspan='4' class='text-center'>Cargando desglose de productos...</td></tr>";
  divMensual.innerHTML = "<div class='text-center p-4 text-muted'>Calculando registros históricos mensuales...</div>";

  // PESTAÑA 1: Cargar Rendimiento por Producto
  try {
    const res = await fetch(`${API_URL_DASH}/reportes/financiero`);
    const datos = await res.json();
    tbody.innerHTML = "";
    
    if(datos.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' class='text-center text-muted'>No hay registros de ventas.</td></tr>";
    } else {
        datos.forEach(d => {
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
    }
  } catch (error) { tbody.innerHTML = "<tr><td colspan='4' class='text-center text-danger'>Error al conectar con la base de datos de productos.</td></tr>"; }

  // PESTAÑA 2: Cargar Resumen Mensual Agrupado (¡NUEVO!)
  try {
    const resM = await fetch(`${API_URL_DASH}/reportes/mensual`);
    const datosM = await resM.json();
    divMensual.innerHTML = "";
    
    if(datosM.length === 0) {
        divMensual.innerHTML = "<div class='text-center text-muted p-4'>No hay facturas registradas en el historial.</div>";
    } else {
        let tablaHTML = `
          <table class="table table-hover table-bordered align-middle m-0">
            <thead class="table-dark">
              <tr>
                <th>Período Contable</th>
                <th class="text-center">Volumen de Transacciones</th>
                <th class="text-end">Monto Total Recaudado</th>
              </tr>
            </thead>
            <tbody>
        `;
        datosM.forEach(m => {
          tablaHTML += `
            <tr>
              <td class="fw-bold text-primary"><i class="bi bi-calendar-check-fill me-2"></i>Mes de ${mesANombre(m.mes)}</td>
              <td class="text-center">${m.total_tickets} facturas emitidas</td>
              <td class="text-end fw-bold text-success">C$ ${m.total_ganado}.00</td>
            </tr>
          `;
        });
        tablaHTML += `</tbody></table>`;
        divMensual.innerHTML = tablaHTML;
    }
  } catch (error) { divMensual.innerHTML = "<div class='text-center text-danger p-4'>Error al procesar el resumen mensual.</div>"; }
};

// Traductor estético de formato numérico a texto para la presentación de la UNI
function mesANombre(formatoMes) {
  const [mes, anio] = formatoMes.split('-');
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return `${meses[parseInt(mes) - 1]} del ${anio}`;
}

document.getElementById("btn-ir-inicio")?.addEventListener("click", () => { cargarDashboard(); });
document.addEventListener("DOMContentLoaded", cargarDashboard);