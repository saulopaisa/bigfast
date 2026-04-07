const params = new URLSearchParams(window.location.search);
const dataEncoded = params.get('p');
const figuraRaw = params.get('f'); 
const container = document.getElementById('cartones-container');

let patronGanador = figuraRaw ? figuraRaw.split(',').map(Number) : [];
let numerosCantadosGlobal = []; // Aquí se guardarán los números que salen en la ruleta

// --- 1. INICIO Y CARGA ---
window.onload = () => {
    if (!dataEncoded) {
        container.innerHTML = `<div class="error-box"><h3>⚠️ Enlace no válido</h3><p>Pide un nuevo link a tu administrador.</p></div>`;
    } else {
        try {
            if (patronGanador.length > 0) dibujarGuiaVisual(patronGanador);

            const listaCartones = JSON.parse(atob(dataEncoded));
            listaCartones.forEach(obj => {
                const matriz = generarMatrizSincronizada(obj.id);
                renderizarCarton(obj.id, obj.nombre, matriz);
            });
            
            // Iniciar el "Escuchador" de números cantados (Simulación de tiempo real)
            iniciarPanelHistorial();
        } catch (e) {
            console.error(e);
            container.innerHTML = `<div class="error-box"><h3>⚠️ Error de lectura</h3></div>`;
        }
    }
};

// --- 2. GUIÁ VISUAL Y MEJORAS DE UI ---
function dibujarGuiaVisual(indices) {
    const guia = document.createElement('div');
    guia.className = "guia-flotante";
    guia.style = "background:rgba(255,255,255,0.1); padding:10px; border-radius:10px; margin-bottom:20px; text-align:center; border: 1px solid var(--accent-gold);";
    guia.innerHTML = `
        <p style="color:#ffb703; font-size:0.7rem; margin:0 0 5px 0; font-weight:bold;">OBJETIVO:</p>
        <div style="display:grid; grid-template-columns:repeat(5, 12px); gap:2px; justify-content:center;">
            ${Array.from({length: 25}).map((_, i) => `
                <div style="width:12px; height:12px; border:1px solid #555; background:${indices.includes(i) ? '#ffb703' : 'transparent'}"></div>
            `).join('')}
        </div>`;
    document.querySelector('.header').prepend(guia);
}

// Crea una pequeña barra que muestra los últimos números cantados
function iniciarPanelHistorial() {
    const header = document.querySelector('.header');
    const panel = document.createElement('div');
    panel.id = "historial-vivo";
    panel.style = "margin-top:10px; min-height:40px; display:flex; gap:5px; justify-content:center; flex-wrap:wrap;";
    header.appendChild(panel);
}

// --- 3. MOTOR LOGICO (SINCRONIZADO) ---
function generarMatrizSincronizada(id) {
    const seedBase = parseInt(id);
    const rangos = [[1,15],[16,30],[31,45],[46,60],[61,75]];
    const columnas = rangos.map((r, indexCol) => {
        let n = []; 
        for(let i=r[0]; i<=r[1]; i++) n.push(i);
        return shuffleDeterminista([...n], seedBase + indexCol).slice(0, 5);
    });

    let matrizFilas = [];
    for(let f=0; f<5; f++) {
        let fila = [];
        for(let c=0; c<5; c++) {
            fila.push((f === 2 && c === 2) ? "FREE" : columnas[c][f]);
        }
        matrizFilas.push(fila);
    }
    return matrizFilas;
}

function shuffleDeterminista(array, seed) {
    let m = array.length, t, i;
    while (m) {
        i = Math.floor(Math.abs(Math.sin(seed++)) * m--);
        t = array[m]; array[m] = array[i]; array[i] = t;
    }
    return array;
}

// --- 4. RENDER Y MARCADO ---
function renderizarCarton(id, nombre, matriz) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'carton-card';
    cardDiv.id = `carton-${id}`;

    let tableHTML = `
        <div class="info-jugador">
            <span class="nombre">${nombre.toUpperCase()}</span>
            <span class="id-txt">№ ${id.toString().padStart(3, '0')}</span>
        </div>
        <table>
            <tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>
    `;

    matriz.flat().forEach((celda, index) => {
        if (index % 5 === 0) tableHTML += `<tr>`;
        if (celda === "FREE") {
            tableHTML += `<td class="free marcada" data-index="${index}">★</td>`;
        } else {
            const isMarked = localStorage.getItem(`mark_${id}_${celda}`) ? 'marcada' : '';
            tableHTML += `<td class="${isMarked}" data-index="${index}" onclick="marcarCasilla(this, '${id}', '${celda}')">${celda}</td>`;
        }
        if (index % 5 === 4) tableHTML += `</tr>`;
    });

    tableHTML += `</table>`;
    cardDiv.innerHTML = tableHTML;
    container.appendChild(cardDiv);
    verificarGanador(id);
}

