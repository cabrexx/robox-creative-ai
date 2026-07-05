const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.use("/output", express.static(path.join(__dirname, "output")));
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
    versao: "2.0"
  });
});

app.post("/api/render/banner", async (req, res) => {
  let browser;

  try {
    const dados = req.body || {};
    console.log("DADOS RECEBIDOS:", dados);

    const templatePath = path.join(__dirname, "templates", "whatsapp-01.html");
    let html = fs.readFileSync(templatePath, "utf8");

    const imagem = dados.imagem || "";

    const produtoVisual = imagem
      ? `<img src="${escapeHtml(imagem)}" class="product-image">`
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

    browser = await puppeteer.launch({
      headless: "new"
    });

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

    await new Promise(resolve => setTimeout(resolve, 2000));

    const filename = `banner-${Date.now()}.png`;
    const filepath = path.join(__dirname, "output", filename);

    await page.screenshot({
      path: filepath,
      type: "png",
      clip: {
        x: 0,
        y: 0,
        width: 1080,
        height: 1080
      }
    });

    await browser.close();

    res.json({
      success: true,
      imageUrl: `http://localhost:${PORT}/output/${filename}`,
      file: filename
    });

  } catch (error) {
    if (browser) await browser.close();

    console.error("ERRO AO GERAR BANNER:", error.message);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log("");
  console.log("======================================");
  console.log("🚀 ROBOX CREATIVE AI ONLINE");
  console.log(`🌐 http://localhost:${PORT}`);
  console.log("======================================");
  console.log("");
});