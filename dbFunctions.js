// dbFunctions.js
import { db } from "./firebase.js"; // firebase-admin

// Borrar productos por origen antes de guardar nuevos
export async function borrarProductosPorOrigen(origen) {
  try {
    const snapshot = await db.collection("productos").where("origen", "==", origen).get();
    if (snapshot.empty) {
      console.log(`📝 No hay productos para borrar de ${origen}`);
      return 0;
    }
    
    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`🗑️ Borrados ${snapshot.size} productos de ${origen} de Firestore`);
    return snapshot.size;
  } catch (error) {
    console.error(`❌ Error borrando productos de ${origen}:`, error);
    return 0;
  }
}

// Guardar productos en Firestore
export async function guardarProductos(origen, productos) {
  try {
    // Primero borrar los productos existentes de este origen
    await borrarProductosPorOrigen(origen);
    
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
