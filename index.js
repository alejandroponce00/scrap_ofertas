import puppeteer from "puppeteer";
import { guardarProductos } from "./dbFunctions.js";

const isGithub = process.env.GITHUB_ACTIONS === "true";

// Función helper para lanzar browser
async function launchBrowser() {
  return await puppeteer.launch({
    headless: isGithub ? true : false,
    args: isGithub ? ["--no-sandbox", "--disable-setuid-sandbox"] : []
  });
}

async function scrapearProductos() {
  const browser = await launchBrowser();
  const page = await browser.newPage();

await page.goto(
  'https://www.cotodigital.com.ar/sitios/cdigi/categoria/ofertas-exclusivas/_/N-1nx2iz5%3FNf%3Dproduct.startDate%257CLTEQ%2B1.755648E12%257C%257Cproduct.endDate%257CGTEQ%2B1.755648E12&Nr%3DAND%2528product.sDisp_200%253A1004%252Cproduct.language%253Aespa%25C3%25B1ol%252COR%2528product.siteId%253ACotoDigital%2529%2529&pushSite%3DCotoDigital',
  { waitUntil: 'networkidle0' } // espera a que no haya ninguna solicitud pendiente
);


  await page.waitForSelector('.nombre-producto.cursor-pointer', { timeout: 150000 });

  const productos = await page.evaluate(() => {
    const nombres = document.querySelectorAll('.nombre-producto.cursor-pointer');
    const precios = document.querySelectorAll('.card-title.text-center.mt-1.m-0.p-0.ng-star-inserted');
    const resultados = [];
    for (let i = 0; i < nombres.length; i++) {
      const nombre = nombres[i]?.innerText.trim() || '';
      const precio = precios[i]?.innerText.trim() || '';
      if (nombre) resultados.push({ nombre, precio });
    }
    return resultados;
  });

  console.log(`Se encontraron ${productos.length} productos en Coto`);
  await guardarProductos("Coto", productos);

  await browser.close();
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 3000);
    });
  });
}

async function scrapearJumbo() {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  await page.goto('https://www.jumbo.com.ar/', { waitUntil: 'networkidle2' });

  // Aceptar cookies
  try {
    await page.waitForSelector('button#onetrust-accept-btn-handler', { timeout: 15000 });
    await page.click('button#onetrust-accept-btn-handler');
    console.log("Cookies aceptadas");
  } catch (e) {
    console.log("No se encontró el banner de cookies");
  }

  const productos = [];
  let hayMasPaginas = true;

  while (hayMasPaginas) {
    await page.waitForSelector('.vtex-product-summary-2-x-productBrand', { timeout: 30000 });

    const productosPagina = await page.evaluate(() => {
      const nombres = document.querySelectorAll('.vtex-product-summary-2-x-productBrand');
      const precios = document.querySelectorAll('.vtex-product-price-1-x-sellingPriceValue, .jumboargentinaio-store-theme-1dCOMij_MzTzZOCohX1K7w.vtex-price-format-gallery');
      const resultados = [];
      for (let i = 0; i < nombres.length; i++) {
        const nombre = nombres[i]?.innerText.trim() || '';
        const precio = precios[i]?.innerText.trim() || '';
        if (nombre) resultados.push({ nombre, precio });
      }
      return resultados;
    });

    productos.push(...productosPagina);

    // Pasar a la siguiente página
    try {
      await page.waitForSelector('#nav-thin-caret--right', { timeout: 5000 });
      await page.click('#nav-thin-caret--right');
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

// Ejecutar en orden
async function main() {
  await scrapearJumbo();
  await scrapearProductos();
}

main();
