// Mostrar la página solo cuando se haya cargado completamente
document.addEventListener("DOMContentLoaded", () => {
    document.body.style.display = "block";
    mostrarHistorial();
    mostrarLeaderboard();
    actualizarTotalPuntos();
});

// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBmHAy8SxcJlenJtKRYEjqFW6-cqwsZrX4",
    authDomain: "juego-de-palindromo.firebaseapp.com",
    projectId: "juego-de-palindromo",
    storageBucket: "juego-de-palindromo.firebasestorage.app",
    messagingSenderId: "1027317052342",
    appId: "1:1027317052342:web:0ac6f449f8848df8b68717",
    measurementId: "G-ZNSK9S7N1P"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Elementos del DOM
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const checkBtn = document.getElementById("check-btn");
const resultElement = document.getElementById("result");
const currentUserSpan = document.getElementById("current-user"); // Si se agrega en HTML
let usuarioActual = null;
let diccionarioEspanol = new Set();

// Elementos del modal para seleccionar nombre de usuario
const usernameModal = document.getElementById("username-modal");
const usernameInput = document.getElementById("username-input");
const saveUsernameBtn = document.getElementById("save-username-btn");

// Manejo del botón para cambiar el nombre de usuario
const changeUsernameBtn = document.getElementById("change-username-btn");

// Mostrar el modal para cambiar nombre
changeUsernameBtn.addEventListener("click", () => {
    if (!usuarioActual) {
        alert("Debes iniciar sesión primero.");
        return;
    }
    mostrarSelectorDeUsuario();
});

// Función corregida para mostrar el modal
function mostrarSelectorDeUsuario() {
    usernameModal.classList.add("show"); // Usa la clase CSS para manejar la visibilidad
}

// Guardar nuevo nombre desde el modal
saveUsernameBtn.addEventListener("click", async () => {
    let nuevoNombre = usernameInput.value.trim();
    if (nuevoNombre && usuarioActual) {
        try {
            // Actualizar nombre en Firebase Authentication
            await updateProfile(auth.currentUser, { displayName: nuevoNombre });

            // Actualizar TODOS los registros en Firestore con el nuevo nombre
            const q = query(collection(db, "puntajes"), where("usuario", "==", usuarioActual.uid));
            const qs = await getDocs(q);

            qs.forEach(async (docSnap) => {
                const docRef = doc(db, "puntajes", docSnap.id);
                await updateDoc(docRef, { nombre: nuevoNombre });
            });

            alert(`Nombre actualizado a: ${nuevoNombre}`);
            usernameModal.classList.remove("show"); // Ocultar modal después de guardar
            actualizarUI();
        } catch (error) {
            console.error("Error al actualizar el nombre:", error);
        }
    } else {
        alert("Por favor, ingresa un nombre de usuario.");
    }
});

// Cargar diccionarios desde SpanishBFF_0_2.json y nombres.json
async function cargarDiccionario() {
    try {
        let respPalabras = await fetch("diccionario_es.json");
        let datosPalabras = await respPalabras.json();
        let respNombres = await fetch("nombres.json");
        let datosNombres = await respNombres.json();
        
        // Agregar cada palabra (lemma) del primer archivo, normalizada
        datosPalabras.forEach(entry => diccionarioEspanol.add(normalizarPalabra(entry.lemma)));
        // Agregar apellidos y nombres del segundo archivo, normalizados
        datosNombres.lastname.forEach(apellido => diccionarioEspanol.add(normalizarPalabra(apellido)));
        datosNombres.femalename.forEach(nombre => diccionarioEspanol.add(normalizarPalabra(nombre)));
        datosNombres.malename.forEach(nombre => diccionarioEspanol.add(normalizarPalabra(nombre)));
        
        // Agregar manualmente palabras faltantes
let palabrasFaltantes = ["oso", "radar", "reconocer", "anita", "lava", "la", "tina", "somos", "oro", "salas","Neuquen", "solos", "se", "es", "zorra"];
        palabrasFaltantes.forEach(palabra => diccionarioEspanol.add(normalizarPalabra(palabra)));
        
        console.log("Diccionario cargado con", diccionarioEspanol.size, "entradas.");
    } catch (error) {
        console.error("Error al cargar los diccionarios:", error);
    }
}
cargarDiccionario();

