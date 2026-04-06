// ─── Registro del Service Worker ───────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('Service Worker registrado correctamente'))
    .catch(err => console.error('Error al registrar el Service Worker:', err));
}

// ─── Variables y referencias al DOM ────────────────────────────────────────
const btnPresupuesto = document.getElementById('btnPresupuesto');
const btnAgregar = document.getElementById('btnAgregar');
const listaGastos = document.getElementById('listaGastos');

let gastos = JSON.parse(localStorage.getItem('gastos')) || [];
let presupuesto = parseFloat(localStorage.getItem('presupuesto')) || 0;

// ─── Mes actual por defecto ─────────────────────────────────────────────────
function mesActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}


// ─── Formateo de inputs ─────────────────────────────────────────────────────
document.getElementById('presupuesto').addEventListener('input', function (e) {
  let value = e.target.value.replace(/[^\d]/g, '');
  e.target.value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
});

document.getElementById('monto').addEventListener('input', function (e) {
  let value = e.target.value.replace(/[^\d,]/g, '');
  let parts = value.split(',');
  if (parts.length > 2) parts = [parts[0], parts.slice(1).join('')];
  if (parts[0]) parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  e.target.value = parts.join(',');
});

// ─── Guardar presupuesto ────────────────────────────────────────────────────
btnPresupuesto.addEventListener('click', () => {
  const valor = parseFloat(document.getElementById('presupuesto').value.replace(/\./g, '').replace(',', '.'));
  if (isNaN(valor) || valor <= 0) {
    alert('Ingresa un presupuesto válido');
    return;
  }
  presupuesto = valor;
  localStorage.setItem('presupuesto', presupuesto);
  actualizarUI();
});

// ─── Agregar gasto ──────────────────────────────────────────────────────────
btnAgregar.addEventListener('click', () => {
  const descripcion = document.getElementById('descripcion').value.trim();
  const monto = parseFloat(document.getElementById('monto').value.replace(/\./g, '').replace(',', '.'));
  const categoria = document.getElementById('categoria').value;
  const fechaCompleta = document.getElementById('mesGasto').value;
  const mesDelGasto = fechaCompleta.substring(0, 7);
  const errorGasto = document.getElementById('errorGasto');

  if (!descripcion || isNaN(monto) || monto <= 0 || !categoria || !fechaCompleta) {
    errorGasto.style.display = 'block';
    setTimeout(() => errorGasto.style.display = 'none', 3000);
    return;
  }

  // Validar solo contra gastos del mismo mes
  const gastadoEnMes = gastos
    .filter(g => g.mes === mesDelGasto)
    .reduce((acc, g) => acc + g.monto, 0);
  const disponibleEnMes = presupuesto - gastadoEnMes;

  if (monto > disponibleEnMes) {
    const errorGasto = document.getElementById('errorGasto');
    errorGasto.textContent = 'El monto supera el presupuesto disponible para este mes';
    errorGasto.style.display = 'block';
    setTimeout(() => {
      errorGasto.style.display = 'none';
      errorGasto.textContent = '⚠️ Por favor completa todos los campos correctamente';
    }, 3000);
    return;
  }


  const gasto = {
    id: Date.now(),
    descripcion,
    monto,
    categoria,
    mes: mesDelGasto,
    fecha: new Date(fechaCompleta + 'T12:00:00').toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  };

  gastos.push(gasto);
  localStorage.setItem('gastos', JSON.stringify(gastos));

  document.getElementById('descripcion').value = '';
  document.getElementById('monto').value = '';
  document.getElementById('categoria').value = '';

  actualizarUI();
});

// ─── Eliminar gasto ─────────────────────────────────────────────────────────
function eliminarGasto(id) {
  gastos = gastos.filter(g => g.id !== id);
  localStorage.setItem('gastos', JSON.stringify(gastos));
  actualizarUI();
}

