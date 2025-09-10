import puppeteer from "puppeteer";
import { guardarProductos } from "./dbFunctions.js";

const isGithub = process.env.GITHUB_ACTIONS === "true";

// Función helper para lanzar browser
async function launchBrowser() {
  return await puppeteer.launch({
    headless: isGithub ? true : false,
    args: isGithub ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
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
    { waitUntil: "networkidle2", timeout: 0 }
  );

  try {
    await page.waitForSelector(".nombre-producto.cursor-pointer", {
      timeout: 30000,
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

  await page.goto("https://www.jumbo.com.ar/", { waitUntil: "networkidle2" });

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
    await page.waitForSelector(
      ".vtex-flex-layout-0-x-flexRow--shelf-main-hover-actions",
      { timeout: 30000 }
    );

    const productosPagina = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll(
          ".vtex-flex-layout-0-x-flexRow--shelf-main-hover-actions"
        )
      )
        .map((card) => {
          const nombre =
            card
              .querySelector(".vtex-product-summary-2-x-productBrand")
              ?.innerText.trim() || "";
          const descripcion =
            card
              .querySelector(".vtex-product-summary-2-x-productNameContainer")
              ?.innerText.trim() || "";
          const precio =
            card
              .querySelector(".vtex-product-price-1-x-currencyContainer")
              ?.innerText.trim() || "";
          const imagen =
            card.querySelector(".vtex-product-summary-2-x-imageNormal")?.src ||
            "";
          return { nombre, descripcion, precio, imagen };
        })
        .filter((p) => p.nombre);
    });

    productos.push(...productosPagina);

    // Pasar a la siguiente página
    try {
      await page.waitForSelector("#nav-thin-caret--right", { timeout: 5000 });
      await page.click("#nav-thin-caret--right");
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

// Ejecutar ambos scrappers
async function main() {
  await scrapearJumbo();
  await scrapearCoto();
}

main();
