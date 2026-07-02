// ─────────────────────────────────────────────────────────────
//  44 Tshirts · Produtos via Bling API v3 (OAuth2)
//  Variáveis necessárias no Vercel:
//  - BLING_CLIENT_ID
//  - BLING_CLIENT_SECRET
//  - BLING_REFRESH_TOKEN
// ─────────────────────────────────────────────────────────────

const BLING_BASE    = 'https://www.bling.com.br/Api/v3';
const DIAS_NOVO     = 7;
const MINIMO_PADRAO = 3;

const CATEGORIAS_PERMITIDAS = [
  'BORDADO/APLICAÇÃO', 'BRASIL', 'COUNTRY', 'CRISTÃ',
  'INSPIRAÇÃO', 'PERSONAGENS', 'VERÃO',
  'GOLA ALTA LISA', 'MAX TEE', 'MUSCLE TEE', 'REGATA',
  'TSHIRT CANELADA', 'MOLETOM', 'MASCULINA',
  'CAMISETA MASCULINA', 'VESTIDOS',
];

function normalizar(str) {
  return (str || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const CATS_NORM = CATEGORIAS_PERMITIDAS.map(normalizar);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=300');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ erro: 'Método não permitido' }); return; }

  const BLING_CLIENT_ID = process.env.BLING_CLIENT_ID || process.env.ID_DO_CLIENTE_BLING;
  const BLING_CLIENT_SECRET = process.env.BLING_CLIENT_SECRET;
  const BLING_REFRESH_TOKEN = process.env.BLING_REFRESH_TOKEN;

  if (!BLING_CLIENT_ID || !BLING_CLIENT_SECRET) {
    return res.status(500).json({ erro: 'BLING_CLIENT_ID ou BLING_CLIENT_SECRET não configurados no Vercel.' });
  }

  if (!BLING_REFRESH_TOKEN) {
    return res.status(500).json({
      erro: 'BLING_REFRESH_TOKEN não configurado.',
      instrucao: `Acesse este link para autorizar: https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${BLING_CLIENT_ID}&state=catalogo44`
    });
  }

  try {
    const accessToken = await getAccessToken(BLING_CLIENT_ID, BLING_CLIENT_SECRET, BLING_REFRESH_TOKEN);
    const produtos    = await buscarTodosProdutos(accessToken);
    res.status(200).json({ produtos, total: produtos.length, atualizado: new Date().toISOString() });
  } catch (err) {
    console.error('Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
}

// ── Obtém access token usando o refresh token ─────────────────
async function getAccessToken(clientId, clientSecret, refreshToken) {
  const credencial = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const resp = await fetch(`${BLING_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credencial}`
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken
    })
  });

  const data = await resp.json();

  if (!data.access_token) {
    throw new Error('Não foi possível obter o access token. Verifique o BLING_REFRESH_TOKEN.');
  }

  return data.access_token;
}

// ── Busca todos os produtos ativos no Bling ───────────────────
async function buscarTodosProdutos(accessToken) {
  let pagina = 1;
  let todos  = [];

  while (true) {
    const url  = `${BLING_BASE}/produtos?pagina=${pagina}&limite=100&situacao=A`;
    const resp = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept':        'application/json'
      }
    });

    if (resp.status === 401) throw new Error('Token inválido. Reautorize o aplicativo no Bling.');
    if (!resp.ok)            throw new Error(`Bling retornou erro ${resp.status}`);

    const data = await resp.json();
    const lote = data.data || [];

    if (lote.length === 0) break;

    const filtrados = lote.filter(p => CATS_NORM.includes(normalizar(p.categoria?.nome || '')));
    todos = todos.concat(filtrados.map(formatarProduto));

    if (lote.length < 100) break;
    pagina++;
  }

  return todos;
}

// ── Formata produto para o catálogo ──────────────────────────
function formatarProduto(p) {
  const corte   = new Date();
  corte.setDate(corte.getDate() - DIAS_NOVO);
  const criacao = new Date(p.dataInclusao || p.dataCriacao || 0);

  return {
    sku:       p.codigo || String(p.id),
    nome:      p.nome   || '',
    cor:       extrairCor(p.nome),
    categoria: p.categoria?.nome || 'Sem Categoria',
    preco:     formatarPreco(p.preco),
    min:       MINIMO_PADRAO,
    novo:      criacao > corte,
    fotoUrl:   p.imageThumbnail || p.imagem || ''
  };
}

function extrairCor(nome) {
  if (!nome) return '';
  const cores = ['OFF WHITE', 'BRANCO', 'PRETO', 'ROSA', 'MESCLA', 'CINZA', 'AZUL', 'VERDE', 'AMARELO', 'VERMELHO'];
  const upper = nome.toUpperCase();
  return cores.find(c => upper.includes(c)) || '';
}

function formatarPreco(preco) {
  if (!preco && preco !== 0) return '';
  return 'R$' + Number(preco).toFixed(2).replace('.', ',');
}
