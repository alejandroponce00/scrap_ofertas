// server.js
import express from "express";
import cors from "cors";
import { obtenerProductos, buscarProductos, obtenerUltimaActualizacion } from "./dbFunctions.js";

const app = express();
const PORT = 4000;

app.use(cors());

// ✅ Obtener todos los productos
app.get("/productos", async (req, res) => {
  try {
    const productos = await obtenerProductos();
    res.json(productos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ✅ Buscar productos por nombre (?q=cerveza)
app.get("/productos/buscar", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }
    const productos = await buscarProductos(q);
    res.json(productos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ✅ Obtener fecha de última actualización
app.get("/ultima-actualizacion", async (req, res) => {
  try {
    console.log("Petición recibida a /ultima-actualizacion");
    const ultimaActualizacion = await obtenerUltimaActualizacion();
    console.log("Datos de última actualización:", ultimaActualizacion);
    
    // Asegurar que siempre se envíe JSON válido
    res.setHeader('Content-Type', 'application/json');
    res.json(ultimaActualizacion || { fecha: null, timestamp: null });
  } catch (e) {
    console.error("❌ Error en endpoint /ultima-actualizacion:", e);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      error: e.message, 
      fecha: null, 
      timestamp: null 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API corriendo en http://localhost:${PORT}`);
});
