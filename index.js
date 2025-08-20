import puppeteer from "puppeteer";



async function scrapearProductos() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Ir a la página de ofertas
  await page.goto('https://www.cotodigital.com.ar/sitios/cdigi/categoria/ofertas-exclusivas/_/N-1nx2iz5%3FNf%3Dproduct.startDate%257CLTEQ%2B1.755648E12%257C%257Cproduct.endDate%257CGTEQ%2B1.755648E12&Nr%3DAND%2528product.sDisp_200%253A1004%252Cproduct.language%253Aespa%25C3%25B1ol%252COR%2528product.siteId%253ACotoDigital%2529%2529&pushSite%3DCotoDigital', {
    waitUntil: 'networkidle2'
  });

  // Esperamos a que aparezcan los productos
  await page.waitForSelector('.nombre-producto.cursor-pointer', { timeout: 60000 });

  // Extraemos nombres y precios
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
console.log("#####################################################    Ofertas de Coto Digital    #########################################################")
  console.log(`Se encontraron ${productos.length} productos:`);
  console.log(productos);

  await browser.close();
}

//scrapearProductos();
//





async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500; // pixeles a desplazar cada vez
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 1000); // tiempo entre scrolls
    });
  });
}

async function scrapearCarrefour() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Ir a la página de ofertas
  await page.goto('https://www.carrefour.com.ar/21743?map=productClusterIds', {
    waitUntil: 'networkidle2'
  });

  // Esperamos y aceptamos cookies si aparece el banner
  try {
    await page.waitForSelector('button#onetrust-accept-btn-handler', { timeout: 5000 });
    await page.click('button#onetrust-accept-btn-handler');
    console.log("Cookies aceptadas");
  } catch (e) {
    console.log("No se encontró el banner de cookies");
  }

  // Hacemos scroll hasta el final para cargar todos los productos
  console.log("Haciendo scroll para cargar todos los productos...");
  await autoScroll(page);

  // Esperamos a que aparezcan los productos
  await page.waitForSelector('.vtex-product-summary-2-x-productBrand.vtex-product-summary-2-x-brandName.t-body', { timeout: 60000 });

  // Extraemos nombres y precios
  const productos = await page.evaluate(() => {
    const nombres = document.querySelectorAll('.vtex-product-summary-2-x-productBrand.vtex-product-summary-2-x-brandName.t-body');
    const precios = document.querySelectorAll('.valtech-carrefourar-product-price-0-x-sellingPrice.valtech-carrefourar-product-price-0-x-sellingPrice--hasListPrice');

    const resultados = [];
    for (let i = 0; i < nombres.length; i++) {
      const nombre = nombres[i]?.innerText.trim() || '';
      const precio = precios[i]?.innerText.trim() || '';
      if (nombre) resultados.push({ nombre, precio });
    }
    return resultados;
  });

  console.log("#####################################################    Ofertas de Carrefour     #########################################################");
  console.log(`Se encontraron ${productos.length} productos:`);
  console.log(productos);

  await browser.close();
}

scrapearCarrefour();
scrapearProductos();
