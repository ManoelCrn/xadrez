let pending = null;
export function confirmGame(message, { title = 'Confirmar ação', accept = 'Continuar' } = {}) {
  if (pending) return Promise.resolve(false);
  return new Promise(resolve => {
    const previous=document.activeElement;
    const panel=document.createElement('section');panel.id='game-confirm';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','game-confirm-title');
    panel.innerHTML='<div class="game-over-card"><h2 id="game-confirm-title"></h2><p></p><div class="game-over-actions"><button data-confirm="accept"></button><button data-confirm="cancel">Cancelar</button></div></div>';
    panel.querySelector('h2').textContent=title;panel.querySelector('p').textContent=message;panel.querySelector('[data-confirm="accept"]').textContent=accept;
    const done=value=>{panel.remove();document.removeEventListener('keydown',keydown);pending=null;previous?.focus();resolve(value);};
    const keydown=e=>{if(e.key==='Escape'){e.preventDefault();done(false);}if(e.key==='Tab'){const buttons=[...panel.querySelectorAll('button')];e.preventDefault();buttons[document.activeElement===buttons[0]?1:0].focus();}};
    pending=done;panel.querySelector('[data-confirm="accept"]').onclick=()=>done(true);panel.querySelector('[data-confirm="cancel"]').onclick=()=>done(false);document.addEventListener('keydown',keydown);document.body.append(panel);panel.querySelector('[data-confirm="cancel"]').focus();
  });
}
