# Projeto Live — app do Diretor

Página no navegador onde o diretor monta o culto (roteiro, destino de cada item, links do Google
Drive) e publica versões. A Projeção (FreeShow do Projeto Live) busca os cultos publicados na conta.

- `index.html`: o app inteiro (uma página).
- `firebase-config.js`: configuração pública do Firebase (não é senha). Sem ela, o app abre no modo
  de teste, com os dados só no navegador.
- `firestore.rules`: regras do Firestore (cada culto só é lido e mexido pela conta dona dele).
- `.github/workflows/pages.yml`: publica no GitHub Pages a cada envio para `main`.
