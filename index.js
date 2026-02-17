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

  await page.goto("https://www.solodeportes.com.ar/ofertas.html", { waitUntil: "networkidle2", timeout: isDev ? 60000 : 45000 });

  // Debug: descubrir qué elementos existen en la página
  if (isGithub) {
    console.log("Debug: Analizando estructura de Solo Deportes...");
    const debugInfo = await page.evaluate(() => {
      const selectors = [
        '.product-item-info',
        '.product-item', 
        '.product-card',
        '[class*="product-item"]',
        '[class*="product"]',
        '[class*="item"]',
        '.item',
        'li[class*="item"]',
        'div[class*="product"]',
        '.product',
        'article',
        '.tile',
        '[class*="tile"]'
      ];
      
      const results = {};
      selectors.forEach(sel => {
        try {
          const elements = document.querySelectorAll(sel);
          results[sel] = elements.length;
          if (elements.length > 0 && elements.length < 10) {
            // Mostrar HTML del primer elemento para análisis
            results[sel + '_html'] = elements[0].outerHTML.substring(0, 200);
          }
        } catch (e) {
          results[sel] = 'Error: ' + e.message;
        }
      });
      
      return results;
    });
    
    console.log("Resultados de debug:", JSON.stringify(debugInfo, null, 2));
  }

  // Esperar a que carguen los productos con múltiples selectores de fallback
  let productos = [];
  const selectors = [
    '.product-item-info', 
    '.product-item', 
    '.product-card', 
    '[class*="product-item"]',
    '[class*="product"]',
    '[class*="item"]',
    '.item',
    'li[class*="item"]',
    'div[class*="product"]',
    '.product',
    'article',
    '.tile',
    '[class*="tile"]'
  ];
  
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: isDev ? 30000 : 10000 });
      productos = await page.evaluate((sel) => {
        const cards = document.querySelectorAll(sel);
        return Array.from(cards).slice(0, 100).map(card => {
          const linkEl = card.querySelector('.product-item-link') || 
                        card.querySelector('a[href*="/product"]') ||
                        card.querySelector('a') ||
                        card.querySelector('[href]');
          const nombre = linkEl?.innerText.trim() || card.querySelector('[class*="name"]')?.innerText.trim() || "";
          let url = linkEl?.getAttribute('href') || "";
          if (url.startsWith('/')) url = 'https://www.solodeportes.com.ar' + url;

          const precio = card.querySelector('.price')?.innerText.trim() || 
                        card.querySelector('[class*="price"]')?.innerText.trim() || "";

          // Imagen: buscar cualquier img
          const imgEl = card.querySelector('img[data-src]') || card.querySelector('img[src]') || card.querySelector('img');
          let imagen = "";
          if (imgEl) {
            // Función auxiliar para extraer la URL real de la imagen de una URL de Next.js
            const extractRealImageUrl = (nextImageUrl, baseUrl) => {
              try {
                const urlObj = new URL(nextImageUrl, baseUrl);
                const imageUrlParam = urlObj.searchParams.get('url');
                if (imageUrlParam) {
                  return decodeURIComponent(imageUrlParam);
                }
              } catch (e) {
                console.error("Error al parsear URL de Next.js:", e);
              }
              return nextImageUrl;
            };

            imagen = imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || "";
            if (imagen.includes('/next/image')) {
              imagen = extractRealImageUrl(imagen, 'https://www.solodeportes.com.ar');
            }
            if (imagen.startsWith('//')) imagen = 'https:' + imagen;
            if (imagen.startsWith('/')) imagen = 'https://www.solodeportes.com.ar' + imagen;
          }

          return { nombre, precio, imagen, url };
        }).filter(p => p.nombre && p.imagen && p.url);
      }, selector);
      
      if (productos.length > 0) {
        console.log(`Se encontraron ${productos.length} productos con selector: ${selector}`);
        break;
      }
    } catch (e) {
      console.log(`Selector ${selector} falló: ${e.message}`);
      continue;
    }
  }

  if (productos.length === 0) {
    console.log("No se encontraron productos en Solo Deportes");
    await browser.close();
    return;
  }

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

      // Extraer precio - intentar múltiples métodos
      let precio = "";
      try {
        // Método 1: del input.productGtmData (JSON)
        const precioInput = card.querySelector('.productGtmData');
        if (precioInput) {
          const precioData = JSON.parse(precioInput.value || '{}');
          if (Array.isArray(precioData) && precioData.length > 0) {
            precio = precioData[0].price || "";
          } else {
            precio = precioData.price || precioData.precio || "";
          }
        }
        
        // Método 2: del span.sales .value (precio formateado)
        if (!precio) {
          const precioSpan = card.querySelector('.sales .value');
          if (precioSpan) {
            precio = precioSpan.textContent.trim();
          }
        }
        
        // Método 3: del div.price
        if (!precio) {
          const precioDiv = card.querySelector('.price');
          if (precioDiv) {
            // Extraer solo el primer precio que encuentre
            const priceText = precioDiv.textContent.trim();
            const priceMatch = priceText.match(/\$\s*[\d.,]+/);
            if (priceMatch) {
              precio = priceMatch[0];
            }
          }
        }
      } catch (e) {
        console.error('Error extrayendo precio:', e);
      }

      // Imagen: buscar en image-container
      const imgEl = card.querySelector('.image-container img');
      let imagen = "";
      if (imgEl) {
        // Función auxiliar para extraer la URL real de la imagen de una URL de Next.js
        const extractRealImageUrl = (nextImageUrl, baseUrl) => {
          try {
            const urlObj = new URL(nextImageUrl, baseUrl);
            const imageUrlParam = urlObj.searchParams.get('url');
            if (imageUrlParam) {
              return decodeURIComponent(imageUrlParam);
            }
          } catch (e) {
            console.error("Error al parsear URL de Next.js:", e);
          }
          return nextImageUrl;
        };

        imagen = imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || "";
        if (imagen.includes('/next/image')) {
          imagen = extractRealImageUrl(imagen, 'https://www.stockcenter.com.ar');
        }
        if (imagen.startsWith('//')) imagen = 'https:' + imagen;
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

// Scrapping de OpenSports
async function scrapearOpenSports() {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  await page.goto("https://www.opensports.com.ar/ofertas.html?p=2", { waitUntil: "networkidle2", timeout: isDev ? 60000 : 30000 });

  // Aceptar cookies si aparece el botón
  try {
    await page.waitForSelector('button#onetrust-accept-btn-handler, button[mode="primary"], .cookie-accept', { timeout: 7000 });
    await page.evaluate(() => {
      const btn = document.querySelector('button#onetrust-accept-btn-handler') || 
                  document.querySelector('button[mode="primary"]') ||
                  document.querySelector('.cookie-accept');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {
    // Si no aparece, continuar
  }
  
  // Usar el selector que funciona para OpenSports
  const bestSelector = '[class*="product-item"]';
  
  // Esperar a que carguen los productos
  await page.waitForSelector(bestSelector, { timeout: isDev ? 60000 : 30000 });

  // Scroll automático suave para cargar hasta 100 productos como máximo
  let previousHeight = 0;
  let sameCount = 0;
  let maxProductos = 100;
  
  for (let i = 0; i < 30; i++) {
    const currentHeight = await page.evaluate('document.body.scrollHeight');
    
    // Scroll en pasos más pequeños
    const scrollStep = Math.floor(currentHeight / 5);
    for (let step = 1; step <= 5; step++) {
      await page.evaluate(`window.scrollTo(0, ${scrollStep * step})`);
      await new Promise(r => setTimeout(r, 800)); // Espera entre cada paso
    }
    
    // Esperar más tiempo después del scroll completo
    await new Promise(r => setTimeout(r, 3000));
    const newCount = await page.evaluate((sel) => document.querySelectorAll(sel).length, bestSelector);
    
    if (newCount >= maxProductos) {
      break;
    }
    if (newCount === previousHeight) {
      sameCount++;
      if (sameCount > 2) {
        break;
      }
    } else {
      sameCount = 0;
    }
    previousHeight = newCount;
  }

  // Espera final antes de extraer datos
  await new Promise(r => setTimeout(r, 5000));

  // Extraer productos RAW (sin procesar URLs de Next.js todavía)
  const productosRaw = await page.evaluate((sel) => {
    const cards = document.querySelectorAll(sel);
    
    return Array.from(cards).slice(0, 100).map((card, index) => {
      // Extraer nombre y enlace de OpenSports - buscar en todo el card
      const nombreEl = card.querySelector('.product-item-link') || 
                       card.querySelector('[class*="name"]') ||
                       card.querySelector('.product-name');
      const nombre = nombreEl?.innerText.trim() || "";
      
      // Buscar enlace dentro del card
      const linkEl = card.querySelector('a') || nombreEl?.querySelector('a');
      let url = linkEl?.getAttribute('href') || "";
      if (url.startsWith('/')) url = 'https://www.opensports.com.ar' + url;

      // Buscar precio con varios selectores posibles
      const precioEl = card.querySelector('.normal-price .price') ||
                        card.querySelector('.price') ||
                        card.querySelector('[class*="price"]') ||
                        card.querySelector('.special-price');
      const precio = precioEl?.innerText.trim() || "";

      // Imagen: buscar con varios selectores posibles para OpenSports
      const imgEl = card.querySelector('.product-image-photo') ||
                     card.querySelector('img') ||
                     card.querySelector('[class*="image"]') ||
                     card.querySelector('img[src]');
      let imagen = "";
      if (imgEl) {
        // Prioridad: data-src > data-lazy-src > srcset > src
        imagen = imgEl.getAttribute('data-src') || 
                 imgEl.getAttribute('data-lazy-src') ||
                 '';
        
        // Si no hay data-src, procesar srcset
        if (!imagen && imgEl.getAttribute('srcset')) {
          const srcset = imgEl.getAttribute('srcset');
          // Tomar la primera imagen del srcset
          const firstImage = srcset?.split(',')[0]?.trim().split(' ')[0];
          if (firstImage) {
            imagen = firstImage;
          }
        }
        
        // Fallback a src si todavía no hay imagen
        if (!imagen) {
          imagen = imgEl.getAttribute('src') || '';
        }
        
        // Limpiar URLs relativas
        if (imagen.startsWith('//')) {
          imagen = 'https:' + imagen;
        } else if (imagen.startsWith('/')) {
          imagen = 'https://www.opensports.com.ar' + imagen;
        }
      }

      return { nombre, precio, imagen, url };
    });
  }, bestSelector);

  // Procesar URLs de Next.js FUERA del evaluate (en contexto de Node.js)
  const productos = productosRaw.map(p => {
    let imagen = p.imagen;
    
    // Extraer URL real si es de Next.js
    if (imagen && imagen.includes('/next/image')) {
      try {
        const urlObj = new URL(imagen, 'https://www.opensports.com.ar');
        const imageUrlParam = urlObj.searchParams.get('url');
        if (imageUrlParam) {
          imagen = decodeURIComponent(imageUrlParam);
          // Asegurar que sea URL completa
          if (imagen.startsWith('/')) {
            imagen = 'https://www.opensports.com.ar' + imagen;
          }
        }
      } catch (e) {
        console.error("Error procesando URL de Next.js:", e);
      }
    }
    
    return { ...p, imagen };
  });

  const productosFiltrados = productos.filter(p => p.nombre && p.imagen && p.url);

  console.log(`Se encontraron ${productosFiltrados.length} productos en OpenSports`);
  
  // Debug: mostrar primeros 3 productos para verificar las imágenes
  console.log("Primeros 3 productos de OpenSports:");
  productosFiltrados.slice(0, 3).forEach((p, i) => {
    console.log(`${i + 1}. ${p.nombre}`);
    console.log(`   Imagen: ${p.imagen}`);
    console.log(`   Precio: ${p.precio}`);
  });
  
  await guardarProductos("OpenSports", productosFiltrados);

  await browser.close();
}

// Ejecutar scrapper de Solo Deportes, Stock Center y OpenSports
async function main() {
  await scrapearSoloDeportes();
  await scrapearStockCenter();
  await scrapearOpenSports();
}

main();