// ─── Actualizar interfaz ────────────────────────────────────────────────────
function actualizarUI() {
  const mesFiltro = document.getElementById('mesFiltro').value;
  const gastosMes = gastos.filter(g => g.mes === mesFiltro);
  const total = gastosMes.reduce((acc, g) => acc + g.monto, 0);
  const disponible = Math.max(presupuesto - total, 0);

  document.getElementById('presupuestoActual').textContent = `$${presupuesto.toLocaleString()}`;
  document.getElementById('totalGastado').textContent = `$${total.toLocaleString()}`;
  document.getElementById('disponible').textContent = `$${disponible.toLocaleString()}`;

  listaGastos.innerHTML = '';
  gastosMes.forEach(g => {
    const item = document.createElement('li');
    item.classList.add('list-group-item');
    item.innerHTML = `
      <div>
        <strong>${g.descripcion}</strong>
        <span class="badge-categoria ml-2">${g.categoria}</span>
        <small class="text-muted ml-2">${g.fecha}</small>
      </div>
      <div>
        <strong>$${g.monto.toLocaleString()}</strong>
        <button class="btn-eliminar ml-3" onclick="eliminarGasto(${g.id})">🗑️</button>
      </div>
    `;
    listaGastos.appendChild(item);
  });

  actualizarGrafico(total, Math.max(presupuesto - total, 0));
}

// Actualizar resumen cuando cambia el mes filtro
document.getElementById('mesFiltro').addEventListener('change', actualizarUI);

// ─── Gráfico ────────────────────────────────────────────────────────────────
let graficoInstance = null;

function actualizarGrafico(totalGastado, disponible) {
  const ctx = document.getElementById('grafico').getContext('2d');
  if (graficoInstance) graficoInstance.destroy();

  graficoInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Presupuesto', 'Gastado', 'Disponible'],
      datasets: [{
        label: 'Resumen financiero ($)',
        data: [presupuesto, totalGastado, disponible],
        backgroundColor: ['#2980b9', '#e74c3c', '#27ae60']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}

// ─── Cargar datos al iniciar ────────────────────────────────────────────────
// Inicializar selectores al mes actual antes de cargar UI
const _mesInicial = mesActual();
document.getElementById('mesGasto').value = new Date().toISOString().substring(0, 10);
document.getElementById('mesFiltro').value = _mesInicial;

actualizarUI();


// ─── Exportar PDF ───────────────────────────────────────────────────────────
document.getElementById('btnExportarPDF').addEventListener('click', () => {
  generarPDF();
});

function generarDonaPDF(gastosDelMes, totalGastado, callback) {
  const contenedor = d3.select('#graficoPDF');
  contenedor.selectAll('*').remove();

  const colores = ['#F87171', '#2DD4BF', '#6C63FF', '#FBBF24', '#34D399', '#60A5FA', '#F472B6', '#A78BFA'];

  const porCategoria = {};
  gastosDelMes.forEach(g => {
    if (!porCategoria[g.categoria]) porCategoria[g.categoria] = 0;
    porCategoria[g.categoria] += g.monto;
  });

  const data = Object.keys(porCategoria).map((cat, i) => ({
    label: cat,
    valor: porCategoria[cat],
    color: colores[i % colores.length]
  }));

  const width = 300, height = 300, radius = 120, innerRadius = 70;
  const porcentaje = presupuesto > 0 ? Math.round((totalGastado / presupuesto) * 100) : 0;

  const svg = contenedor.append('svg')
    .attr('width', width).attr('height', height)
    .attr('xmlns', 'http://www.w3.org/2000/svg')
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  const pie = d3.pie().value(d => d.valor).sort(null);
  const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius);

  svg.selectAll('.arc')
    .data(pie(data)).enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', d => d.data.color)
    .attr('stroke', '#fff')
    .attr('stroke-width', 3);

  svg.append('text')
    .attr('text-anchor', 'middle').attr('dy', '-0.1em')
    .style('font-size', '32px').style('font-weight', 'bold').style('fill', '#1C1C1E')
    .text(`${porcentaje}%`);

  svg.append('text')
    .attr('text-anchor', 'middle').attr('dy', '1.4em')
    .style('font-size', '13px').style('fill', '#8E8E93')
    .text('del presupuesto');

  const svgEl = contenedor.select('svg').node();
  const svgData = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    callback(canvas.toDataURL('image/png'), data);
  };
  img.src = url;
}

