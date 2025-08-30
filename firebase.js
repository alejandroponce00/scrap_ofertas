// firebase.js
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// ✅ Si guardaste el JSON entero en una sola variable
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  // Arreglar los saltos de línea de la private key
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }
} else {
  throw new Error("FIREBASE_SERVICE_ACCOUNT no está definido en las variables de entorno");
}

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// -----------------------------
// EJEMPLOS DE USO
// -----------------------------

// Leer todos los documentos de una colección
async function leerColeccion(nombreColeccion) {
  try {
    const snapshot = await db.collection(nombreColeccion).get();
    const resultados = [];
    snapshot.forEach((doc) => {
      resultados.push({ id: doc.id, ...doc.data() });
    });
    return resultados;
  } catch (error) {
    console.error("Error leyendo de Firestore:", error);
    throw error;
  }
}

// Agregar un documento a una colección
async function agregarDocumento(nombreColeccion, datos) {
  try {
    const docRef = await db.collection(nombreColeccion).add(datos);
    console.log("Documento agregado con ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error agregando documento:", error);
    throw error;
  }
}

// Actualizar un documento por ID
async function actualizarDocumento(nombreColeccion, docId, nuevosDatos) {
  try {
    await db.collection(nombreColeccion).doc(docId).update(nuevosDatos);
    console.log("Documento actualizado:", docId);
  } catch (error) {
    console.error("Error actualizando documento:", error);
    throw error;
  }
}

// Eliminar un documento por ID
async function eliminarDocumento(nombreColeccion, docId) {
  try {
    await db.collection(nombreColeccion).doc(docId).delete();
    console.log("Documento eliminado:", docId);
  } catch (error) {
    console.error("Error eliminando documento:", error);
    throw error;
  }
}

// Exportar db y funciones útiles
export { db, leerColeccion, agregarDocumento, actualizarDocumento, eliminarDocumento };
