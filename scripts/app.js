// Tutto il JS del grafico sta qui per evitare conflitti d'ordine di esecuzione
window.addEventListener("DOMContentLoaded", () => {
  const oreEl = document.getElementById("ore");
  const energiaEl = document.getElementById("energia");
  const addBtn = document.getElementById("addToChart");
  const clearBtn = document.getElementById("clearChart");
  const resetBtn = document.getElementById("btnReset");
  const resultEl = document.getElementById("risultato");

  // Inizializza grafico solo quando Chart è disponibile
  function initChart() {
    const ctx = document.getElementById("kwChart");
    if (!ctx || typeof Chart === "undefined") return null;

    // Recupero dati salvati
    const saved = JSON.parse(localStorage.getItem("mediaKW:data") || "[]");

    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: saved.map(p => p.label),
        datasets: [{
          label: "Potenza media (kW)",
          data: saved.map(p => p.kw),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: { label: c => `${c.parsed.y.toFixed(2)} kW` }
          }
        }
      }
    });
  }

  const chart = initChart();

  function computeKWFromInputs() {
    const ore = parseFloat(oreEl.value);
    const energia = parseFloat(energiaEl.value);
    if (!isFinite(ore) || !isFinite(energia) || ore === 0) return null;

    // Mantiene la tua logica originale
    if (ore === 1) return energia;
    if (ore > 1) return energia / ore;
    return energia / (ore * 60);
  }

  addBtn.addEventListener("click", () => {
    const kw = computeKWFromInputs();
    if (kw == null) {
      alert("Inserisci valori validi (ore ≠ 0).");
      return;
    }
    const label = new Date().toLocaleString();

    if (chart) {
      chart.data.labels.push(label);
      chart.data.datasets[0].data.push(kw);
      chart.update();
    }

    // Salva anche in localStorage
    const curr = JSON.parse(localStorage.getItem("mediaKW:data") || "[]");
    curr.push({ label, kw });
    localStorage.setItem("mediaKW:data", JSON.stringify(curr));

    // Aggiorna il testo di risultato se vuoto
    if (!resultEl.textContent) {
      resultEl.textContent = `Media dei KW: ${kw.toFixed(2)}`;
    }
  });

  clearBtn.addEventListener("click", () => {
    if (!confirm("Sicuro di svuotare il grafico?")) return;
    if (chart) {
      chart.data.labels = [];
      chart.data.datasets[0].data = [];
      chart.update();
    }
    localStorage.setItem("mediaKW:data", "[]");
  });

  resetBtn.addEventListener("click", () => {
    resultEl.textContent = "";
  });
});
