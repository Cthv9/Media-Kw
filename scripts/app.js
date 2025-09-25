window.addEventListener("DOMContentLoaded", () => {
  const oreEl = document.getElementById("ore");
  const energiaEl = document.getElementById("energia");
  const addBtn = document.getElementById("addToChart");
  const clearBtn = document.getElementById("clearChart");
  const resetBtn = document.getElementById("btnReset");
  const exportCSVBtn = document.getElementById("exportCSV");
  const exportPNGBtn = document.getElementById("exportPNG");
  const resultEl = document.getElementById("risultato");

  function initChart() {
    const ctx = document.getElementById("kwChart");
    if (!ctx || typeof Chart === "undefined") return null;

    const saved = JSON.parse(localStorage.getItem("mediaKW:data") || "[]");

    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: saved.map(p => p.label),
        datasets: [{
          label: "Potenza media (kW)",
          data: saved.map(p => p.kw),
          borderWidth: 1,
          backgroundColor: "#0078d4"
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: c => `${c.parsed.y.toFixed(2)} kW` }
          }
        }
      }
    });
  }

  const chart = initChart();

  function computeKW() {
    const ore = parseFloat(oreEl.value);
    const energia = parseFloat(energiaEl.value);
    if (!isFinite(ore) || !isFinite(energia) || ore === 0) return null;
    if (ore === 1) return energia;
    if (ore > 1) return energia / ore;
    return energia / (ore * 60);
  }

  addBtn.addEventListener("click", () => {
    const kw = computeKW();
    if (kw == null) {
      alert("Inserisci valori validi.");
      return;
    }
    const label = new Date().toLocaleString();

    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(kw);
    chart.update();

    const curr = JSON.parse(localStorage.getItem("mediaKW:data") || "[]");
    curr.push({ label, kw });
    localStorage.setItem("mediaKW:data", JSON.stringify(curr));

    if (!resultEl.textContent) {
      resultEl.textContent = `Media dei KW: ${kw.toFixed(2)}`;
    }
  });

  clearBtn.addEventListener("click", () => {
    if (!confirm("Sicuro di svuotare il grafico?")) return;
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
    localStorage.setItem("mediaKW:data", "[]");
  });

  resetBtn.addEventListener("click", () => {
    resultEl.textContent = "";
  });

  exportCSVBtn.addEventListener("click", () => {
    const rows = [["Etichetta", "kW"]];
    chart.data.labels.forEach((lbl, i) => {
      rows.push([lbl, chart.data.datasets[0].data[i]]);
    });
    const csv = rows.map(r => r.join(",")).join("\\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mediaKW.csv";
    a.click();
    URL.revokeObjectURL(url);
  });

  exportPNGBtn.addEventListener("click", () => {
    const url = chart.toBase64Image("image/png", 1.0);
    const a = document.createElement("a");
    a.href = url;
    a.download = "graficoKW.png";
    a.click();
  });
});
