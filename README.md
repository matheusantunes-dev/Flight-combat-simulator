# FCS · Flight Combat Simulator

Jogo de combate aéreo 3D em HTML/CSS/JS (Three.js), com cockpit do F-14, esquadrilha de 6 alas e rádio com IA que roda no navegador.

## Publicar na Vercel

1. Em [vercel.com](https://vercel.com), entre com o GitHub e clique em **Add New → Project**.
2. Importe o repositório `Flight-combat-simulator`.
3. Configure assim:
   - **Framework Preset:** Other
   - **Build Command:** vazio
   - **Output Directory:** vazio (a raiz do repo)
4. Clique em **Deploy**. Cada push na `main` publica de novo, e cada Pull Request ganha um link de prévia.

Testar local antes: `python3 -m http.server 8080` e abra `http://localhost:8080` (abrir o arquivo direto com duplo clique não funciona, porque os modelos 3D são carregados por HTTP).

## Instalar como app (PWA)

No Chrome do Android: menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial"). No PC: ícone de instalar na barra de endereço. Depois da primeira visita, o jogo abre até sem internet (a IA local e o multiplayer continuam precisando de rede).

Ao mudar modelos ou bibliotecas, suba a versão em `sw.js` (`const VERSION = 'fcs-v2'`) para os jogadores receberem os arquivos novos.

## Testes automáticos

Todo Pull Request roda `.github/workflows/test.yml`: abre o jogo num Chrome headless e confere decolagem por catapulta, pouso com cabo e combate com os alas (`tests/smoke.mjs`), e o multiplayer com 2 abas: lobby, PvP e coop (`tests/multiplayer.mjs`).

Rodar no seu PC:
```bash
npm i --no-save playwright@1 && npx playwright install chromium
python3 -m http.server 8080 &
node tests/smoke.mjs
```

## Modelos 3D

Os modelos ficam em `models/*.glb`, comprimidos com [gltfpack](https://github.com/zeux/meshoptimizer/tree/master/gltf) (meshopt): de 21 MB para 9 MB. Para comprimir um modelo novo:
```bash
npx gltfpack -i modelo.gltf -o models/modelo.glb -c -noq -kn -km -ke
```
`-noq` mantém as coordenadas em float (o código separa trem de pouso, asas e cockpit pelos nomes e precisa delas assim); `-kn -km -ke` mantêm nomes, materiais e extras.

## Progressão, missões e ranking

- **Hangar com PM (pontos de mérito):** o F-14 começa liberado; F-16 (1.500 PM), Mirage (3.000 PM) e MiG-29 (5.000 PM) são comprados com os pontos das partidas. Missão cumprida rende 1,5× os pontos. A opção "Hangar liberado" no menu desliga a progressão.
- **Missões 4 e 5:** escolta do AWACS (se ele cair, a missão acaba) e interceptação com relógio (150 s por onda).
- **Nuvens:** dentro delas, mísseis perdem o alvo com mais facilidade, dos dois lados.
- **Câmera do abate:** 2 s em câmera lenta seguindo o inimigo abatido por míssil. Qualquer tecla ou toque pula; dá para desligar no menu.
- **Ranking global:** função `api/score.js` na Vercel + Upstash Redis (plano grátis: 256 MB e 500 mil comandos por mês, sem cartão). Para ligar: Vercel → projeto → **Storage → Create Database → Upstash (Redis)** → conectar ao projeto → **Redeploy**. Sem isso, o ranking fica salvo só no aparelho.

## Multiplayer (até 6 pilotos por sala)

No menu: **MULTIPLAYER** → **Criar sala** → **Copiar convite** ou **Compartilhar** (WhatsApp, Discord…). Quem abre o link cai direto na sala. O anfitrião escolhe o modo e decola com todo mundo.

- **Cooperativo vs IA:** a sala inteira defende a frota contra as ondas. Os inimigos rodam no aparelho do anfitrião; se ele sair, a partida acaba.
- **PvP todos contra todos:** primeiro a 10 abates vence, ou o melhor em 8 minutos. Quem cai volta em 5 s.
- **Placar:** Tab (PC) ou botão PLACAR (celular).
- **Chat:** o rádio (Enter) vira chat da sala; comece com "ia," para falar com o copiloto.
- **Voz da sala:** botão no lobby, por WebRTC (só online).

Como funciona: [Trystero](https://github.com/dmotz/trystero) encontra os jogadores por relays públicos do Nostr e liga os navegadores direto por WebRTC. Não tem servidor nosso nem custo. Em algumas redes (4G de certas operadoras, Wi-Fi corporativo) a conexão direta pode falhar, porque não usamos servidor TURN.

Testar sem internet, em duas abas: `http://localhost:8080/?rede=local`.

## Rádio com IA (grátis, sem chave)

Abra com **Enter** (ou o botão **RÁDIO** no celular).

| Camada | O que faz | Onde funciona |
|---|---|---|
| Ordens | "alas ataquem", "solta flare", "trava", "baixa o trem"… executam na hora | Todo navegador |
| Roteiro | Respostas variadas sobre status, inimigos, combustível, dicas, piadas | Todo navegador |
| IA local (WebLLM) | Conversa livre. Botão "Baixar IA leve (~400 MB)" ou "esperta (~1,1 GB)". Depois do 1º download fica em cache e funciona offline | Chrome/Edge com WebGPU, de preferência no computador |
| Voz ao vivo | 🎙 AO VIVO: o microfone fica ouvindo e o copiloto responde falando (pt-BR) | Chrome/Edge (computador e Android). Safari/Firefox: só texto |

Observações honestas:
- O reconhecimento de voz do Chrome é gratuito, mas o áudio é processado nos servidores do Google.
- A IA local pequena erra fatos às vezes; por isso as ordens do jogo nunca passam por ela.
- O microfone exige HTTPS (a Vercel já é HTTPS).

## Créditos e licenças

- Three.js (MIT).
- WebLLM / MLC AI (Apache-2.0) e modelos Qwen2.5 (Alibaba, licença Apache-2.0).
- Modelos 3D dos caças F-14, F-16, MiG-29 e Mirage 2000: bohmerang, **CC BY-NC-SA** (uso não comercial, com atribuição e mesma licença).
- MiG-29 e Su-27 simples: Zuujis, CC0.

Por causa da licença NC dos caças, este projeto **não pode ser vendido nem monetizado** sem trocar esses modelos.
