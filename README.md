# Tomcat: Defesa da Frota

Jogo de combate aéreo 3D em HTML/CSS/JS (Three.js), com cockpit do F-14, esquadrilha de 6 alas e rádio com IA que roda no navegador.

## Publicar no GitHub Pages (5 minutos)

1. Crie um repositório público no GitHub (ex.: `tomcat`).
2. Envie esta pasta inteira:
   ```bash
   git init && git add . && git commit -m "Tomcat: primeira versão"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/tomcat.git
   git push -u origin main
   ```
3. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. O workflow `.github/workflows/pages.yml` roda sozinho. O link aparece em **Actions** e fica assim: `https://SEU_USUARIO.github.io/tomcat/`.

Testar local antes: `python3 -m http.server 8080` e abra `http://localhost:8080` (abrir o arquivo direto com duplo clique não funciona, porque os modelos 3D são carregados por HTTP).

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
- O microfone exige HTTPS (o GitHub Pages já é HTTPS).

## Créditos e licenças

- Three.js (MIT).
- WebLLM / MLC AI (Apache-2.0) e modelos Qwen2.5 (Alibaba, licença Apache-2.0).
- Modelos 3D dos caças F-14, F-16, MiG-29 e Mirage 2000: bohmerang, **CC BY-NC-SA** (uso não comercial, com atribuição e mesma licença).
- MiG-29 e Su-27 simples: Zuujis, CC0.

Por causa da licença NC dos caças, este projeto **não pode ser vendido nem monetizado** sem trocar esses modelos.
