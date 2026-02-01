// dbFunctions.js
import { db } from "./firebase.js"; // firebase-admin

// Guardar productos en Firestore
export async function guardarProductos(origen, productos) {
  try {
    const batch = db.batch(); // permite múltiples escrituras
    productos.forEach((producto) => {
      const docRef = db.collection("productos").doc(); // ID automático
      batch.set(docRef, {
        origen, // Coto o Carrefour
        nombre: producto.nombre,
        precio: producto.precio,
        imagen: producto.imagen || "",
        url: producto.url || "", // <-- Agregado
        fecha: new Date().toISOString()
      });
    });
    await batch.commit();
    console.log(`✅ Guardados ${productos.length} productos de ${origen} en Firestore`);
  } catch (error) {
    console.error("❌ Error guardando en Firestore:", error);
  }
}

// Obtener todos los productos
export async function obtenerProductos() {
  try {
    const snapshot = await db.collection("productos").get();
    const productos = [];
    snapshot.forEach((doc) => {
      productos.push({ id: doc.id, ...doc.data() });
    });
    return productos;
  } catch (error) {
    console.error("❌ Error leyendo de Firestore:", error);
    return [];
  }
}

// Buscar productos por nombre (match parcial)
export async function buscarProductos(q) {
  try {
    const snapshot = await db.collection("productos").get();
    const resultados = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.nombre.toLowerCase().includes(q.toLowerCase())) {
        resultados.push({
          id: doc.id,
          nombre: data.nombre,
          precio: data.precio,
          origen: data.origen,
          fecha: data.fecha,
          imagen: data.imagen || "",
          url: data.url || ""
        });
      }
    });
    return resultados;
  } catch (error) {
    console.error("❌ Error buscando en Firestore:", error);
    return [];
  }
}
