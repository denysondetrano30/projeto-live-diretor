/*
 * somun: "Relatar problema" (decidido com ela em 25/11) — usado pelo Diretor e pela somun cam no
 * navegador. O somun live e o somun tela têm a janela deles, que grava no mesmo lugar.
 *
 * Grava em Firestore › relatos (sem login: as regras só deixam criar, com tamanho limitado; ler e
 * marcar resolvido, só a conta dela, na página "Relatos" do Diretor).
 * Vai junto: o texto, o contato (opcional), o programa, a versão, o aparelho e as últimas mensagens
 * de erro da página (registro técnico). Print: nos programas do PC (aqui o navegador não deixa).
 */
(function () {
  var registro = [];
  function guarda(tipo, partes) {
    try {
      var linha = new Date().toISOString().slice(11, 19) + ' ' + tipo + ' ' + Array.prototype.map.call(partes, function (p) {
        if (p && p.stack) return String(p.stack);
        if (typeof p === 'object') { try { return JSON.stringify(p); } catch (e) { return String(p); } }
        return String(p);
      }).join(' ');
      registro.push(linha.slice(0, 2000));
      if (registro.length > 200) registro.shift();
    } catch (e) {}
  }
  ['error', 'warn'].forEach(function (tipo) {
    var original = console[tipo];
    console[tipo] = function () { guarda(tipo, arguments); return original.apply(console, arguments); };
  });
  window.addEventListener('error', function (e) { guarda('erro', [e.message + ' @ ' + (e.filename || '') + ':' + (e.lineno || '')]); });
  window.addEventListener('unhandledrejection', function (e) { guarda('promessa', [e.reason]); });

  var css = '.rlBg{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Outfit,system-ui,sans-serif}' +
    '.rlBox{background:#232323;border:1px solid #3a3a3a;border-radius:12px;padding:20px;max-width:440px;width:100%;display:flex;flex-direction:column;gap:12px;color:#f2f2f2;box-sizing:border-box}' +
    '.rlBox b{font-size:17px;font-weight:600}.rlBox p{margin:0;color:#a8a8a8;font-size:14px;line-height:1.45}' +
    '.rlBox textarea,.rlBox input{width:100%;box-sizing:border-box;background:#1c1c1c;border:1px solid #3a3a3a;border-radius:8px;color:#f2f2f2;font:inherit;font-size:15px;padding:10px}' +
    '.rlBox textarea,.rlBox input{-webkit-user-select:text;user-select:text}.rlBox textarea:focus,.rlBox input:focus{outline:none;border-color:#a8a8a8}.rlBox textarea{min-height:120px;resize:vertical}.rlRow{display:flex;gap:10px;justify-content:flex-end}' +
    '.rlBox button{border:0;border-radius:8px;min-height:40px;padding:0 16px;font:inherit;font-weight:600;cursor:pointer;background:#2a2a2a;color:#f2f2f2}' +
    '.rlBox button.ok{background:#fff;color:#141414}.rlBox button:disabled{opacity:.5;cursor:default}.rlErro{color:#e5483b;font-size:14px}';

  function aparelho() {
    var ua = navigator.userAgent || '';
    return ua.slice(0, 300) + ' · tela ' + screen.width + 'x' + screen.height;
  }

  function enviar(dados) {
    var cfg = window.PL_FIREBASE;
    if (!cfg || !cfg.apiKey) return Promise.reject(new Error('sem configuração'));
    var campos = {};
    Object.keys(dados).forEach(function (k) {
      var v = dados[k];
      if (v === undefined || v === null || v === '') return;
      campos[k] = typeof v === 'boolean' ? {booleanValue: v} : {stringValue: String(v)};
    });
    campos.em = {timestampValue: new Date().toISOString()};
    campos.resolvido = {booleanValue: false};
    var url = 'https://firestore.googleapis.com/v1/projects/' + cfg.projectId + '/databases/(default)/documents/relatos?key=' + cfg.apiKey;
    return fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({fields: campos})}).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
    });
  }

  /* opcoes: { app: 'diretor' | 'cam', versao, conta } */
  window.somunRelatar = function (opcoes) {
    opcoes = opcoes || {};
    if (!document.getElementById('rlCss')) {
      var s = document.createElement('style'); s.id = 'rlCss'; s.textContent = css; document.head.appendChild(s);
    }
    var bg = document.createElement('div'); bg.className = 'rlBg';
    bg.innerHTML = '<div class="rlBox" role="dialog" aria-modal="true"><b>Relatar problema</b>' +
      '<p>Conte o que aconteceu e o que você esperava. Vai junto um registro técnico (sem senhas).</p>' +
      '<textarea id="rlTexto" placeholder="O que aconteceu?"></textarea>' +
      '<input id="rlContato" placeholder="WhatsApp ou e-mail para resposta (opcional)" autocomplete="off">' +
      '<div class="rlErro" id="rlErro"></div>' +
      '<div class="rlRow"><button data-x>Cancelar</button><button class="ok" data-ok>Enviar</button></div></div>';
    document.body.appendChild(bg);
    var texto = bg.querySelector('#rlTexto'), ok = bg.querySelector('[data-ok]'), erro = bg.querySelector('#rlErro');
    texto.focus();
    function fechar() { bg.remove(); }
    bg.querySelector('[data-x]').onclick = fechar;
    bg.addEventListener('click', function (e) { if (e.target === bg) fechar(); });
    ok.onclick = function () {
      var t = texto.value.trim();
      if (!t) { erro.textContent = 'Escreva o que aconteceu.'; texto.focus(); return; }
      ok.disabled = true; ok.textContent = 'Enviando…'; erro.textContent = '';
      enviar({
        texto: t.slice(0, 4000),
        contato: bg.querySelector('#rlContato').value.trim().slice(0, 200),
        app: opcoes.app || 'diretor',
        versao: opcoes.versao || '',
        conta: (opcoes.conta || '').slice(0, 200),
        sistema: aparelho(),
        registro: (location.href.split('#')[0] + '\n' + registro.join('\n')).slice(-50000)
      }).then(function () {
        bg.querySelector('.rlBox').innerHTML = '<b>Obrigado!</b><p>Recebemos o seu relato.</p><div class="rlRow"><button class="ok" data-x>Fechar</button></div>';
        bg.querySelector('[data-x]').onclick = fechar;
      }).catch(function (e) {
        ok.disabled = false; ok.textContent = 'Enviar';
        erro.textContent = 'Não deu para enviar agora (' + (e && e.message || e) + '). Confira a internet e tente de novo.';
      });
    };
  };
})();
