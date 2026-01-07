// scripts/app.js
window.addEventListener("DOMContentLoaded", () => {
  const oreEl = document.getElementById("ore");
  const energiaEl = document.getElementById("energia");
  const pratedEl = document.getElementById("prated");
  const serialeEl = document.getElementById("seriale");

  const addBtn = document.getElementById("addToChart");
  const clearBtn = document.getElementById("clearChart");
  const resetBtn = document.getElementById("btnReset");
  const exportCSVBtn = document.getElementById("exportCSV");
  const exportPNGBtn = document.getElementById("exportPNG");
  const resultEl = document.getElementById("risultato");

  const STORAGE_KEY = "mediaKW:data";

  // --- Storage ---
  function loadPoints() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw
        .map(p => (typeof p === "number" ? { kw: p } : p))
        .filter(p => p && isFinite(Number(p.kw)))
        .map(p => ({
          kw: Number(p.kw),
          seriale: (p.seriale || "").toString().trim()
        }));
    } catch {
      return [];
    }
  }
  function savePoints(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  // --- Calcolo media ---
  function computeKW() {
    const ore = parseFloat(oreEl?.value);
    const energia = parseFloat(energiaEl?.value);
    if (!isFinite(ore) || !isFinite(energia) || ore <= 0) return null;
    return energia / ore;
  }

  function makeLabel(kw, seriale) {
    const k = `${kw.toFixed(2)} kW`;
    const s = (seriale || "").trim();
    return s ? `${s} – ${k}` : k;
  }

  // --- Plugin Load Factor sopra barra ---
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

  // --- Chart ---
  function initChart() {
    const ctx = document.getElementById("kwChart");
    if (!ctx || typeof Chart === "undefined") return null;

    const points = loadPoints();

    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: points.map(p => makeLabel(p.kw, p.seriale)),
        datasets: [{
          label: "Potenza media (kW)",
          data: points.map(p => p.kw),
          borderWidth: 1,
          backgroundColor: "#0078d4"
        }]
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

  // --- Actions ---
  addBtn?.addEventListener("click", () => {
    const kw = computeKW();
    if (kw == null) {
      alert("Inserisci valori validi (ore > 0, energia > 0).");
      return;
    }

    const seriale = (serialeEl?.value || "").trim();
    const label = makeLabel(kw, seriale);

    if (chart) {
      chart.data.labels.push(label);
      chart.data.datasets[0].data.push(kw);
      updateYAxisMax(chart);
    }

    const curr = loadPoints();
    curr.push({ kw, seriale });
    savePoints(curr);

    // Messaggio risultato
    const prated = parseFloat(pratedEl?.value);
    let msg = `Media dei kW erogati: ${kw.toFixed(2)} kW`;
    if (seriale) msg += ` • Seriale: ${seriale}`;
    if (isFinite(prated) && prated > 0) {
      const lf = kw / prated;
      const giudizio =
        lf < 0.3 ? " (scarico)" :
        lf < 0.5 ? " (tendenzialmente scarico)" :
        lf <= 0.8 ? " (buona fascia)" : " (alto carico)";
      msg += ` • Load factor: ${(lf * 100).toFixed(0)}%${giudizio}`;
    }
    resultEl.textContent = msg;

    // opzionale: svuota seriale dopo inserimento
    // if (serialeEl) serialeEl.value = "";
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
    const prated = parseFloat(pratedEl?.value);
    const points = loadPoints();

    const rows = [["Seriale", "kW", "LoadFactor(%)"]];
    points.forEach(p => {
      const lf = (isFinite(prated) && prated > 0) ? (p.kw / prated) * 100 : "";
      rows.push([p.seriale || "", p.kw, lf === "" ? "" : lf.toFixed(0)]);
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

  pratedEl?.addEventListener("input", () => updateYAxisMax(chart));

  // --- Installazione PWA ---
  let deferredPrompt;
  const installBtn = document.getElementById("installBtn");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = "inline-block";
  });

  installBtn?.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.style.display = "none";
  });
});
