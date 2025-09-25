(function(){
label: "Potenza media (kW)",
data: initial.map(p => p.kw),
borderWidth: 1
}]
},
options: {
responsive: true,
scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
plugins: {
legend: { display: true },
tooltip: { callbacks: { label: ctx => `${ctx.parsed.y.toFixed(2)} kW` } }
}
}
});


function calc() {
const ore = parseFloat(oreEl.value);
const energia = parseFloat(energiaEl.value);
if (!isFinite(ore) || !isFinite(energia)) {
risultatoEl.textContent = "Inserisci valori validi per entrambe le caselle.";
addBtn.disabled = true;
return null;
}
if (ore <= 0) {
risultatoEl.textContent = "Il tempo (ore) deve essere maggiore di zero.";
addBtn.disabled = true;
return null;
}
const kw = energia / ore; // kWh / h = kW
risultatoEl.textContent = `Media dei kW erogati: ${kw.toFixed(2)} kW`;
addBtn.disabled = false;
return kw;
}


form.addEventListener("submit", (e) => {
e.preventDefault();
calc();
});


document.getElementById("reset-form").addEventListener("click", () => {
risultatoEl.textContent = "";
addBtn.disabled = true;
});


addBtn.addEventListener("click", () => {
const kw = calc();
if (kw == null) return;
const label = (etichettaEl.value || new Date().toLocaleString()).trim();
const dataset = chart.data.datasets[0];
chart.data.labels.push(label);
dataset.data.push(kw);
chart.update();


const current = loadData();
current.push({ label, kw });
saveData(current);


etichettaEl.value = "";
addBtn.disabled = true;
});


clearBtn.addEventListener("click", () => {
if (!confirm("Sicuro di svuotare il grafico?")) return;
chart.data.labels = [];
chart.data.datasets[0].data = [];
chart.update();
saveData([]);
});
})();