// Funciones de normalización
// Para validar cada palabra (mantiene espacios fuera)
function normalizarPalabra(texto) {
    return texto.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zñ]/gi, "");
}
// Para normalizar una frase completa (eliminando espacios) para duplicados y palíndromos
function normalizarFrase(texto) {
    return texto.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zñ]/gi, "");
}

// Manejo de sesión
loginBtn.addEventListener("click", async () => {
    try {
        const res = await signInWithPopup(auth, provider);
        usuarioActual = res.user;
        // Si no tiene nombre de usuario, mostrar el modal
        if (!usuarioActual.displayName || usuarioActual.displayName === "") {
            mostrarSelectorDeUsuario();
        }
        actualizarUI();
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
    }
});

logoutBtn.addEventListener("click", async () => {
    try {
        await signOut(auth);
        usuarioActual = null;
        actualizarUI();
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
});

onAuthStateChanged(auth, (user) => {
    usuarioActual = user;
    if (usuarioActual && (!usuarioActual.displayName || usuarioActual.displayName === "")) {
        mostrarSelectorDeUsuario();
    }
    actualizarUI();
});

// Actualizar la interfaz: mostrar usuario actual y opciones
function actualizarUI() {
    if (usuarioActual) {
        loginBtn.style.display = "none";
        logoutBtn.style.display = "block";
        // Mostrar usuario actual
        if (currentUserSpan) {
            currentUserSpan.innerText = `Usuario: ${usuarioActual.displayName}`;
        }
    } else {
        loginBtn.style.display = "block";
        logoutBtn.style.display = "none";
        if (currentUserSpan) {
            currentUserSpan.innerText = "Usuario: -";
        }
    }
    mostrarHistorial();
    actualizarTotalPuntos();
    mostrarLeaderboard();
}

// Verificar duplicados: si usuario autenticado, consultar Firestore; si no, usar sessionStorage
async function esDuplicado(fraseNormalizada) {
    if (usuarioActual) {
        const q = query(collection(db, "puntajes"), 
                        where("usuario", "==", usuarioActual.uid), 
                        where("palindromo_normalizado", "==", fraseNormalizada));
        const qs = await getDocs(q);
        return !qs.empty;
    } else {
        let historial = JSON.parse(sessionStorage.getItem("historial")) || [];
        return historial.some(entry => normalizarFrase(entry.palindromo) === fraseNormalizada);
    }
}

// Verificación de palíndromos y guardado de puntajes
checkBtn.addEventListener("click", async () => {
    let inputElement = document.getElementById("text-input");
    let textoOriginal = inputElement.value.trim();
    if (!textoOriginal) {
        alert("Por favor, ingresa un valor.");
        return;
    }
    
    // Separar en palabras y normalizarlas individualmente para validar contra el diccionario
    let palabrasOriginal = textoOriginal.split(" ");
    let palabrasNormalizadas = palabrasOriginal.map(word => normalizarPalabra(word));
    
    // Verificar palabras repetidas seguidas
    for (let i = 1; i < palabrasNormalizadas.length; i++) {
        if (palabrasNormalizadas[i] === palabrasNormalizadas[i - 1]) {
            resultElement.innerText = `"${textoOriginal}" contiene palabras repetidas seguidas y no es válido.`;
            resultElement.style.color = "white";
            return;
        }
    }
    
    // Verificar que cada palabra normalizada esté en el diccionario
    let invalidas = palabrasNormalizadas.filter(word => !diccionarioEspanol.has(word));
    if (invalidas.length > 0) {
        resultElement.innerText = `Palabras no válidas: ${invalidas.join(", ")}`;
        resultElement.style.color = "white";
        return;
    }
    
    // Para duplicados y verificación de palíndromo, usar la versión normalizada de la frase (sin espacios)
    let fraseNormalizada = normalizarFrase(textoOriginal);
    if (await esDuplicado(fraseNormalizada)) {
        resultElement.innerText = `"${textoOriginal}" ya ha sido utilizado y no otorga puntos adicionales.`;
        resultElement.style.color = "white";
        return;
    }
    
    // Unir las palabras normalizadas sin espacios
    let fraseCompacta = palabrasNormalizadas.join("");
    let fraseReversa = fraseCompacta.split("").reverse().join("");
    
    if (fraseCompacta === fraseReversa) {
        let puntaje = fraseCompacta.length;
        await guardarPuntaje(textoOriginal, puntaje, fraseNormalizada);
        resultElement.innerText = `"${textoOriginal}" es un palíndromo válido. Puntos: ${puntaje}`;
        resultElement.style.color = "white";
    } else {
        resultElement.innerText = `"${textoOriginal}" no es un palíndromo.`;
        resultElement.style.color = "white";
    }
});

// Guardar puntaje en Firestore o sessionStorage
async function guardarPuntaje(palindromo, puntaje, palindromo_normalizado) {
    if (usuarioActual) {
        await addDoc(collection(db, "puntajes"), {
            usuario: usuarioActual.uid,
            nombre: usuarioActual.displayName,
            palindromo,
            palindromo_normalizado,
            puntaje,
            fecha: new Date().toISOString()
        });
        mostrarHistorial();
        actualizarTotalPuntos();
        mostrarLeaderboard();
    } else {
        let nuevoRegistro = { palindromo, puntaje, fecha: new Date().toLocaleString() };
        let historial = JSON.parse(sessionStorage.getItem("historial")) || [];
        historial.push(nuevoRegistro);
        sessionStorage.setItem("historial", JSON.stringify(historial));
        mostrarHistorial();
    }
}

// Mostrar historial de puntajes
async function mostrarHistorial() {
    let historialElement = document.getElementById("historial");
    if (usuarioActual) {
        const q = query(collection(db, "puntajes"), where("usuario", "==", usuarioActual.uid));
        const qs = await getDocs(q);
        let html = "<h2>Historial de Puntajes</h2>";
        qs.forEach(doc => {
            const data = doc.data();
            html += `<p>${data.fecha} - "${data.palindromo}" - ${data.puntaje} puntos</p>`;
        });
        historialElement.innerHTML = html;
    } else {
        let historial = JSON.parse(sessionStorage.getItem("historial")) || [];
        let html = "<h2>Historial de Puntajes</h2>";
        historial.forEach(entry => {
            html += `<p>${entry.fecha} - "${entry.palindromo}" - ${entry.puntaje} puntos</p>`;
        });
        historialElement.innerHTML = html;
    }
}

// Actualizar total de puntos para usuarios autenticados
async function actualizarTotalPuntos() {
    const totalPointsElement = document.getElementById("total-points");
    if (!usuarioActual) {
        if (totalPointsElement) totalPointsElement.innerText = "Puntos totales: 0";
        return;
    }
    try {
        const q = query(collection(db, "puntajes"), where("usuario", "==", usuarioActual.uid));
        const qs = await getDocs(q);
        let total = 0;
        qs.forEach(doc => {
            total += doc.data().puntaje;
        });
        if (totalPointsElement) {
            totalPointsElement.innerText = `Puntos totales: ${total}`;
        } else {
            const div = document.createElement("div");
            div.id = "total-points";
            div.innerText = `Puntos totales: ${total}`;
            document.querySelector(".container").appendChild(div);
        }
    } catch (error) {
        console.error("Error al actualizar puntos totales:", error);
    }
}

// Mostrar leaderboard global: tabla de puntajes record de todos los usuarios
async function mostrarLeaderboard() {
    const leaderboardElement = document.getElementById("leaderboard");
    if (!leaderboardElement) return;
    try {
        const q = query(collection(db, "puntajes"));
        const qs = await getDocs(q);
        let totales = {};
        qs.forEach(doc => {
            const data = doc.data();
            const uid = data.usuario;
            if (!totales[uid]) totales[uid] = { nombre: data.nombre, total: 0 };
            totales[uid].total += data.puntaje;
        });
        let leaderboardArray = Object.values(totales).sort((a, b) => b.total - a.total);
        let html = "<h2>Tabla de Puntajes Record</h2>";
        leaderboardArray.forEach((entry, index) => {
            html += `<p><strong>${index + 1}. ${entry.nombre}</strong> - ${entry.total} puntos</p>`;
        });
        leaderboardElement.innerHTML = html;
    } catch (error) {
        console.error("Error al mostrar el leaderboard:", error);
    }
}
