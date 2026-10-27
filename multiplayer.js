// Transport is deliberately separate from rendering. The host validates all moves.
const STORAGE = 'chess-online-v1';
const PREFIX = 'chess-vr-v1-';
export class OnlineMatch {
  constructor({ Chess, peerFactory, storage = globalThis.sessionStorage, onState = () => {}, onBoard = () => {} }) {
    Object.assign(this, { Chess, peerFactory, storage, onState, onBoard });
    this.active = false;
    this.connected = false;
    this.pending = false;
    this.generation = 0;
    this.chess = new Chess();
    this.spectators = new Set();
    this.incoming = new Set();
    this.playersReady = false;
    this.spectatorCount = 0;
  }
  saved() { try { return JSON.parse(this.storage.getItem(STORAGE)); } catch { return null; } }
  persist() { try { this.storage.setItem(STORAGE, JSON.stringify({ role: this.role, code: this.code, token: this.token, opponent: this.opponent, moves: this.moves, id: this.id, round: this.round })); } catch {} }
  status(message) { this.message = message; this.onState(this); }
  canMove() { return this.role !== 'spectator' && this.playersReady && this.active && this.connected && !this.pending && !this.chess.game_over() && this.chess.turn() === (this.role === 'host' ? 'w' : 'b'); }
  async start(role, code, resume = false) {
    if (!['host', 'guest', 'spectator'].includes(role)) throw new Error('Modo de entrada inválido.');
    this.stop(false);
    const saved = resume ? this.saved() : null;
    if (saved && saved.role !== role) throw new Error('Sessão inválida.');
    this.role = role;
    this.code = saved?.code || code || (role === 'host' ? Array.from(crypto.getRandomValues(new Uint8Array(8)), n => n % 10).join('') : '');
    if (!/^\d{8}$/.test(this.code)) throw new Error('Digite os 8 números da sala.');
    this.token = saved?.token || crypto.randomUUID();
    this.id = saved?.id || crypto.randomUUID();
    this.opponent = saved?.opponent || null;
    this.round = saved?.round || 0; this.rematchVotes = [];
    this.moves = saved?.moves || [];
    this.chess = this.validateHistory(this.moves);
    this.active = true;
    this.persist();
    this.onBoard(this.moves);
    this.status('Conectando ao serviço de salas…');
    const generation = this.generation;
    try {
      const peer = await this.peerFactory(role === 'host' ? PREFIX + this.code : undefined);
      if (generation !== this.generation) { peer.destroy(); return; }
      this.peer = peer;
      this.peer.on('open', () => {
        if (generation !== this.generation) return;
        clearTimeout(this.openTimer);
        if (role === 'host') this.status('Sala ' + this.code + ' — aguardando o outro jogador.');
        else this.attach(this.peer.connect(PREFIX + this.code, { reliable: true, serialization: 'json' }));
      });
      this.peer.on('connection', connection => {
        if (generation !== this.generation) { connection.close(); return; }
        if (role !== 'host' || this.incoming.size >= 12) {
          connection.on('open', () => { connection.send({ type: 'reject', reason: 'A sala está ocupada. Tente novamente.' }); setTimeout(() => connection.close(), 150); });
          return;
        }
        this.attach(connection);
      });
      this.peer.on('error', err => {
        if (generation !== this.generation) return;
        clearTimeout(this.openTimer);
        const messages = { 'peer-unavailable': 'Sala não encontrada. Confira o código e se o criador está com o jogo aberto.', 'unavailable-id': 'Esta sala ainda está aberta em outra aba. Feche-a e tente retomar novamente.', 'network': 'Não foi possível acessar o serviço de salas. Confira a conexão.', 'server-error': 'O serviço de salas está indisponível.' };
        if (!this.connected) this.fail(messages[err.type] || 'Falha na conexão. Tente retomar a sala.');
      });
      this.peer.on('disconnected', () => {
        if (generation === this.generation && !peer.destroyed && this.connected) { try { peer.reconnect(); } catch {} }
      });
      this.openTimer = setTimeout(() => { if (!this.connected) this.fail('O serviço de salas não respondeu. Tente novamente.'); }, 20000);
    } catch (err) { this.fail(err.message || 'Não foi possível iniciar a conexão.'); }
  }
  validateHistory(moves) {
    if (!Array.isArray(moves) || moves.length > 6000) throw new Error('Histórico inválido.');
    const chess = new this.Chess();
    for (const move of moves) {
      if (!move || !/^[a-h][1-8]$/.test(move.from) || !/^[a-h][1-8]$/.test(move.to) || !/^[qrbn]$/.test(move.promotion || 'q') || !chess.move(move)) throw new Error('Jogada inválida recebida.');
    }
    return chess;
  }
  attach(connection) {
    const isHost = this.role === 'host';
    const generation = this.generation;
    if (isHost) this.incoming.add(connection);
    else this.connection = connection;
    let acceptedRole = null;
    clearTimeout(this.openTimer);
    const reject = reason => {
      if (connection.open) connection.send({ type: 'reject', reason });
      setTimeout(() => connection.close(), 150);
    };
    const timer = setTimeout(() => {
      if (generation !== this.generation || acceptedRole) return;
      connection.close();
      if (!isHost) this.fail('Não foi possível conectar à sala. A rede pode bloquear conexões diretas.');
    }, 20000);
    connection.on('open', () => {
      if (!isHost) connection.send({ type: 'hello', version: 2, role: this.role, token: this.token });
    });
    connection.on('data', data => {
      if (generation !== this.generation || !data || typeof data !== 'object') return;
      if (!isHost && this.connection !== connection) return;
      try {
        if (!isHost && data.type === 'reject') { this.fail(data.reason || 'Conexão recusada.'); return; }
        if (isHost && data.type === 'hello' && !acceptedRole) {
          const role = data.role || 'guest'; // Existing player clients sent no role.
          if (![1, 2].includes(data.version) || !['guest', 'spectator'].includes(role)
              || typeof data.token !== 'string' || !data.token.length || data.token.length > 100) {
            reject('Entrada inválida. Atualize a página e tente novamente.'); return;
          }
          if (role === 'spectator') {
            if (this.spectators.size >= 8) { reject('Limite de 8 espectadores atingido.'); return; }
            this.spectators.add(connection);
          } else {
            if (this.connection) { reject('Esta sala já tem dois jogadores.'); return; }
            if (this.opponent && this.opponent !== data.token) {
              reject('Sala reservada ao jogador que iniciou esta partida.'); return;
            }
            this.opponent = data.token; this.connection = connection;
            this.connected = true; this.playersReady = true; this.pending = false;
          }
          acceptedRole = role; clearTimeout(timer); this.incoming.delete(connection);
          this.spectatorCount = this.spectators.size;
          this.persist(); this.sendState(); this.status(this.connected ? 'Jogadores conectados.' : 'Aguardando o segundo jogador.');
        } else if (isHost && acceptedRole === 'guest' && this.connection === connection && data.type === 'move') {
          if (data.id !== this.id || data.ply !== this.moves.length || this.chess.turn() !== 'b') { this.sendState(connection); return; }
          this.commit(data.move);
        } else if (isHost && acceptedRole === 'guest' && this.connection === connection && data.type === 'rematch') {
          if (data.id === this.id) this.voteRematch('guest');
        } else if (!isHost && data.type === 'state') {
          const chess = this.validateHistory(data.moves);
          if (chess.fen() !== data.fen || typeof data.id !== 'string') throw new Error('Tabuleiro recebido não confere.');
          const round = Number.isInteger(data.round) ? data.round : 0;
          if (acceptedRole && (data.id !== this.id || round < this.round || (round === this.round && data.moves.length < this.moves.length))) return;
          this.round = round;
          this.rematchVotes = Array.isArray(data.rematchVotes) ? data.rematchVotes : [];
          const changed = !acceptedRole || data.id !== this.id || JSON.stringify(data.moves) !== JSON.stringify(this.moves);
          this.id = data.id; this.moves = data.moves; this.chess = chess;
          acceptedRole = this.role; clearTimeout(timer); clearTimeout(this.moveTimer);
          this.connected = true; this.pending = false;
          this.playersReady = data.playersReady !== false;
          this.spectatorCount = Number.isInteger(data.spectatorCount) ? data.spectatorCount : 0;
          this.persist();
          // Keep the displayed chess instance current even for connection-only updates.
          this.onBoard(this.moves, { changed });
          this.status(this.role === 'spectator' ? 'Acompanhando a partida.' : 'Jogadores conectados.');
        } else if (isHost && acceptedRole && data.type === 'sync') this.sendState(connection);
        // Spectator move packets are intentionally ignored, even if forged.
      } catch (err) {
        if (isHost) { reject('Mensagem inválida.'); connection.close(); }
        else this.fail(err.message);
      }
    });
    const disconnected = () => {
      clearTimeout(timer); this.incoming.delete(connection);
      if (generation !== this.generation) return;
      if (isHost) {
        this.spectators.delete(connection); this.spectatorCount = this.spectators.size;
        if (this.connection === connection) {
          this.connection = null; this.connected = false; this.playersReady = false; this.pending = false;
        }
        if (acceptedRole) {
          this.sendState();
          this.status(this.connected ? 'Jogadores conectados.' : 'Segundo jogador desconectado ou aguardando entrada. A partida está pausada.');
        }
      } else if (this.connection === connection) {
        this.connection = null; this.connected = false; this.playersReady = false; this.pending = false;
        this.status('Conexão com a sala interrompida. Use Retomar sala.');
      }
    };
    connection.on('close', disconnected); connection.on('error', disconnected);
  }
  sendState(target) {
    const packet = { round: this.round, rematchVotes: this.rematchVotes, type: 'state', id: this.id, moves: this.moves, fen: this.chess.fen(), playersReady: this.playersReady, spectatorCount: this.spectators.size };
    for (const connection of target ? [target] : [this.connection, ...this.spectators]) {
      if (!connection?.open) continue;
      try { connection.send(packet); } catch { connection.close(); }
    }
  }
  requestRematch() {
    if (!this.active || !this.connected || !this.chess.game_over() || this.role === 'spectator') return false;
    if (this.role === 'host') this.voteRematch('host');
    else this.connection.send({type:'rematch', id:this.id});
    return true;
  }
  voteRematch(role) {
    if (!this.chess.game_over() || !this.playersReady || !['host','guest'].includes(role)) return;
    if (!this.rematchVotes.includes(role)) this.rematchVotes.push(role);
    if (this.rematchVotes.length === 2) {
      this.round++; this.moves=[]; this.chess=new this.Chess(); this.rematchVotes=[];
      this.persist(); this.onBoard(this.moves);
    }
    this.sendState(); this.status('Revanche solicitada. Aguardando os dois jogadores.');
  }
  submit(move) {
    if (!this.canMove()) return false;
    const check = this.validateHistory(this.moves);
    if (!check.move(move)) return false;
    if (this.role === 'host') return this.commit(move);
    this.pending = true; this.status('Enviando jogada…');
    this.connection.send({ type: 'move', id: this.id, ply: this.moves.length, move });
    this.moveTimer = setTimeout(() => { this.fail('Sem confirmação da jogada. Retome a sala para sincronizar.'); }, 12000);
    return true;
  }
  commit(move) {
    if (!move || !/^[a-h][1-8]$/.test(move.from) || !/^[a-h][1-8]$/.test(move.to) || !/^[qrbn]$/.test(move.promotion || 'q')) return false;
    const result = this.chess.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
    if (!result) { this.sendState(); return false; }
    this.moves.push({ from: result.from, to: result.to, promotion: result.promotion || 'q' });
    this.persist(); this.sendState(); this.onBoard(this.moves); this.status('Jogadores conectados.'); return true;
  }
  fail(message) {
    const active = this.active;
    this.stop(false); this.active = active; this.status(message);
  }
  stop(clear = true) {
    this.generation++;
    clearTimeout(this.openTimer); clearTimeout(this.moveTimer);
    const connections = new Set([this.connection, ...this.spectators, ...this.incoming]);
    this.connection = null; this.spectators.clear(); this.incoming.clear();
    this.active = false; this.connected = false; this.playersReady = false; this.pending = false; this.spectatorCount = 0;
    for (const connection of connections) connection?.close();
    this.peer?.destroy(); this.peer = null;
    if (clear) { try { this.storage.removeItem(STORAGE); } catch {} }
  }
}

let peerScript;
export function createPeer(id) {
  if (!peerScript) peerScript = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = './build/peerjs.min.js';
    script.onload = resolve; script.onerror = () => { peerScript = null; reject(new Error('Não foi possível carregar o multiplayer.')); };
    document.head.append(script);
  });
  return peerScript.then(() => new globalThis.Peer(id, { debug: 0, ...globalThis.CHESS_PEER_OPTIONS }));
}
