// Ranking global do FCS: função serverless da Vercel + Upstash Redis (plano grátis).
// Ative em: Vercel → seu projeto → Storage → Create Database → Upstash (Redis) → Connect.
// A integração cria as variáveis KV_REST_API_URL e KV_REST_API_TOKEN (ou UPSTASH_REDIS_REST_*).
// Sem elas, a função responde 503 e o jogo usa o ranking local do aparelho.

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const MODES = ['camp', 'free'];
const MAX_SCORE = 200000; // acima disso é quase certo que é trapaça

async function redis(commands) {
  const r = await fetch(URL_ + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).map((x) => x.result);
}

const clean = (t, n) => String(t || '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, n);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOKEN) return res.status(503).json({ error: 'ranking global desligado' });
  try {
    if (req.method === 'GET') {
      const mode = MODES.includes(req.query.mode) ? req.query.mode : 'free';
      const [flat] = await redis([['ZREVRANGE', 'fcs:rank:' + mode, '0', '9', 'WITHSCORES']]);
      const top = [];
      for (let i = 0; i < flat.length; i += 2) {
        const [name, ac] = flat[i].split('|');
        top.push({ name, ac, score: Number(flat[i + 1]) });
      }
      return res.status(200).json({ top });
    }
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const name = clean(b.name, 16) || 'Piloto anônimo';
      const ac = clean(b.ac, 10);
      const mode = MODES.includes(b.mode) ? b.mode : 'free';
      const score = Math.floor(Number(b.score));
      if (!Number.isFinite(score) || score <= 0 || score > MAX_SCORE) return res.status(400).json({ error: 'pontuação inválida' });
      // limite simples: 10 envios por minuto por IP
      const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim();
      const [count] = await redis([['INCR', 'fcs:rl:' + ip], ['EXPIRE', 'fcs:rl:' + ip, '60']]);
      if (count > 10) return res.status(429).json({ error: 'devagar, piloto' });
      // GT: só sobe a pontuação se for o novo recorde desse piloto com esse avião
      await redis([['ZADD', 'fcs:rank:' + mode, 'GT', String(score), name + '|' + ac]]);
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  } catch (e) {
    return res.status(500).json({ error: 'falha no ranking' });
  }
};
