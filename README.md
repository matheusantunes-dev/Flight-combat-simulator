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

Todo Pull Request roda `.github/workflows/test.yml`: abre o jogo num Chrome headless e confere decolagem por catapulta, pouso com cabo e combate com os alas (`tests/smoke.mjs`), o multiplayer com 2 abas: lobby, PvP e coop (`tests/multiplayer.mjs`), o Mundo Real com mapa sintético (`tests/world.mjs`), e o joystick com um manche falso + o VR (`tests/controls.mjs`).

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
- **PvP por times (Azul × Vermelho, até 3 por time):** quem entra vai para o time menor e dá para trocar no lobby. Sem fogo amigo; colegas aparecem como losango azul no HUD e não entram no radar de alvos. Cada time nasce de um lado do mapa. Primeiro time a 12 abates vence, ou o melhor em 8 minutos. Quem cai volta em 5 s.
- **Só dois jeitos de jogar junto:** todos contra a IA (cooperativo) ou time contra time. Não existe todos contra todos.
- **Placar:** Tab (PC) ou botão PLACAR (celular).
- **Chat:** o rádio (Enter) vira chat da sala; comece com "ia," para falar com o copiloto.
- **Voz da sala:** botão no lobby, por WebRTC (só online).

Como funciona: [Trystero](https://github.com/dmotz/trystero) encontra os jogadores por relays públicos do Nostr e liga os navegadores direto por WebRTC. Não tem servidor nosso nem custo. Em algumas redes (4G de certas operadoras, Wi-Fi corporativo) a conexão direta pode falhar, porque não usamos servidor TURN.

Testar sem internet, em duas abas: `http://localhost:8080/?rede=local`.

## Mundo Real (qualquer lugar do planeta)

No menu: **Mundo → Mundo real**, escolha a **Qualidade do mapa** e **onde voar**: um dos lugares prontos ou a busca (OpenStreetMap/Nominatim, só ao apertar Buscar). O jogo procura mar a até 60 km para o porta-aviões; sem mar, a decolagem é no ar e o pouso fica desligado.

- **Voo sem fim:** no Voo livre, a cada 60 km o mundo se recentraliza no avião e o mapa continua (o porta-aviões fica para trás). Nos modos de combate e no multiplayer o teatro é fixo; no multiplayer, todos usam o lugar do anfitrião.

- **Relevo real:** AWS Terrain Tiles (Terrarium), grátis e sem chave.
- **Chão:** imagem de satélite Sentinel-2 cloudless 2016 (EOX, CC BY 4.0, ~10 m por pixel: bonita do alto, borrada voando baixo).
- **Prédios:** OpenStreetMap via OpenFreeMap (vector tiles, sem chave e sem limite), extrudados com a altura do OSM. Bater num prédio derruba o avião.
- **Porta-aviões** no mar, 8 km ao sul de Copacabana; os inimigos chegam do norte, por cima da cidade.

| Qualidade | Detalhe do terreno | Prédios |
|---|---|---|
| Baixa (padrão no celular) | até zoom 12 | desligados |
| Média (padrão no PC) | até zoom 13 | raio de 1,6 km |
| Alta | até zoom 14 | raio de 3,2 km |

Limitações: o teatro é plano (~200 km em volta do porta-aviões); fora disso o mapa acaba. Os créditos dos dados aparecem no rodapé, como as licenças exigem.

## Joystick programável e VR

Menu (ou Pausa) → **CONTROLES · JOYSTICK · VR**.

- **Joystick:** qualquer manche, manete, volante ou controle USB/Bluetooth que o navegador enxergar. Aperte um botão do aparelho para ele aparecer, toque em **Definir** em cada ação e mexa o eixo ou aperte o botão. O sentido do eixo é gravado sozinho (por isso a tela pede "puxe para trás", "incline para a direita"). Dá para misturar aparelhos (manche + manete separados). Zona morta e curva ajustáveis; tudo fica salvo no navegador.
- **VR de celular:** tela dividida em dois olhos e o giroscópio mexe a cabeça dentro do cockpit. Funciona com óculos tipo Cardboard ou qualquer suporte de celular. Com o celular no óculos, pilote com joystick Bluetooth ou USB (OTG). Funciona mesmo com a rotação automática do celular desligada: o jogo detecta o celular deitado pelo giroscópio e gira a imagem. Toque 2× na tela para sair; segure 1 s se a imagem ficar de cabeça para baixo. O botão "Recentralizar" (ou a ação gravada no joystick) zera a direção da cabeça.
- **Olhar com o giroscópio sem óculos:** opção no mesmo painel.
- **Tela remota (PC desenha, celular mostra):** no PC, toque em **Transmitir para o celular** e escaneie o QR code com o celular (ou abra o link `?tela=CÓDIGO`). Escolha **VR** (óculos de celular) ou **tela**. O joystick fica no PC, a imagem e o som vão para o celular por WebRTC, direto pela rede de casa (a internet só é usada para parear). No VR, o PC desenha cada olho com uma sobra em volta e o celular move o recorte com o giroscópio na hora (Timewarp, como no ALVR/Oculus): a cabeça responde sem atraso, o resto do mundo chega com o atraso da rede (uns 50–150 ms no Wi-Fi 5 GHz). O PC pede para a tela não dormir; pode desligar o monitor, mas **não minimize a janela do jogo** (o navegador para de desenhar abas escondidas; o celular avisa se isso acontecer). Melhor resultado: PC no cabo de rede, celular no Wi-Fi 5 GHz.
- **Óculos de VR de verdade (WebXR, experimental):** Meta Quest, SteamVR, Windows MR. No PC: Chrome com o óculos ligado (Quest Link/Air Link ou SteamVR). No Quest: abra o site no navegador do próprio óculos. O botão só aparece ativo quando o navegador encontra um óculos. A cabeça é do óculos, o HUD vira um painel na frente do piloto e o joystick continua valendo.

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
