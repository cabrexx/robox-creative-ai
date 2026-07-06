const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.static(path.join(__dirname, "src", "public")));

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

app.get("/", (req, res) => {
  res.json({
    status: "ROBOX ONLINE",
    projeto: "ROBOX CREATIVE AI",
    versao: "2.3 Cloud Memory"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "robox-creative-ai"
  });
});

app.post("/api/render/banner", async (req, res) => {
  let browser = null;

  try {
    const dados = req.body || {};

    const templatePath = path.join(__dirname, "templates", "whatsapp-01.html");

    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({
        success: false,
        error: "Template whatsapp-01.html não encontrado."
      });
    }

    let html = fs.readFileSync(templatePath, "utf8");

    const imagem = dados.imagem || "";

    const produtoVisual = imagem
      ? `<img src="${escapeHtml(imagem)}" class="product-image" crossorigin="anonymous">`
      : `<div class="product-placeholder">👕</div>`;

    html = html
      .replaceAll("{{headline}}", escapeHtml(dados.headline || "PROMOÇÃO ESPECIAL"))
      .replaceAll("{{produto}}", escapeHtml(dados.produto || "Produto"))
      .replaceAll("{{preco}}", escapeHtml(dados.preco || "R$ 0,00"))
      .replaceAll("{{estoque_atual}}", escapeHtml(dados.estoque_atual || "0"))
      .replaceAll("{{prioridade}}", escapeHtml(dados.prioridade || "NORMAL"))
      .replaceAll("{{acao}}", escapeHtml(dados.acao || "Anunciar no WhatsApp"))
      .replaceAll("{{score}}", escapeHtml(dados.score || "0"))
      .replaceAll("{{cta}}", escapeHtml(dados.cta || "CHAME NO WHATSAPP"))
      .replaceAll("{{produto_visual}}", produtoVisual);

    const launchOptions = {
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();

    await page.setViewport({
      width: 1080,
      height: 1080,
      deviceScaleFactor: 1
    });

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 0
    });

    await page.evaluate(async () => {
      const imagens = Array.from(document.images);

      await Promise.all(
        imagens.map(img => {
          if (img.complete) return Promise.resolve();

          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    const buffer = await page.screenshot({
      type: "png",
      clip: {
        x: 0,
        y: 0,
        width: 1080,
        height: 1080
      }
    });

    await browser.close();
    browser = null;

    res.json({
      success: true,
      imageBase64: `data:image/png;base64,${buffer.toString("base64")}`,
      file: `banner-${Date.now()}.png`
    });

  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("Erro ao fechar browser:", closeError.message);
      }
    }

    console.error("ERRO AO GERAR BANNER:", error);

    res.status(500).json({
      success: false,
      error: error.message || "Erro desconhecido ao gerar banner."
    });
  }
});

app.listen(PORT, () => {
  console.log("======================================");
  console.log("🚀 ROBOX CREATIVE AI ONLINE");
  console.log(`🌐 Porta: ${PORT}`);
  console.log("======================================");
});