// ─────────────────────────────────────────────────────────────
//  44 Tshirts · Servidor intermediário Bling → Catálogo
//  Hospedagem: Vercel (gratuito)
//  A chave da API fica aqui, nunca no HTML público
// ─────────────────────────────────────────────────────────────

const BLING_API_KEY = process.env.BLING_API_KEY; // configurado no painel do Vercel
const BLING_BASE    = 'https://www.bling.com.br/Api/v3';

// Quantos dias atrás um produto é considerado "novo"
const DIAS_NOVO = 7;

// Mínimo de peças padrão para atacado
const MINIMO_PADRAO = 3;

// ─────────────────────────────────────────────────────────────
//  CATEGORIAS QUE APARECEM NO CATÁLOGO
//  Para adicionar mais: inclua o nome exatamente como está no Bling
//  Para remover: apague ou comente a linha com //
// ─────────────────────────────────────────────────────────────
const CATEGORIAS_PERMITIDAS = [
  // T-SHIRT FEMININA — subcategorias por tema
  'BORDADO/APLICAÇÃO',
  'BRASIL',
  'COUNTRY',
  'CRISTÃ',
  'INSPIRAÇÃO',
  'PERSONAGENS',
  'VERÃO',

  // Outros modelos
  'GOLA ALTA LISA',
  'MAX TEE',
  'MUSCLE TEE',
  'REGATA',
  'TSHIRT CANELADA',
  'MOLETOM',
  'MASCULINA',
  'CAMISETA MASCULINA',
  'VESTIDOS',
];

// Normaliza o nome para comparação (remove acentos, maiúsculo)
function normalizar(str) {
  return (str || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const CATS_NORM = CATEGORIAS_PERMITIDAS.map(normalizar);

export default async function handler(req, res) {
  // Libera o catálogo HTML acessar esta rota
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=300'); // cache de 5 min no Vercel

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ erro: 'Método não permitido' }); return; }

  if (!BLING_API_KEY) {
    res.status(500).json({ erro: 'BLING_API_KEY não configurada nas variáveis de ambiente do Vercel.' });
    return;
  }

  try {
    const produtos = await buscarTodosProdutos();
    res.status(200).json({ produtos, total: produtos.length, atualizado: new Date().toISOString() });
  } catch (err) {
    console.error('Erro ao buscar produtos do Bling:', err.message);
    res.status(500).json({ erro: 'Não foi possível buscar os produtos. Tente novamente.' });
  }
}

// ── Busca todas as páginas de produtos ativos no Bling ────────
async function buscarTodosProdutos() {
  let pagina = 1;
  let todos   = [];

  while (true) {
    const url  = `${BLING_BASE}/produtos?pagina=${pagina}&limite=100&situacao=A`;
    const resp = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${BLING_API_KEY}`,
        'Accept':        'application/json'
      }
    });

    if (resp.status === 401) throw new Error('API Key inválida. Verifique a chave no painel do Vercel.');
    if (!resp.ok)            throw new Error(`Bling retornou erro ${resp.status}`);

    const data    = await resp.json();
    const lote    = data.data || [];

    if (lote.length === 0) break;

    const loteFiltrado = lote.filter(p => CATS_NORM.includes(normalizar(p.categoria?.nome || "")));
    todos = todos.concat(loteFiltrado.map(formatarProduto));

    // Bling pagina de 100 em 100 — continua se vier página cheia
    if (lote.length < 100) break;
    pagina++;
  }

  return todos;
}

// ── Formata cada produto para o padrão do catálogo ────────────
function formatarProduto(p) {
  const corte    = new Date();
  corte.setDate(corte.getDate() - DIAS_NOVO);
  const criacao  = new Date(p.dataInclusao || p.dataCriacao || 0);

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

// ── Extrai a cor do nome do produto ───────────────────────────
// Ex: "Camiseta Teddy Bear BRANCO" → "BRANCO"
function extrairCor(nome) {
  if (!nome) return '';
  const cores = ['OFF WHITE', 'BRANCO', 'PRETO', 'ROSA', 'MESCLA',
                 'CINZA', 'AZUL', 'VERDE', 'AMARELO', 'VERMELHO'];
  const upper = nome.toUpperCase();
  return cores.find(c => upper.includes(c)) || '';
}

// ── Formata preço: 39.9 → "R$39,90" ──────────────────────────
function formatarPreco(preco) {
  if (!preco && preco !== 0) return '';
  return 'R$' + Number(preco).toFixed(2).replace('.', ',');
}
