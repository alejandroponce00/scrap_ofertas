import puppeteer from "puppeteer";
import { guardarProductos } from "./dbFunctions.js";

// Detectar entorno de desarrollo o producción
const isDev = process.env.NODE_ENV !== "production";
const isGithub = process.env.GITHUB_ACTIONS === "true";

// Función helper para lanzar browser
async function launchBrowser() {
  return await puppeteer.launch({
    headless: isGithub ? true : !isDev ? true : false, // headless en GitHub Actions y producción, visible en desarrollo
    slowMo: isDev ? 50 : 0, // ralentiza acciones en desarrollo para debug
    args: isGithub || !isDev ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
  });
}

// Scrapping de Solo Deportes
async function scrapearSoloDeportes() {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  await page.goto("https://www.solodeportes.com.ar/ofertas.html", { waitUntil: "networkidle2", timeout: isDev ? 60000 : 30000 });

  // Esperar a que carguen los productos
  await page.waitForSelector('.product-item-info', { timeout: isDev ? 60000 : 30000 });

  // Scroll automático para cargar hasta 100 productos como máximo
  let previousHeight = 0;
  let sameCount = 0;
  let maxProductos = 100;
  for (let i = 0; i < 20; i++) { // máximo 20 scrolls para evitar loops infinitos
    const currentHeight = await page.evaluate('document.body.scrollHeight');
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await new Promise(r => setTimeout(r, 1200)); // espera a que carguen productos nuevos
    await new Promise(r => setTimeout(r, 1200));
    const newCount = await page.evaluate(() => document.querySelectorAll('.product-item-info').length);
    if (newCount >= maxProductos) break; // Si ya hay 100 productos, termina
    if (newCount === previousHeight) {
      sameCount++;
      if (sameCount > 2) break; // si no aparecen más productos, termina
    } else {
      sameCount = 0;
    }
    previousHeight = newCount;
  }

  const productos = await page.evaluate(() => {
    const cards = document.querySelectorAll('.product-item-info');
    return Array.from(cards).slice(0, 100).map(card => {
      const linkEl = card.querySelector('.product-item-link');
      const nombre = linkEl?.innerText.trim() || "";
      let url = linkEl?.getAttribute('href') || "";
      if (url.startsWith('/')) url = 'https://www.solodeportes.com.ar' + url;

      const precio = card.querySelector('.price')?.innerText.trim() || "";

      // Imagen: buscar cualquier .product-image-photo
      const imgEl = card.querySelector('.product-image-photo');
      let imagen = "";
      if (imgEl) {
        imagen = imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || "";
        if (imagen.startsWith('/')) imagen = 'https://www.solodeportes.com.ar' + imagen;
      }

      return { nombre, precio, imagen, url };
    }).filter(p => p.nombre && p.imagen && p.url);
  });

  console.log(`Se encontraron ${productos.length} productos en Solo Deportes`);
  await guardarProductos("SoloDeportes", productos);

  await browser.close();
}

// Ejecutar scrapper de Solo Deportes
async function main() {
  await scrapearSoloDeportes();
}

main();
