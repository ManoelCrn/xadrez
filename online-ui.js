import { OnlineMatch, createPeer } from './multiplayer.js?v=6';
export function setupOnline(adapter) {
  const panel = document.createElement('section');
  panel.id = 'online-panel';
  panel.setAttribute('aria-label', 'Multiplayer online');
  panel.innerHTML = `<details><summary id="online-summary">Jogar online · PC e VR</summary>
    <div class="online-body"><button id="online-hide" type="button" aria-label="Recolher painel de jogo online">Recolher painel</button><p>Um cria a sala. O outro entra para jogar. Na TV, use o mesmo código para assistir.</p>
    <div class="online-actions"><button id="online-create">Criar sala</button>
    <label>Sala <input id="online-code" inputmode="numeric" pattern="[0-9]{8}" maxlength="8" placeholder="12345678" autocomplete="off"></label>
    <button id="online-join">Entrar para jogar</button><button id="online-watch">Assistir como espectador</button></div>
    <p id="online-status" role="status" aria-live="polite">Também funciona entre PC e óculos.</p>
    <div class="online-actions"><button id="online-copy" hidden>Copiar código</button><button id="online-resume" hidden>Retomar sala</button><button id="online-exit" hidden>Sair da sala</button></div>
    <div class="online-actions"><button id="online-fullscreen" hidden>Tela cheia</button></div><small>Crie ou entre na sala antes de entrar em VR. Mantenha a aba aberta.</small></div></details>`;
  document.body.append(panel);
  const el = id => document.getElementById('online-' + id);
  const details = panel.querySelector('details');
  let match, wasConnected = false;
  el('hide').onclick = () => { details.open = false; };
  window.addEventListener('chess:mode-selected', () => { details.open = false; });
  const render = () => {
    const color = match.role === 'spectator' ? 'Espectador · somente visualização' : match.role === 'host' ? 'Brancas' : 'Pretas';
    let text = match.message || 'Também funciona entre PC e óculos.';
    if (match.connected && match.role === 'spectator') {
      text = match.chess.game_over() ? match.chess.in_checkmate() ? `Xeque-mate. ${match.chess.turn() === 'w' ? 'Pretas' : 'Brancas'} venceram.` : 'Partida encerrada: empate.'
        : !match.playersReady ? 'Partida pausada: aguardando o segundo jogador.' : `Vez das ${match.chess.turn() === 'w' ? 'brancas' : 'pretas'}.${match.chess.in_check() ? ' Xeque!' : ''}`;
    } else if (match.connected) {
      text = match.chess.game_over() ? (match.chess.in_checkmate() ? `Xeque-mate. ${match.chess.turn() === 'w' ? 'Pretas' : 'Brancas'} venceram.` : 'Partida encerrada: empate.') : `${match.pending ? 'Confirmando jogada…' : match.canMove() ? 'Sua vez.' : 'Vez do adversário.'}${match.chess.in_check() ? ' Xeque!' : ''}`;
    }
    if (match.active && match.spectatorCount) text += ` ${match.spectatorCount} espectador(es).`;
    const status = match.active ? `Sala ${match.code} · Você: ${color}. ${text}` : text;
    el('status').textContent = status;
    adapter.status(status);
    let end = document.getElementById('online-game-over');
    if (match.active && match.connected && match.chess.game_over()) {
      if (!end) {
        end = document.createElement('section'); end.id='online-game-over'; end.className='end-dialog';
        end.setAttribute('role','dialog'); end.setAttribute('aria-modal','true');
        end.innerHTML='<div class="game-over-card"><h2></h2><p></p><div class="game-over-actions"><button data-action="replay">Jogar novamente</button><button data-action="menu">Sair da sala / Menu</button><button data-action="board">Ver tabuleiro</button></div></div>';
        document.body.append(end);
        end.querySelector('[data-action="replay"]').onclick=()=>match.requestRematch();
        end.querySelector('[data-action="menu"]').onclick=()=>{match.stop();location.reload();};
        end.querySelector('[data-action="board"]').onclick=()=>end.classList.add('game-over-compact');
      }
      end.querySelector('h2').textContent=match.chess.in_checkmate() ? `XEQUE-MATE! ${match.chess.turn()==='w'?'Pretas':'Brancas'} venceram.` : 'EMPATE — partida encerrada';
      end.querySelector('p').textContent=match.role==='spectator'?'Aguardando a decisão dos jogadores.':'Para a revanche, os dois jogadores precisam clicar em Jogar novamente.';
      const replay=end.querySelector('[data-action="replay"]');
      replay.hidden=match.role==='spectator'; replay.disabled=match.rematchVotes?.includes(match.role);
      replay.textContent=replay.disabled?'Aguardando adversário…':'Jogar novamente';
    } else end?.remove();
    el('create').disabled = el('join').disabled = el('watch').disabled = match.active;
    el('fullscreen').hidden = !match.active || match.role !== 'spectator';
    el('code').disabled = match.active;
    el('copy').hidden = !match.active;
    el('exit').hidden = !match.active;
    el('resume').hidden = !match.saved() || match.connected;
    panel.classList.toggle('online-connected', match.connected);
    el('summary').textContent = match.active
      ? `Sala ${match.code} · ${match.connected ? match.chess.game_over() ? 'Partida encerrada' : match.role === 'spectator' ? 'Espectador' : match.canMove() ? 'Sua vez' : 'Vez do adversário' : 'Conexão / opções'}`
      : match.saved() ? 'Jogar online · Retomar sala' : 'Jogar online · PC e VR';
    if (match.connected && !wasConnected) details.open = false;
    if (!match.connected && wasConnected) details.open = true;
    wasConnected = match.connected;
  };
  match = new OnlineMatch({ Chess: globalThis.Chess, peerFactory: createPeer, onState: render, onBoard: (moves, meta) => adapter.board(moves, match, meta) });
  async function start(role, resume = false) {
    if (!resume && adapter.hasMoves() && !confirm('Iniciar uma sala encerra a partida local atual. Continuar?')) return;
    try { await match.start(role, el('code').value.trim(), resume); }
    catch (err) { match.status(err.message); }
  }
  el('create').onclick = () => start('host');
  el('join').onclick = () => start('guest');
  el('watch').onclick = () => start('spectator');
  el('fullscreen').onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      details.open = false;
    } catch { el('status').textContent = 'O navegador não permitiu tela cheia. No PC, você também pode usar F11.'; }
  };
  el('code').onkeydown = event => { if (event.key === 'Enter') start('guest'); };
  el('resume').onclick = () => { const saved = match.saved(); if (saved) start(saved.role, true); };
  el('copy').onclick = async () => { try { await navigator.clipboard.writeText(match.code); } catch { el('status').textContent = `Código da sala: ${match.code}`; } };
  el('exit').onclick = () => { if (confirm('Sair da sala e voltar ao menu?')) { match.stop(); location.reload(); } };
  render();
  return match;
}
