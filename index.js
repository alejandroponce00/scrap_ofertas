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

// Scrapping de Stock Center
async function scrapearStockCenter() {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  await page.goto("https://www.stockcenter.com.ar/ofertas", { waitUntil: "networkidle2", timeout: isDev ? 60000 : 30000 });

  // Cerrar modal de código postal si aparece
  try {
    await page.waitForSelector('.close-img', { timeout: 7000 });
    await page.click('.close-img');
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {
    // Si no aparece, continuar
  }

  // Aceptar cookies si aparece el botón
  try {
    await page.waitForSelector('button#onetrust-accept-btn-handler, button[mode="primary"]', { timeout: 7000 });
    await page.evaluate(() => {
      const btn = document.querySelector('button#onetrust-accept-btn-handler') || document.querySelector('button[mode="primary"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {
    // Si no aparece, continuar
  }
// Agregar después de línea 101 (antes del waitForSelector)

  // Esperar a que carguen los productos
  await page.waitForSelector('.product-tile', { timeout: isDev ? 60000 : 30000 });

  // Scroll automático para cargar hasta 100 productos como máximo
  let previousHeight = 0;
  let sameCount = 0;
  let maxProductos = 100;
  for (let i = 0; i < 20; i++) {
    const currentHeight = await page.evaluate('document.body.scrollHeight');
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await new Promise(r => setTimeout(r, 1200));
    await new Promise(r => setTimeout(r, 1200));
    const newCount = await page.evaluate(() => document.querySelectorAll('.product-tile').length);
    if (newCount >= maxProductos) break;
    if (newCount === previousHeight) {
      sameCount++;
      if (sameCount > 2) break;
    } else {
      sameCount = 0;
    }
    previousHeight = newCount;
  }

  const productos = await page.evaluate(() => {
    const cards = document.querySelectorAll('.product-tile');
    console.log(`Cards encontrados: ${cards.length}`);
    
    return Array.from(cards).slice(0, 100).map((card, index) => {
      const linkEl = card.querySelector('.pdp-link .link');
      const nombre = linkEl?.getAttribute('title')?.trim() || linkEl?.innerText?.trim() || "";
      let url = linkEl?.getAttribute('href') || "";
      if (url.startsWith('/')) url = 'https://www.stockcenter.com.ar' + url;

      // Debug: mostrar qué se está extrayendo
      console.log(`Card ${index}: nombre="${nombre}", url="${url}"`);

      // Extraer precio del input.productGtmData
      let precio = "";
      try {
        const precioInput = card.querySelector('.productGtmData');
        if (precioInput) {
          const precioData = JSON.parse(precioInput.value || '{}');
          precio = precioData.price || precioData.precio || "";
        }
      } catch (e) {
        // Si no se puede parsear, dejar vacío
      }

      // Imagen: buscar en image-container
      const imgEl = card.querySelector('.image-container img');
      let imagen = "";
      if (imgEl) {
        imagen = imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || "";
        if (imagen.startsWith('/')) imagen = 'https://www.stockcenter.com.ar' + imagen;
      }

      console.log(`Card ${index}: imagen="${imagen}"`);

      return { nombre, precio, imagen, url };
    });
  });

  // Debug: mostrar resultados antes del filtro
  console.log(`Productos extraídos: ${productos.length}`);
  console.log(`Primer producto:`, productos[0]);

  const productosFiltrados = productos.filter(p => p.nombre && p.imagen && p.url);
  console.log(`Productos después del filtro: ${productosFiltrados.length}`);

  console.log(`Se encontraron ${productosFiltrados.length} productos en Stock Center`);
  await guardarProductos("StockCenter", productosFiltrados);

  await browser.close();
}

// Ejecutar scrapper de Solo Deportes y Stock Center
async function main() {
 // await scrapearSoloDeportes();
  await scrapearStockCenter();
}

main();
