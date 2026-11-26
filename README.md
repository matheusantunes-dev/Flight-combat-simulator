# FCS · Flight Combat Simulator

Jogo de combate aéreo 3D em HTML/CSS/JS (Three.js), com cockpit do F-14, esquadrilha de 6 alas e rádio com IA que roda no navegador.

## Instalar como app (PWA)

No Chrome do Android: menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial"). No PC: ícone de instalar na barra de endereço. Depois da primeira visita, o jogo abre até sem internet (a IA local e o multiplayer continuam precisando de rede).

Ao mudar modelos ou bibliotecas, suba a versão em `sw.js` (`const VERSION = 'fcs-v2'`) para os jogadores receberem os arquivos novos.

## Céu, Sol, Lua e clima

- **Céu físico:** modelo de Preetham, o mesmo do `THREE.Sky`, com espalhamento Rayleigh e Mie. Fica azul de dia e vai para laranja e roxo quando o Sol baixa, sem cores pintadas à mão. Luz, névoa, mar e nuvens seguem a altura do Sol.
- **Horário:** Dia, Pôr do sol, Noite ou **Tempo real**. No tempo real, Sol e Lua (com a fase certa) são calculados pelo relógio do aparelho e pela latitude e longitude do teatro, usando os algoritmos do SunCalc. À noite aparecem estrelas, e a Lua cheia ilumina a cena.
- **Clima:** Limpo, Nublado, Chuva, Tempestade ou **Ao vivo**, que usa a API Open-Meteo (grátis e sem chave) com os dados de agora do lugar do teatro: temperatura, nuvens, chuva, vento e rajadas. No multiplayer, todos voam no clima do anfitrião.
- **Vento de verdade:** o vento move a massa de ar, ou seja, a sustentação e o arrasto usam a velocidade em relação ao ar. Por isso o avião aproa contra o vento (caranguejo), e a velocidade no ar e a velocidade no solo ficam diferentes. O vento aumenta com a altura e tem rajadas.
- **Nuvens atravessáveis:** dentro da nuvem a névoa fecha, o que esconde o avião no PvP, e há turbulência. A quantidade e a altura das nuvens vêm do clima.
- **Chuva:** a chuva cai em riscos inclinados pela velocidade. No cockpit, as gotas no canopi são empurradas para trás pelo vento.
- **Voo rasante:** abaixo de 15 m sobre a água, o avião levanta spray.
- **Ainda não incluído:** o shader `THREE.Water` com reflexo em tempo real. Ele desenha a cena duas vezes por quadro e derrubaria o desempenho no celular. O mar atual já reflete o céu pelo mapa de ambiente.

## Sons dos motores

O som de cada motor é montado com **gravações reais** em loop. O tom e o volume de cada camada seguem a rotação e a potência, como o FMOD faz no MSFS e no X-Plane:

- **Jato:** um motor a jato de verdade gravado em bancada, mais o assobio de um turbofan e o pós-combustor. Cada caça tem a sua "voz", com tom, assobio e ronco do motor real: TF30 do F-14, F110 do F-16, RD-33 do MiG-29, M53 do Mirage, J79 do F-4 (turbojato, mais rouco), TF34 do A-10 (alto bypass, mais assobio) e assim por diante. Por cima vai uma camada sintetizada do tom do fan, com o número de pás × N1 de cada motor.
- **Turboélice (A-29, PT6A-68):** gravação de um PT6 de verdade. Em marcha lenta domina o chiado do compressor; com potência, entram o ronco do escape e a hélice, cuja rotação quase não muda por causa do governador.
- **Hélice a pistão:** gravações de motor radial em marcha lenta, média e alta, misturadas pela rotação.
- **Canhão:** gravação real do GAU-8 do A-10, reamostrada pela cadência de cada arma (M61, .50 do A-29 etc.).
- **Vento:** ruído de ar de um avião militar em voo, que cresce com a pressão dinâmica.

No cockpit, tudo fica abafado.

**Trocar sons:** no hangar, toque em **🔊 Sons do avião selecionado**. Dá para mudar o tipo de motor e carregar gravações próprias em loop do motor e do pós-combustor, por arquivo ou link. Também dá para ajustar o tom, o volume e a mistura, e ouvir antes de salvar. Tudo fica salvo por avião.

