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

scrapearProductos();
