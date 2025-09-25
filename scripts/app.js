// scripts/app.js
window.addEventListener("DOMContentLoaded", () => {
  const oreEl = document.getElementById("ore");
  const energiaEl = document.getElementById("energia");
  const pratedEl = document.getElementById("prated");
  const addBtn = document.getElementById("addToChart");
  const clearBtn = document.getElementById("clearChart");
  const resetBtn = document.getElementById("btnReset");
  const exportCSVBtn = document.getElementById("exportCSV");
  const exportPNGBtn = document.getElementById("exportPNG");
  const resultEl = document.getElementById("risultato");

  const STORAGE_KEY = "mediaKW:data";

  // --- Helpers Storage ---
  function loadPoints() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw
        .map(p => (typeof p === "number" ? { kw: p } : p))
        .filter(p => p && isFinite(Number(p.kw)))
        .map(p => ({ kw: Number(p.kw) }));
    } catch {
      return [];
    }
  }
  function savePoints(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  // --- Calcolo media kW dai campi input ---
  function computeKW() {
    const ore = parseFloat(oreEl?.value);
    const energia = parseFloat(energiaEl?.value);
    if (!isFinite(ore) || !isFinite(energia) || ore <= 0) return null;
    return energia / ore; // kWh / h = kW
  }

  // --- Plugin: mostra il Load Factor sopra ogni barra quando P_rated è valido ---
  const lfLabelPlugin = {
    id: "lfLabelPlugin",
    afterDatasetsDraw(chart) {
      const prated = parseFloat(pratedEl?.value);
      if (!isFinite(prated) || prated <= 0) return;
      const { ctx, chartArea } = chart;
      const dataset = chart.data.datasets[0];
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.font = "600 12px Segoe UI, system-ui, sans-serif";
      ctx.fillStyle = "#333";

      meta.data.forEach((bar, i) => {
        const val = Number(dataset.data[i]);
        if (!isFinite(val)) return;
        const lf = (val / prated) * 100;
        const x = bar.x;
        let y = bar.y - 4;
        if (y < chartArea.top + 6) y = chartArea.top + 6;
        ctx.fillText(`${lf.toFixed(0)}%`, x, y);
      });

      ctx.restore();
    }
  };

  // --- Inizializza Chart ---
  function initChart() {
    const ctx = document.getElementById("kwChart");
    if (!ctx || typeof Chart === "undefined") return null;

    const points = loadPoints();

    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: points.map(p => `${p.kw.toFixed(2)} kW`),
        datasets: [
          {
            label: "Potenza media (kW)",
            data: points.map(p => p.kw),
            borderWidth: 1,
            backgroundColor: "#0078d4"
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            suggestedMax: undefined,
            max: undefined
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: c => {
                const prated = parseFloat(pratedEl?.value);
                const kw = c.parsed.y;
                if (isFinite(prated) && prated > 0) {
                  const lf = (kw / prated) * 100;
                  return `${kw.toFixed(2)} kW — LF ${lf.toFixed(0)}%`;
                }
                return `${kw.toFixed(2)} kW`;
              }
            }
          }
        },
        animation: { duration: 200 }
      },
      plugins: [lfLabelPlugin]
    });

    updateYAxisMax(chart);
    return chart;
  }

  // --- Aggiorna asse Y ---
  function updateYAxisMax(chart) {
    if (!chart) return;
    const prated = parseFloat(pratedEl?.value);
    const data = chart.data.datasets[0].data.map(Number).filter(isFinite);
    const dataMax = data.length ? Math.max(...data) : 0;

    if (isFinite(prated) && prated > 0) {
      chart.options.scales.y.max = prated;
      chart.options.scales.y.suggestedMax = undefined;
    } else {
      chart.options.scales.y.max = undefined;
      chart.options.scales.y.suggestedMax = dataMax > 0 ? dataMax * 1.1 : 10;
    }
    chart.update();
  }

  const chart = initChart();

  // --- UI actions ---
  addBtn?.addEventListener("click", () => {
    const kw = computeKW();
    if (kw == null) {
      alert("Inserisci valori validi (ore > 0, energia > 0).");
      return;
    }
    const label = `${kw.toFixed(2)} kW`;
    if (chart) {
      chart.data.labels.push(label);
      chart.data.datasets[0].data.push(kw);
      updateYAxisMax(chart);
    }
    const curr = loadPoints();
    curr.push({ kw });
    savePoints(curr);

    const prated = parseFloat(pratedEl?.value);
    let msg = `Media dei kW erogati: ${kw.toFixed(2)} kW`;
    if (isFinite(prated) && prated > 0) {
      const lf = kw / prated;
      const giudizio =
        lf < 0.3 ? " (scarico)" :
        lf < 0.5 ? " (tendenzialmente scarico)" :
        lf <= 0.8 ? " (buona fascia)" : " (alto carico)";
      msg += ` • Load factor: ${(lf * 100).toFixed(0)}%${giudizio}`;
    }
    resultEl.textContent = msg;
  });

  clearBtn?.addEventListener("click", () => {
    if (!confirm("Sicuro di svuotare il grafico?")) return;
    if (chart) {
      chart.data.labels = [];
      chart.data.datasets[0].data = [];
      updateYAxisMax(chart);
    }
    savePoints([]);
  });

  resetBtn?.addEventListener("click", () => {
    resultEl.textContent = "";
  });

  exportCSVBtn?.addEventListener("click", () => {
    const data = chart?.data?.datasets?.[0]?.data || [];
    const prated = parseFloat(pratedEl?.value);
    const rows = [["kW", "LoadFactor(%)"]];
    data.forEach(val => {
      const lf = (isFinite(prated) && prated > 0) ? (val / prated) * 100 : "";
      rows.push([val, lf === "" ? "" : lf.toFixed(0)]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mediaKW.csv";
    a.click();
    URL.revokeObjectURL(url);
  });

  exportPNGBtn?.addEventListener("click", () => {
    if (!chart) return;
    const url = chart.toBase64Image("image/png", 1.0);
    const a = document.createElement("a");
    a.href = url;
    a.download = "graficoKW.png";
    a.click();
  });

  pratedEl?.addEventListener("input", () => {
    updateYAxisMax(chart);
  });

  // --- Gestione installazione PWA ---
  let deferredPrompt;
  const installBtn = document.getElementById("installBtn");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = "inline-block";
  });

  installBtn?.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("Installazione PWA:", outcome);
    deferredPrompt = null;
    installBtn.style.display = "none";
  });
});
