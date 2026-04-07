// --- 1. VARIABLES DE ESTADO ---
let drawnNumbers = [];
let patronPersonalizado = [];
let ganadoresDetectados = new Set();
let baseDatosCartones = JSON.parse(localStorage.getItem('bingo_cartones')) || [];

const drawBtn = document.getElementById('drawBtn');
const modal = document.getElementById('modalPatron');
const gridSeleccion = document.getElementById('gridSeleccion');
const textoGanadores = document.getElementById('textoGanadores');
const recentList = document.getElementById('recentList');
const countDisplay = document.getElementById('contadorCartonesReal');

// --- 2. INICIALIZACIÓN ---
window.onload = () => {
    if (baseDatosCartones.length < 2) {
        document.body.innerHTML = `
            <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#1d3557; color:white; text-align:center; font-family:sans-serif; padding:20px;">
                <h1 style="color:#ffb703; font-size:3rem; margin-bottom:10px;">⚠️ ¡FALTAN JUGADORES!</h1>
                <p style="font-size:1.5rem; max-width:600px;">Necesitas al menos <b>2 cartones</b> registrados para jugar.</p>
                <a href="generar.html" style="padding:15px 40px; background:#e63946; color:white; text-decoration:none; border-radius:10px; font-weight:900;">← IR A CONFIGURAR</a>
            </div>
        `;
        return;
    }
    generarTableroDerecho();
    crearCuadriculaDibujo();
    actualizarContadorCartones();
    modal.style.display = "flex";
};

function actualizarContadorCartones() {
    if (countDisplay) countDisplay.innerText = `JUGANDO: ${baseDatosCartones.length}`;
}

function generarTableroDerecho() {
    const grid = document.getElementById('historyGrid');
    grid.innerHTML = "";
    for (let i = 1; i <= 75; i++) {
        const slot = document.createElement('div');
        slot.className = 'ball-slot';
        slot.id = `slot-${i}`;
        slot.innerText = i;
        grid.appendChild(slot);
    }
}

function crearCuadriculaDibujo() {
    gridSeleccion.innerHTML = "";
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'select-cell';
        if (i === 12) { 
            cell.classList.add('free-node', 'selected');
            cell.innerHTML = "★";
        } else {
            cell.onclick = () => cell.classList.toggle('selected');
        }
        gridSeleccion.appendChild(cell);
    }
}

// --- 3. PATRONES ---
function aplicarPreset(tipo) {
    limpiarSeleccion();
    const celdas = document.querySelectorAll('.select-cell');
    let indices = [];
    switch(tipo) {
        case 'lleno': indices = Array.from({length: 25}, (_, i) => i); break;
        case 'cuadro': indices = [0,1,2,3,4, 5,9, 10,14, 15,19, 20,21,22,23,24]; break;
        case 'x': indices = [0,6,12,18,24, 4,8,16,20]; break;
        case 's': indices = [0,1,2,3,4, 5, 10,11,12,13,14, 19, 20,21,22,23,24]; break;
    }
    indices.forEach(idx => celdas[idx].classList.add('selected'));
}

function limpiarSeleccion() {
    document.querySelectorAll('.select-cell').forEach((c, i) => { if(i !== 12) c.classList.remove('selected'); });
}

document.getElementById('btnConfirmarPatron').onclick = () => {
    const seleccionadas = document.querySelectorAll('.select-cell.selected');
    if (seleccionadas.length <= 1) return alert("Dibuja un patrón primero.");
    patronPersonalizado = Array.from(document.querySelectorAll('.select-cell')).map((cell, index) => cell.classList.contains('selected') ? index : null).filter(val => val !== null);
    modal.style.display = "none";
    drawBtn.disabled = false;
    document.getElementById('labelPatron').innerText = "PATRÓN LISTO ✅";
};

// --- 4. SORTEO ---
drawBtn.onclick = () => {
    if (drawnNumbers.length >= 75) return;
    let num;
    do { num = Math.floor(Math.random() * 75) + 1; } while (drawnNumbers.includes(num));
    drawnNumbers.push(num);
    
    document.getElementById('currentNumber').innerText = num;
    document.getElementById('currentLetter').innerText = getLetra(num);
    document.getElementById(`slot-${num}`).classList.add('active');
    document.getElementById('count').innerText = drawnNumbers.length;

    actualizarRecientes();
    escanearCartonesRadar();
};

function getLetra(n) {
    if (n <= 15) return 'B'; if (n <= 30) return 'I';
    if (n <= 45) return 'N'; if (n <= 60) return 'G'; return 'O';
}

function actualizarRecientes() {
    const ultimos = drawnNumbers.slice(-6, -1).reverse();
    recentList.innerHTML = ultimos.map(n => `<div class="recent-ball">${n}</div>`).join("");
}