function generarPDF() {
  const mesPDF = document.getElementById('mesFiltro').value;
  const gastosDelMes = gastos.filter(g => g.mes === mesPDF);

  if (gastosDelMes.length === 0) {
    alert(`No hay gastos registrados para ${mesPDF}`);
    return;
  }

  const total = gastosDelMes.reduce((acc, g) => acc + g.monto, 0);
  const disponible = Math.max(presupuesto - total, 0);
  const pctGastado = presupuesto > 0 ? Math.round((total / presupuesto) * 100) : 0;
  const fecha = new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const [anio, mes] = mesPDF.split('-');
  const nombreMes = new Date(anio, mes - 1).toLocaleDateString('es-CO', {
    month: 'long', year: 'numeric'
  });

  generarDonaPDF(gastosDelMes, total, (imgData, data) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // ── Encabezado
    doc.setFillColor(108, 99, 255);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Finanzas Chéveres', 14, 18);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reporte de ${nombreMes}`, 14, 27);
    doc.setFontSize(9);
    doc.setTextColor(200, 195, 255);
    doc.text(`Generado el ${fecha}`, 14, 36);

    // ── Tarjetas resumen
    const tarjetas = [
      { label: 'Presupuesto', valor: `$${presupuesto.toLocaleString()}`, color: [108, 99, 255], x: 14 },
      { label: 'Total gastado', valor: `$${total.toLocaleString()}`, color: [248, 113, 113], x: 80 },
      { label: 'Disponible', valor: `$${disponible.toLocaleString()}`, color: [45, 212, 191], x: 146 }
    ];
    tarjetas.forEach(t => {
      doc.setFillColor(...t.color);
      doc.roundedRect(t.x, 46, 58, 22, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(t.label, t.x + 4, 53);
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text(t.valor, t.x + 4, 63);
    });

    // ── Barra de progreso
    doc.setFontSize(10); doc.setTextColor(28, 28, 30); doc.setFont('helvetica', 'bold');
    doc.text(`Ejecución del presupuesto: ${pctGastado}% utilizado`, 14, 80);
    doc.setFillColor(230, 230, 235);
    doc.roundedRect(14, 83, 182, 5, 2, 2, 'F');
    const barraColor = pctGastado >= 90 ? [248, 113, 113] : pctGastado >= 70 ? [251, 191, 36] : [45, 212, 191];
    doc.setFillColor(...barraColor);
    doc.roundedRect(14, 83, Math.min(182 * pctGastado / 100, 182), 5, 2, 2, 'F');

    // ── Dona
    doc.addImage(imgData, 'PNG', 14, 95, 90, 90);

    // ── Leyenda al lado de la dona
    doc.setFontSize(11); doc.setTextColor(28, 28, 30); doc.setFont('helvetica', 'bold');
    doc.text('Por categoría', 112, 102);
    let ly = 112;
    data.forEach(cat => {
      const r = parseInt(cat.color.slice(1, 3), 16);
      const g = parseInt(cat.color.slice(3, 5), 16);
      const b = parseInt(cat.color.slice(5, 7), 16);
      const pct = total > 0 ? Math.round((cat.valor / total) * 100) : 0;
      doc.setFillColor(r, g, b);
      doc.roundedRect(112, ly - 3, 3, 4, 1, 1, 'F');
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(28, 28, 30);
      doc.text(cat.label, 118, ly);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
      doc.text(`$${cat.valor.toLocaleString()}  (${pct}%)`, 118, ly + 5);
      ly += 14;
    });

    // ── Línea divisoria
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 192, 196, 192);

    // ── Tabla de gastos
    doc.setFontSize(12); doc.setTextColor(28, 28, 30); doc.setFont('helvetica', 'bold');
    doc.text('Detalle de gastos', 14, 202);
    doc.setFillColor(108, 99, 255);
    doc.rect(14, 206, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('Descripción', 17, 212);
    doc.text('Categoría', 80, 212);
    doc.text('Monto', 135, 212);
    doc.text('Fecha', 163, 212);


    doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
    let y = 222;
    gastosDelMes.forEach((g, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (i % 2 === 0) {
        doc.setFillColor(245, 245, 247);
        doc.rect(14, y - 5, 182, 8, 'F');
      }
      doc.setFontSize(9);
      doc.text(g.descripcion.substring(0, 25), 17, y);
      doc.text(g.categoria, 80, y);
      doc.text(`$${g.monto.toLocaleString()}`, 135, y);
      doc.text(g.fecha, 163, y);
      y += 10;
    });

    // ── Pie de página
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 280, 196, 280);
    doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'normal');
    doc.text('Finanzas Chéveres — Reporte automático', 105, 286, { align: 'center' });

    doc.save(`reporte-${mesPDF}.pdf`);
  });
}
