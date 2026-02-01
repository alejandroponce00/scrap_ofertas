import dotenv from "dotenv";
dotenv.config();

import admin from "firebase-admin";

// ✅ Parsear credencial desde secret de GitHub
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT no está definido en las variables de entorno");
}
// filepath: /Users/alejandroponce/Desktop/proyectos/Scrap-Ofertas/scrap_ofertas-back/firebase.js

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
console.log("Valor de FIREBASE_SERVICE_ACCOUNT:", process.env.FIREBASE_SERVICE_ACCOUNT);

// Arreglar saltos de línea de la private key
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
}

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Funciones de uso general
async function leerColeccion(nombreColeccion) {
  const snapshot = await db.collection(nombreColeccion).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function agregarDocumento(nombreColeccion, datos) {
  const docRef = await db.collection(nombreColeccion).add(datos);
  return docRef.id;
}

async function actualizarDocumento(nombreColeccion, docId, nuevosDatos) {
  await db.collection(nombreColeccion).doc(docId).update(nuevosDatos);
}

async function eliminarDocumento(nombreColeccion, docId) {
  await db.collection(nombreColeccion).doc(docId).delete();
}

export { db, leerColeccion, agregarDocumento, actualizarDocumento, eliminarDocumento };