**Gravações usadas** (editadas: cortadas, em loop, com o nível ajustado):
- PT6 e hélice: "seaplane takeoff/start" por jerry.berumen (Freesound 772822 e 772823, **CC BY 4.0**), processadas por ROPlanes+ (fakekerman).
- Radial: "PZL 104 Wilga start engine" por jarekgie (Freesound 140436, **CC BY 3.0**) e "P-47 Flyby" por Fight2FlyPhoto (Freesound 143560, **CC BY 3.0**), processadas por ROPlanes+.
- Jato: "Jet Engine" por m_cel (Freesound 534856, **CC0**) e "jetengine loop.aif" por smidoid (Freesound 128614, **CC BY 4.0**).
- Pós-combustor: "Rocket Boost Engine Loop" por qubodup (Freesound 146770, **CC0**).
- Ar: "Plane Loop" por qubodup (Freesound 184723, **CC0**).
- GAU-8: "A-10 Warthog flyby and shooting" por qubodup (Freesound 205582, **CC0**), recortado pelo projeto WARTHOG.

## Câmera do cockpit ajustável (qualquer avião)

Se a cabeça do piloto não ficou boa em algum avião, dá para ajustar a posição sem sair do voo. No PC, use **Ctrl+Shift+↑/↓** para frente e trás, **Ctrl+Shift+PgUp/PgDn** para subir e descer e **Ctrl+Shift+←/→** para o lado. **Ctrl+Shift+Backspace** volta ao padrão. No celular, use os botões da **pausa**. Cada toque move 2,5 cm e o ajuste fica salvo para cada avião. Só a câmera muda: o modelo visto de fora, a física e o trem continuam iguais.

## Avião por link (Sketchfab ou .glb)

No hangar, toque em **＋ Avião por link** e cole o link de um modelo do Sketchfab (precisa estar liberado para download) ou de um arquivo `.glb`. Também dá para escolher um `.glb` ou `.zip` de glTF do seu aparelho. Depois, escolha o **caça base**: o avião novo herda dele a física, as armas reais, o canhão e o assento ejetável. Informe também o **comprimento real**, que o jogo usa para acertar a escala.

- **Sketchfab:** usa a API oficial de download, com o seu token (Sketchfab → Settings → Password & API). O token fica só neste aparelho e só é enviado ao próprio Sketchfab.
- **O que o jogo ajusta sozinho:** descobre o eixo e o nariz (a deriva é o ponto mais alto e fica atrás), centraliza o avião, põe as rodas no chão e acha as peças de trem e de vidro pelos nomes. Também dá um palpite da posição do olho do piloto. Se algo sair torto, use **Girar 90°**, **Inverter nariz** e o ajuste do olho.
- **Onde fica salvo:** o arquivo vai para o IndexedDB do navegador, então não precisa baixar de novo, e o avião continua no hangar depois de recarregar a página.
- **Multiplayer:** os outros jogadores veem o caça base, porque eles não têm o seu arquivo.
- **Limites:** se o site do link não liberar CORS, o navegador bloqueia o download. Nesse caso, baixe o arquivo e use a opção "arquivo do seu aparelho". Modelos acima de ~80 MB são recusados.

## Olhar livre com o mouse (só PC)

Aperte **Alt+C** (o mesmo atalho do DCS) ou clique com o **botão do meio** (como no MSFS) para prender o cursor. A partir daí, é só mover o mouse para virar a cabeça do piloto, sem clicar. A cabeça fica onde você deixou, e o duplo clique centraliza. Para soltar, aperte **Alt+C** de novo, o botão do meio ou **Esc**; o Esc só solta o mouse e não pausa o jogo. Também funciona na câmera externa e no modo a pé. Usa a Pointer Lock API do navegador, e no celular fica desligado.

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

Modelos de outros autores (nós `Object_*`, eixos trocados) passam antes por `tools/normalizar-modelo.mjs`: ele gira o nariz para +X, deixa Y para cima e renomeia as peças para o padrão do jogo (`-airframe`, `-canopy`, `-landingOn`). Depois, `tools/encolher-modelo.mjs` recomprime as texturas. No `index.html`, cada caça tem `scale`, `eye` (olho do piloto em metros), `gearH` e, se o modelo veio com o trem recolhido, `pgear` (trem desenhado pelo jogo: pernas e rodas).

## Armas e desempenho reais

- **Velocidade máxima calibrada:** o arrasto de cada caça foi ajustado para bater a velocidade real em altitude (F-14 Mach 2,34, F-16 2,05, MiG-29 2,25, Mirage 2,2...). Ao nível do mar vale o limite estrutural de cada um (~750-810 nós). A ferramenta `node tools/velocidade.mjs` mostra a tabela.
- **Cargas reais por avião**, em 6 estações: 1 canhão · 2 IR · 3 radar · 4 longo alcance · 5 míssil ar-solo · 6 bombas.
  - **F-14B:** AIM-9M, AIM-7M, AIM-54C e GBU-12 com o pod LANTIRN. O F-14 não levava Maverick.
  - **F-16C:** AIM-9X, AIM-120C, AGM-65D e GBU-12.
  - **MiG-29A:** R-73, R-27R e FAB-500 burra.
  - **Mirage 2000C:** Magic II, Super 530D e Mk 82.