function marcarCasilla(elemento, id, numero) {
    elemento.classList.toggle('marcada');
    
    // Efecto visual de "marcado"
    if (elemento.classList.contains('marcada')) {
        localStorage.setItem(`mark_${id}_${numero}`, "true");
        crearEfectoClick(elemento);
        if (navigator.vibrate) navigator.vibrate([40]);
    } else {
        localStorage.removeItem(`mark_${id}_${numero}`);
    }
    verificarGanador(id);
}

function crearEfectoClick(el) {
    el.style.transition = "0.1s";
    el.style.transform = "scale(1.2)";
    setTimeout(() => el.style.transform = "scale(0.9)", 100);
}

// --- 5. DETECCIÓN DE GANADOR Y WHATSAPP ---
function verificarGanador(id) {
    if (patronGanador.length === 0) return;

    const carton = document.getElementById(`carton-${id}`);
    const celdas = carton.querySelectorAll('td');
    
    // Comprobar si el patrón está completo
    const gano = patronGanador.every(idx => 
        celdas[idx].classList.contains('marcada') || celdas[idx].classList.contains('free')
    );

    if (gano) {
        carton.style.borderColor = "#25d366";
        carton.style.boxShadow = "0 0 20px #25d366";
        mostrarNotificacionBingo(id);
    }
}

function mostrarNotificacionBingo(id) {
    if (document.getElementById('btnBingo')) return;
    
    const btn = document.createElement('button');
    btn.id = 'btnBingo';
    btn.innerHTML = "¡CANTAR BINGO! 🏆";
    btn.style = `
        position:fixed; bottom:20px; width:90%; max-width:300px; 
        padding:20px; background:#25d366; color:white; border:none; 
        border-radius:50px; font-weight:900; font-size:1.2rem; 
        box-shadow:0 10px 20px rgba(0,0,0,0.5); z-index:9999; 
        cursor:pointer; left:50%; transform:translateX(-50%);
        animation: bounce 1s infinite;
    `;
    
    btn.onclick = () => {
        const miNumero = "584120000000"; // <--- TU WHATSAPP AQUÍ
        const texto = encodeURIComponent(`¡BINGO! 🎉 Soy ${document.querySelector('.nombre').innerText}. Mi cartón ID #${id} completó la figura. ¡Verifícame pronto!`);
        window.open(`https://wa.me/${miNumero}?text=${texto}`, '_blank');
    };
    
    document.body.appendChild(btn);
}

// --- 6. FUNCIÓN DE "TIEMPO REAL" (HISTORIAL) ---
// Agrega esta función para que el jugador pueda ver qué números han salido
// El admin puede decirle al jugador que "pegue" los números cantados
function actualizarNumerosCantados(nuevoNumero) {
    const panel = document.getElementById('historial-vivo');
    const bola = document.createElement('div');
    bola.style = `
        width:35px; height:35px; background:white; color:#1d3557;
        border-radius:50%; display:flex; align-items:center; 
        justify-content:center; font-weight:bold; border:2px solid #ffb703;
        animation: pop 0.3s ease-out;
    `;
    bola.innerText = nuevoNumero;
    panel.prepend(bola);
    if(panel.children.length > 6) panel.lastChild.remove();
}

// Animación extra para el botón
const style = document.createElement('style');
style.innerHTML = `
    @keyframes bounce {
        0%, 100% { transform: translateX(-50%) translateY(0); }
        50% { transform: translateX(-50%) translateY(-10px); }
    }
    @keyframes pop {
        0% { transform: scale(0); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
    }
    .marcada { position: relative; }
    .marcada::after {
        content: '✓';
        position: absolute;
        top: 2px; right: 2px;
        font-size: 0.6rem;
        color: rgba(29, 53, 87, 0.5);
    }
`;
document.head.appendChild(style);