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

  const tbody = document.getElementById("dataTableBody");

  const STORAGE_KEY = "mediaKW:data";

  // -------- Storage --------
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

  // -------- Helpers --------
  function computeKW() {
    const ore = parseFloat(oreEl?.value);
    const energia = parseFloat(energiaEl?.value);
    if (!isFinite(ore) || !isFinite(energia) || ore <= 0) return null;
    return energia / ore;
  }

  function getPRated() {
    const v = parseFloat(pratedEl?.value);
    return isFinite(v) && v > 0 ? v : null;
  }

  function makeLabel(kw, seriale) {
    const k = `${kw.toFixed(2)} kW`;
    const s = (seriale || "").trim();
    return s ? `${s} – ${k}` : k;
  }

  // -------- Plugin LF% sopra barra --------
  const lfLabelPlugin = {
    id: "lfLabelPlugin",
    afterDatasetsDraw(chart) {
      const prated = getPRated();
      if (!prated) return;

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

  // -------- Chart init --------
  function initChart() {
    const ctx = document.getElementById("kwChart");
    if (!ctx || typeof Chart === "undefined") return null;

    const points = loadPoints();

    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: points.map(p => makeLabel(p.kw, p.seriale)),
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
                const prated = getPRated();
                const kw = c.parsed.y;
                if (prated) {
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

    const prated = getPRated();
    const data = chart.data.datasets[0].data.map(Number).filter(isFinite);
    const dataMax = data.length ? Math.max(...data) : 0;

    if (prated) {
      chart.options.scales.y.max = prated;
      chart.options.scales.y.suggestedMax = undefined;
    } else {
      chart.options.scales.y.max = undefined;
      chart.options.scales.y.suggestedMax = dataMax > 0 ? dataMax * 1.1 : 10;
    }
    chart.update();
  }

  const chart = initChart();

  // -------- Table render --------
  function renderTable(points) {
    if (!tbody) return;
    const prated = getPRated();

    tbody.innerHTML = "";
    points.forEach((p, idx) => {
      const tr = document.createElement("tr");

      const tdS = document.createElement("td");
      tdS.textContent = p.seriale || "—";

      const tdKW = document.createElement("td");
      tdKW.textContent = p.kw.toFixed(2);

      const tdLF = document.createElement("td");
      if (prated) {
        const lf = (p.kw / prated) * 100;
        tdLF.textContent = lf.toFixed(0);
      } else {
        tdLF.textContent = "—";
      }

      const tdA = document.createElement("td");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn danger no-export";
      btn.textContent = "Elimina";
      btn.style.padding = "6px 10px";
      btn.addEventListener("click", () => deleteRow(idx));
      tdA.appendChild(btn);

      tr.appendChild(tdS);
      tr.appendChild(tdKW);
      tr.appendChild(tdLF);
      tr.appendChild(tdA);

      tbody.appendChild(tr);
    });
  }

  function syncChartFromPoints(points) {
    if (!chart) return;
    chart.data.labels = points.map(p => makeLabel(p.kw, p.seriale));
    chart.data.datasets[0].data = points.map(p => p.kw);
    updateYAxisMax(chart);
  }

  function deleteRow(index) {
    const points = loadPoints();
    if (index < 0 || index >= points.length) return;
    points.splice(index, 1);
    savePoints(points);
    syncChartFromPoints(points);
    renderTable(points);
  }

  // Render iniziale
  renderTable(loadPoints());

  // -------- Actions --------
  addBtn?.addEventListener("click", () => {
    const kw = computeKW();
    if (kw == null) {
      alert("Inserisci valori validi (ore > 0, energia > 0).");
      return;
    }

    const seriale = (serialeEl?.value || "").trim();
    const points = loadPoints();
    points.push({ kw, seriale });
    savePoints(points);

    syncChartFromPoints(points);
    renderTable(points);

    const prated = getPRated();
    let msg = `Media dei kW erogati: ${kw.toFixed(2)} kW`;
    if (seriale) msg += ` • Seriale: ${seriale}`;
    if (prated) {
      const lfRatio = kw / prated;
      const lfPct = lfRatio * 100;
      const giudizio =
        lfRatio < 0.3 ? " (scarico)" :
        lfRatio < 0.5 ? " (tendenzialmente scarico)" :
        lfRatio <= 0.8 ? " (buona fascia)" : " (alto carico)";
      msg += ` • Load factor: ${lfPct.toFixed(0)}%${giudizio}`;
    }
    resultEl.textContent = msg;
  });

  clearBtn?.addEventListener("click", () => {
    if (!confirm("Sicuro di svuotare grafico e tabella?")) return;
    savePoints([]);
    syncChartFromPoints([]);
    renderTable([]);
  });

  resetBtn?.addEventListener("click", () => {
    resultEl.textContent = "";
  });

  exportCSVBtn?.addEventListener("click", () => {
    const prated = getPRated();
    const points = loadPoints();

    const rows = [["Seriale", "kW", "LoadFactor(%)"]];
    points.forEach(p => {
      const lf = prated ? (p.kw / prated) * 100 : "";
      rows.push([p.seriale || "", p.kw.toFixed(2), lf === "" ? "" : lf.toFixed(0)]);
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

    exportPNGBtn?.addEventListener("click", async () => {
    const exportArea = document.getElementById("exportArea");
    if (!exportArea) return;

    if (typeof html2canvas === "undefined") {
      alert("html2canvas non è caricato. Controlla lo script CDN.");
      return;
    }

    // Nasconde elementi marcati .no-export (pulsanti + colonna azioni)
    document.body.classList.add("is-exporting");
    await new Promise((r) => setTimeout(r, 50));

    const canvas = await html2canvas(exportArea, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true
    });

    document.body.classList.remove("is-exporting");

    const url = canvas.toDataURL("image/png", 1.0);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report_mediaKW.png";
    a.click();
  });


  pratedEl?.addEventListener("input", () => {
    const points = loadPoints();
    updateYAxisMax(chart);
    renderTable(points);
  });

  // -------- Installazione PWA --------
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