- **Bombas:**
  - **Burras** (Mk 82, FAB-500): mira CCIP no HUD. Solte quando o círculo cair no alvo.
  - **A laser** (GBU-12/27, KAB): só guiam enquanto você mantém a trava, e o pod enxerga para baixo e para trás.
  - **GPS** (GBU-39, JDAM, AASM): gravam a coordenada na soltura, você pode ir embora, e planam de longe. Alvo que se move escapa.
  - **Explosão em área:** pega o que estiver perto. Soltar baixo demais acerta o próprio avião com estilhaços.
- **Mísseis especiais:** Exocet (só em navio, voa rente ao mar), Kh-59M (TV, longo alcance), Meteor (ramjet), R-37M.
- **Furtividade:** F-22, F-117 e Su-57 são vistos bem mais perto pelo radar inimigo e pelos SAMs.
- **Caças novos com ficha pronta** (F-15E, Rafale M, Su-57, Gripen, Su-35, Su-34, F-117, A-10C, Su-30MKK, F-22, Su-25): velocidade, armas, canhão e assento reais já estão no jogo. Eles aparecem no hangar quando o modelo 3D (`models/<id>.glb`) entrar.

## Hangar 3D

No menu, na aba **Jogar**, o caça aparece num hangar fechado, numa plataforma giratória com refletores, como na escolha de avião do Ace Combat.
- Tocar num avião do hangar mostra o modelo e a ficha, mesmo bloqueado. A ficha tem barras de velocidade, manobra, estabilidade, ar-ar, ar-solo e alcance, calculadas dos dados do próprio jogo e comparadas com o resto da frota, além das armas e do assento.
- **VER NO HANGAR** esconde o menu. Aí dá para arrastar para girar, usar a roda do mouse ou a pinça para aproximar, e trocar de avião com ◀ ▶ antes de tocar em PILOTAR ESTE.

## Progressão, missões e ranking

- **Hangar com PM (pontos de mérito):** o F-14 começa liberado; F-16 (1.500 PM), Mirage (3.000 PM) e MiG-29 (5.000 PM) são comprados com os pontos das partidas. Missão cumprida rende 1,5× os pontos. A opção "Hangar liberado" no menu desliga a progressão.
- **Missões 4 e 5:** escolta do AWACS (se ele cair, a missão acaba) e interceptação com relógio (150 s por onda).
- **Campanha 2 · ataque ao solo e ao mar (missões 6 a 10):** liberada desde o início, com sequência própria. Ataque à ilha (radar e depósitos), SEAD (três baterias SAM), comboio que precisa ser parado antes do porto, três fragatas com SAM e uma missão final mista com ás.
- **Alvos de solo e mar:** SAM (míssil de radar: solte CHAFF e faça curva), antiaérea de canhão (fique alto), radar de busca (sem ele os SAMs só enxergam de perto, então derrube primeiro), tanques, caminhões, depósitos de combustível e fragatas (aguentam dois mísseis e afundam devagar). No HUD aparecem como losangos; os laranja com "ALVO" são os objetivos da missão.
- **Arma 5, ar-solo:** AGM-65 Maverick no F-14 e no F-16 (4 no F-16), Kh-25ML no MiG-29 e AS-30L no Mirage. Selecione com a tecla 5 (ou ARMA no celular), trave com T e dispare. Com a arma 5, o T trava primeiro os alvos no solo; com as outras, os aviões. Míssil ar-ar não vai em alvo de solo, mas o canhão vale para os dois.
- **Menu em abas:** Jogar, Mundo, Ajustes e Ranking. O botão DECOLAR fica sempre visível com o resumo do que vai decolar; no celular deitado ele vira uma coluna à direita.
- **Nuvens:** dentro delas, mísseis perdem o alvo com mais facilidade, dos dois lados.
- **Câmera do abate:** 2 s em câmera lenta seguindo o inimigo abatido por míssil. Qualquer tecla ou toque pula; dá para desligar no menu.
- **Ranking global:** função `api/score.js` na Vercel + Upstash Redis (plano grátis: 256 MB e 500 mil comandos por mês, sem cartão). Para ligar: Vercel → projeto → **Storage → Create Database → Upstash (Redis)** → conectar ao projeto → **Redeploy**. Sem isso, o ranking fica salvo só no aparelho.