// --- 5. RADAR Y VERIFICACIÓN (SINCRONIZADO) ---
function escanearCartonesRadar() {
    let huboGanador = false;
    baseDatosCartones.forEach(cartonInfo => {
        if (ganadoresDetectados.has(cartonInfo.id)) return;
        const matriz = generarMatrizCarton(cartonInfo.id);
        if (validarBingo(matriz, patronPersonalizado, drawnNumbers)) {
            ganadoresDetectados.add(cartonInfo.id);
            huboGanador = true;
        }
    });
    if (huboGanador) actualizarTextoRadar();
}

function actualizarTextoRadar() {
    const ids = Array.from(ganadoresDetectados);
    if (ids.length === 0) {
        textoGanadores.innerText = "Esperando grito de Bingo...";
        return;
    }
    textoGanadores.innerHTML = ids.map(id => {
        const p = baseDatosCartones.find(c => c.id === id);
        return `<span class="highlight-id" onclick="verRapido(${id})" style="display:inline-block; background:rgba(255,183,3,0.2); padding:4px 10px; border-radius:8px; cursor:pointer; border:1px solid #ffb703; margin:4px; font-weight:bold; color:#ffb703;">🏆 ${p ? p.apodo : 'Jugador'} (#${id})</span>`;
    }).join("");
}

function verRapido(id) {
    document.getElementById('idABuscar').value = id;
    verificarManual();
}

document.getElementById('btnVerificar').onclick = verificarManual;

function verificarManual() {
    const idEntrada = parseInt(document.getElementById('idABuscar').value);
    const cartonInfo = baseDatosCartones.find(c => c.id === idEntrada);
    if (!cartonInfo) return alert("ID no encontrado.");
    const matriz = generarMatrizCarton(idEntrada);
    const win = validarBingo(matriz, patronPersonalizado, drawnNumbers);
    renderMiniatura(idEntrada, cartonInfo.apodo, matriz, win, document.getElementById('areaVerificacion'));
}

function validarBingo(matrix, indices, cantados) {
    const flat = matrix.flat();
    return indices.every(idx => flat[idx] === "FREE" || cantados.includes(flat[idx]));
}

// --- 6. EL MOTOR SINCRO (ESTO ES LO QUE ARREGLA TODO) ---
function generarMatrizCarton(id) {
    const seedBase = parseInt(id);
    const rangos = [[1,15],[16,30],[31,45],[46,60],[61,75]];
    
    // Sincronización idéntica al Admin y al Jugador
    const columnas = rangos.map((r, indexCol) => {
        let n = []; for(let i=r[0]; i<=r[1]; i++) n.push(i);
        return shuffle([...n], seedBase + indexCol).slice(0, 5);
    });

    let m = [];
    for(let r=0; r<5; r++) {
        let fila = [];
        for(let c=0; c<5; c++) fila.push((r===2 && c===2) ? "FREE" : columnas[c][r]);
        m.push(fila);
    }
    return m;
}

function shuffle(array, seed) {
    let m = array.length, t, i;
    while (m) {
        i = Math.floor(Math.abs(Math.sin(seed++)) * m--);
        t = array[m]; array[m] = array[i]; array[i] = t;
    }
    return array;
}

function renderMiniatura(id, apodo, matrix, win, container) {
    let html = `<div style="background:white; padding:15px; border-radius:15px; border:4px solid ${win?'#ffb703':'#334155'}; box-shadow:0 10px 20px rgba(0,0,0,0.2); color:#1d3557;">`;
    html += `<div style="background:${win?'#ffb703':'#1d3557'}; color:${win?'#1d3557':'white'}; font-weight:900; text-align:center; padding:8px; margin:-15px -15px 10px -15px; border-radius:10px 10px 0 0;">${win?'🎉 GANADOR: '+apodo.toUpperCase():'ID: '+id+' - '+apodo.toUpperCase()}</div>`;
    html += `<table style="width:100%; border-collapse:collapse; text-align:center;"><tr>`;
    ['B','I','N','G','O'].forEach(l => html += `<td style="background:#1d3557; color:white; font-size:0.8rem; font-weight:bold; border:1px solid #ddd;">${l}</td>`);
    html += `</tr>`;
    matrix.forEach(fila => {
        html += "<tr>";
        fila.forEach(celda => {
            const hit = (celda === "FREE" || drawnNumbers.includes(celda));
            html += `<td style="border:1px solid #e2e8f0; padding:6px; font-size:0.9rem; font-weight:bold; background:${hit?'#ffb703':'transparent'}; color:${hit?'#1d3557':'#64748b'};">${celda==='FREE'?'★':celda}</td>`;
        });
        html += "</tr>";
    });
    html += `</table></div>`;
    container.innerHTML = html;
}

document.getElementById('resetBtn').onclick = () => { if(confirm("¿Reiniciar partida?")) location.reload(); };
document.getElementById('btnAbrirConfig').onclick = () => { modal.style.display = "flex"; };