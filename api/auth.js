// ─────────────────────────────────────────────────────────────
//  44 Tshirts · Autorização Bling OAuth v3
//  Este arquivo troca o código de autorização pelo token
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.send(paginaErro('Código de autorização não encontrado. Tente autorizar novamente.'));
  }

  try {
    const credencial = Buffer.from(
      `${process.env.BLING_CLIENT_ID}:${process.env.BLING_CLIENT_SECRET}`
    ).toString('base64');

    const resp = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credencial}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code
      })
    });

    const tokens = await resp.json();

    if (!tokens.refresh_token) {
      return res.send(paginaErro('Não foi possível obter o token. Tente autorizar novamente.<br><br>Detalhe: ' + JSON.stringify(tokens)));
    }

    return res.send(paginaSucesso(tokens.refresh_token));

  } catch (err) {
    return res.send(paginaErro('Erro inesperado: ' + err.message));
  }
}

function paginaSucesso(refreshToken) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Autorização concluída · 44 Tshirts</title>
<style>
  body { font-family: sans-serif; background: #0E0E0E; color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
  .box { background: #1A1A1A; border: 1px solid #BFA054; border-radius: 16px; padding: 32px; max-width: 560px; width: 100%; }
  h1 { color: #BFA054; font-size: 22px; margin-bottom: 8px; }
  p { color: #aaa; font-size: 14px; line-height: 1.6; }
  .token { background: #111; border: 1px solid #333; border-radius: 8px; padding: 14px; font-family: monospace; font-size: 12px; color: #BFA054; word-break: break-all; margin: 16px 0; }
  .passo { background: #222; border-radius: 10px; padding: 16px; margin: 12px 0; font-size: 13px; color: #ddd; line-height: 1.6; }
  .passo strong { color: white; }
  .num { background: #BFA054; color: black; border-radius: 50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; margin-right: 8px; }
  button { background: #BFA054; color: black; border: none; border-radius: 8px; padding: 10px 20px; font-size: 13px; font-weight: 700; cursor: pointer; margin-top: 8px; }
</style>
</head>
<body>
<div class="box">
  <h1>✅ Autorização concluída!</h1>
  <p>Agora siga os passos abaixo para ativar o catálogo:</p>

  <div class="passo">
    <span class="num">1</span><strong>Copie o Refresh Token abaixo:</strong>
    <div class="token" id="token">${refreshToken}</div>
    <button onclick="copiar()">📋 Copiar Token</button>
  </div>

  <div class="passo">
    <span class="num">2</span><strong>Vá para o Vercel</strong> → seu projeto → <strong>Settings → Environment Variables</strong>
  </div>

  <div class="passo">
    <span class="num">3</span>Adicione uma nova variável:<br>
    <strong>Nome:</strong> BLING_REFRESH_TOKEN<br>
    <strong>Valor:</strong> cole o token copiado
  </div>

  <div class="passo">
    <span class="num">4</span>Clique em <strong>Save</strong> e depois em <strong>Redeploy</strong> no Vercel.<br>
    O catálogo vai estar no ar! 🎉
  </div>
</div>
<script>
function copiar() {
  navigator.clipboard.writeText(document.getElementById('token').textContent);
  event.target.textContent = '✅ Copiado!';
  setTimeout(() => event.target.textContent = '📋 Copiar Token', 2000);
}
</script>
</body>
</html>`;
}

function paginaErro(msg) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Erro</title>
<style>body{font-family:sans-serif;background:#0E0E0E;color:white;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;}
.box{background:#1A1A1A;border:1px solid #c0392b;border-radius:16px;padding:32px;max-width:480px;width:100%;}
h1{color:#c0392b;}p{color:#aaa;font-size:14px;line-height:1.6;}</style></head>
<body><div class="box"><h1>❌ Erro na autorização</h1><p>${msg}</p></div></body></html>`;
}
