// server.js
import express from "express";
import cors from "cors";
import { obtenerProductos, buscarProductos } from "./dbFunctions.js";

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

app.listen(PORT, () => {
  console.log(`🚀 API corriendo en http://localhost:${PORT}`);
});
