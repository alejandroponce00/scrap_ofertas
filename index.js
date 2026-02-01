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

// Scrapping de Coto
async function scrapearCoto() {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  await page.goto(
    "https://www.cotodigital.com.ar/sitios/cdigi/categoria/ofertas-exclusivas/_/N-1nx2iz5...",
    { waitUntil: "networkidle2", timeout: isDev ? 60000 : 30000 }
  );

  try {
    await page.waitForSelector(".nombre-producto.cursor-pointer", {
      timeout: isDev ? 60000 : 30000,
    });
  } catch {
    console.log(
      "⚠️ No se encontraron productos en Coto (selector no apareció)"
    );
    await page.screenshot({ path: "coto_debug.png", fullPage: true });
    await browser.close();
    return;
  }

  const productos = await page.evaluate(() => {
    const tarjetas = document.querySelectorAll(".card-product");
    return Array.from(tarjetas)
      .map((card) => {
        const nombre =
          card
            .querySelector(".nombre-producto.cursor-pointer")
            ?.innerText.trim() || "";
        const precio =
          card
            .querySelector(
              ".card-title.text-center.mt-1.m-0.p-0.ng-star-inserted"
            )
            ?.innerText.trim() || "";
        const imagen = card.querySelector("img")?.src || "";
        return { nombre, precio, imagen };
      })
      .filter((p) => p.nombre);
  });

  console.log(`Se encontraron ${productos.length} productos en Coto`);
  await guardarProductos("Coto", productos);

  await browser.close();
}

// Scrapping de Jumbo
async function scrapearJumbo() {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  await page.goto("https://www.jumbo.com.ar/ofertas", { waitUntil: "networkidle2", timeout: isDev ? 60000 : 30000 });

  // Aceptar cookies
  try {
    await page.waitForSelector("button#onetrust-accept-btn-handler", {
      timeout: 15000,
    });
    await page.click("button#onetrust-accept-btn-handler");
    console.log("Cookies aceptadas");
  } catch (e) {
    console.log("No se encontró el banner de cookies");
  }

  const productos = [];
  let hayMasPaginas = true;

  while (hayMasPaginas) {
    await page.waitForSelector('[data-testid="product-item"]', { timeout: isDev ? 60000 : 30000 });

    const productosPagina = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-testid="product-item"]')).map(card => {
        const nombre = card.querySelector('[data-testid="product-name"]')?.innerText.trim() || "";
        const descripcion = card.querySelector('.vtex-product-summary-2-x-productBrand.vtex-product-summary-2-x-brandName.t-body')?.innerText.trim() || "";
        const precio = card.querySelector('[data-testid="price-value"]')?.innerText.trim() || "";
        const imagen = card.querySelector('img')?.src || "";
        return { nombre, descripcion, precio, imagen };
      }).filter(p => p.nombre);
    });

    productos.push(...productosPagina);

    // Pasar a la siguiente página
    try {
      await page.waitForSelector('[data-testid="pagination-arrow-right"]', { timeout: 5000 });
      await page.click('[data-testid="pagination-arrow-right"]');
      console.log("Pasando a la siguiente página...");
      await page.waitForTimeout(3000);
    } catch (e) {
      console.log("No hay más páginas");
      hayMasPaginas = false;
    }
  }

  console.log(`Se encontraron ${productos.length} productos en Jumbo`);
  await guardarProductos("Jumbo", productos);

  await browser.close();
}

// Scrapping de Mercado Libre
async function scrapearMercadoLibre() {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  await page.goto("https://www.mercadolibre.com.ar/ofertas", { waitUntil: "networkidle2", timeout: isDev ? 60000 : 30000 });

  // Esperar a que carguen los productos
  await page.waitForSelector('.poly-component__price', { timeout: isDev ? 60000 : 30000 });

  const productos = await page.evaluate(() => {
    const cards = document.querySelectorAll('.poly-component__card');
    return Array.from(cards).map(card => {
      const nombre = card.querySelector('.poly-component__title')?.innerText.trim() || "";
      const descripcion = card.querySelector('.poly-component__title')?.innerText.trim() || "";
      const precio = card.querySelector('.poly-component__price')?.innerText.trim() || "";
      // Mejorar obtención de imagen: src o data-src
      let imagen = "";
      const imgEl = card.querySelector('.poly-component__image-overlay img');
      if (imgEl) {
        imagen = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || "";
      }
      return { nombre, descripcion, precio, imagen };
    }).filter(p => p.nombre);
  });

  console.log(`Se encontraron ${productos.length} productos en Mercado Libre Ofertas`);
  await guardarProductos("MercadoLibre", productos);

  await browser.close();
}

// Scrapping de Solo Deportes
async function scrapearSoloDeportes() {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  await page.goto("https://www.solodeportes.com.ar/ofertas.html", { waitUntil: "networkidle2", timeout: isDev ? 60000 : 30000 });

  // Esperar a que carguen los productos
  await page.waitForSelector('.product-item-info', { timeout: isDev ? 60000 : 30000 });

  const productos = await page.evaluate(() => {
    const cards = document.querySelectorAll('.product-item-info');
    return Array.from(cards).map(card => {
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