## Multiplayer (até 6 pilotos por sala)

No menu: **MULTIPLAYER** → **Criar sala** → **Copiar convite** ou **Compartilhar** (WhatsApp, Discord…). Quem abre o link cai direto na sala. O anfitrião escolhe o modo e decola com todo mundo.

- **Cooperativo vs IA:** a sala inteira defende a frota contra as ondas. Os inimigos rodam no aparelho do anfitrião; se ele sair, a partida acaba.
- **PvP por times (Azul × Vermelho, até 3 por time):** quem entra vai para o time menor e dá para trocar no lobby. Sem fogo amigo; colegas aparecem como losango azul no HUD e não entram no radar de alvos. Cada time nasce de um lado do mapa. Primeiro time a 12 abates vence, ou o melhor em 8 minutos. Quem cai volta em 5 s.
- **Se alguém cair, a partida continua:** se o anfitrião sai, o próximo da lista assume (no coop, a IA passa a rodar no aparelho dele). Quem volta pelo mesmo link, no mesmo aparelho e navegador, recupera o time e os abates. No PvP, se um time fica sem ninguém, o outro vence por W.O. depois de 15 s, a menos que alguém volte antes.
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

## Ejeção, paraquedas e modo a pé

- **Ejetar:** Ctrl+E três vezes, como no DCS. No celular é SISTEMAS → EJETAR, segurando 1 s. No joystick dá para gravar o botão.
- **Sequência do assento** (padrão ACES II; F-14 com Martin-Baker GRU-7A, MiG-29 com K-36D, Mirage com Mk 10):
  - Modo 1, abaixo de 250 nós e 15.000 pés: o paraquedas abre logo.
  - Modo 2, acima de 250 nós: o drogue freia antes de o paraquedas abrir.
  - Modo 3, acima de 15.000 pés: queda estabilizada no drogue até 15.000 pés.
- **Física:** catapulta e foguete empurram para o "teto" do avião, então ejetar invertido e baixo mata. O paraquedas desce a ~7 m/s e, depois de soltar os 4 tirantes, dá para dirigir com A/D.
- **Ferimentos:** acima de 600 nós o vento machuca, e pousar acima de 8,5 m/s torce o tornozelo.
- **F-14:** a ejeção é comandada, então o RIO sai 0,4 s antes de você.
- **No mar:** o colete infla e o bote sai sozinho 4 s depois da separação. E chama o resgate (SH-60). O tempo foi encurtado para 12 s; na vida real seriam de 20 minutos a horas.
- **A pé:** com o avião parado no convés, Shift+E sai e E entra de novo. W/A/S/D anda, Shift corre, Espaço pula e C troca 1ª/3ª pessoa. Dá para andar entre os F-14 estacionados e até cair do convés no mar. No celular, o manche virtual anda e aparecem os botões CORRER, PULAR e ENTRAR.
- **Depois do resgate:** no Voo livre você volta ao convés com um avião novo na catapulta. Nas missões, ejetar encerra a missão quando você é resgatado. No multiplayer, você volta para a partida depois de pousar.

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
- F-15E, Rafale M, Su-57, Gripen, Su-35 e Su-34: bohmerang, **CC BY-NC-SA 4.0**.
- F-117A e F-22A: andertan, **CC BY 4.0**. F-16F Block 60: MirzaArrafiERV_45, **CC BY 4.0**.
- A-10C: blarg, **CC BY 4.0** (bombas do modelo removidas). Su-30MKK: Jeyhun1985, **CC BY 4.0**. Su-25: Alexios_Apokaukos, **CC BY 4.0**.
- F/A-18E Super Hornet: Jeyhun1985, **CC BY 4.0**. F-4E Phantom II: Kenny3D89, **CC BY 4.0** (canopis, que vieram abertos, removidos). A-29 Super Tucano: KOG_THORNS, **CC BY 4.0** (malha de colisão removida; a hélice gira no jogo: pás visíveis em baixa rotação e disco translúcido com a manete toda, como nos simuladores).
- J-11B (usado como Flanker inimigo): Rhine_Lab_Muelsyse, **CC BY 4.0**.
- Alterações nos modelos CC BY: reorientados (nariz em +X), simplificados, texturas recomprimidas; F-117, F-22 e Su-30 ganham trem de pouso procedural no jogo (os modelos vieram com o trem recolhido); no F-16F e no A-10 o trem, que veio fundido na fuselagem, é recortado para recolher em voo.

Por causa da licença NC dos caças, este projeto **não pode ser vendido nem monetizado** sem trocar esses modelos.
