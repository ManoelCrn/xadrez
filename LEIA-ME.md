# Xadrez para PC, Meta Quest e espectadores

## Apresentação com dois óculos e uma TV

1. No primeiro óculos, abra o jogo, toque em **Jogar online** e em **Criar sala**.
2. No segundo óculos, abra o jogo, informe o mesmo código de 8 números e escolha **Entrar para jogar**.
3. No PC da apresentação, abra o jogo, informe esse código e escolha **Assistir como espectador**.
4. Ligue o PC à TV ou ao projetor por HDMI. No painel online, use **Tela cheia**; também é possível usar F11 no PC.
5. Os jogadores entram em VR pelo botão **ENTER VR**, depois que estiverem conectados à sala.

O criador joga com as brancas; o segundo jogador, com as pretas. O espectador recebe o tabuleiro atual mesmo entrando depois do início. A visão começa de cima e pode ser girada ou ampliada pelo mouse. O espectador não pode mover peças, não ocupa uma vaga de jogador e não interrompe a partida ao sair. Há limite de 8 espectadores simultâneos.

O modo **View Only** do menu antigo é uma demonstração com bots; para acompanhar uma partida real, use **Assistir como espectador** no painel online.

## Reconexão

Mantenha o navegador do criador aberto. Ele valida e distribui as jogadas. Se o jogador das pretas desconectar, o público vê que a partida está pausada. Se o criador sair, os demais perdem a conexão com a sala.

Use **Retomar sala** na mesma aba após uma desconexão ou recarga. A identificação e o histórico ficam na sessão do navegador: fechar a aba ou apagar os dados do site pode impedir a retomada.

## Publicar os arquivos do ZIP

O pacote contém o projeto completo, com `index.html` na raiz da pasta do jogo. Copie o conteúdo dessa pasta para a raiz do repositório usado pelo GitHub Pages. Faça uma cópia da versão anterior antes de substituir os arquivos.

Não publique a pasta externa do ZIP como uma subpasta adicional sem ajustar o diretório de publicação. A página precisa continuar disponível por HTTPS para VR.

Inclui as correções anteriores: painel online recolhido, opção de jogar novamente contra o bot mantendo a cor, voltar ao menu e ver o tabuleiro após o fim da partida.

## Validação e limites

Os 11 testes automatizados passaram. Eles usam conexões simuladas para verificar o protocolo: dois jogadores, turnos, jogadas inválidas, movimentos especiais, entrada tardia de espectadores, proibição de jogadas pelo espectador, retomada e espectadores independentes das vagas dos jogadores.

Isso não equivale a um teste físico com dois Quest e um PC. A verificação gráfica neste ambiente está limitada pela indisponibilidade de WebGL no navegador de prévia. O teste completo de rede e dos controles nos óculos continua necessário.

A conexão usa PeerJS/WebRTC e um serviço público de sinalização. Não há TURN próprio nesta versão; algumas redes podem impedir a conexão direta. Para a apresentação, teste antecipadamente com os aparelhos e a rede do local. Não é necessário transmitir a imagem dos óculos para exibir a partida no PC: o espectador recebe as jogadas do jogo.

Os testes podem ser executados com:

    node --test tests/online.test.mjs

As licenças das dependências estão em `build/`. Modelos e demais recursos mantêm os termos do projeto original.
