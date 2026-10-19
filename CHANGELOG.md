# Changelog

Todas as mudanças relevantes do projeto ficam registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e o projeto usa o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## Como a versão é definida

A versão tem o formato `MAJOR.MINOR.PATCH` e fica no campo `version` do [`package.json`](package.json). A interface a exibe ao lado do nome da plataforma.

- O projeto está em **desenvolvimento inicial (`0.y.z`)**: a API pública e o formato dos arquivos ainda podem mudar. A versão `1.0.0` marcará a primeira versão estável.
- Cada commit `feat:` (nova funcionalidade) incrementa o **MINOR** (`0.2.0` → `0.3.0`).
- Cada commit `fix:` (correção compatível) incrementa o **PATCH** (`0.2.0` → `0.2.1`).
- Uma mudança incompatível (por exemplo, deixar de importar um formato de JSON antigo) incrementa o **MAJOR** a partir da `1.0.0`. Enquanto o projeto estiver em `0.y.z`, ela incrementa o MINOR.
- Cada versão publicada recebe uma tag `vX.Y.Z` no commit correspondente.

## [Não lançado]

## [0.3.0] - 2026-10-18

### Adicionado

- Botão no canto superior direito para alternar entre os modos claro e escuro (ícones de sol e lua, com giro ao clicar). A escolha fica salva no navegador; sem escolha, o site segue o tema do sistema.
- Versão da plataforma exibida ao lado do nome e do logo.
- Cor principal configurável em um único lugar (`src/theme.css`), agora `#d9fe16`.
- Tema Tokyo Night (Night no modo escuro, Day no claro), com contraste mínimo de 4,5:1 nos textos. A paleta pode ser trocada em `src/theme.css`; a paleta neutra original continua disponível em `src/themes/neutral.css`.

### Corrigido

- A forma de onda não atualizava as cores ao trocar entre os modos claro e escuro.
- Ao ajustar o trecho de um momento, a lista continuava mostrando o instante marcado original e arredondava início/fim para segundos inteiros. Agora o botão mostra o início do trecho, início e fim aparecem com décimos de segundo (como no editor), a lista é ordenada pelo início do trecho e o instante marcado (`timeSeconds`) é mantido dentro do trecho ajustado.
- No desktop, o card "Reprodução" não terminava na mesma linha do card "Momentos importantes" (a diferença variava com a altura da janela). Agora as duas colunas têm sempre a mesma altura, definida pela coluna da esquerda, e a lista de momentos rola dentro do card quando fica longa. Margens usadas para compensar espaçamento foram trocadas por `gap` nos contêineres.

## [0.2.0] - 2026-10-18

Commit `f241743`.

### Adicionado

- Trecho (início e fim) ajustável para cada momento, com padrão de 2 s antes e 2 s depois do instante marcado.
- Editor do trecho no player: forma de onda ampliada, alças arrastáveis e ajuste pelo teclado.
- Linha do tempo geral com forma de onda e os trechos dos momentos.
- “Ouvir trecho” e “Baixar trecho” (WAV) para cada momento.
- Bloqueio de 2 s no botão de marcar momento após cada clique.
- Formato JSON versão 2 (`startSeconds`/`endSeconds`). A importação continua aceitando a versão 1.

## [0.1.0] - 2026-10-18

Commit `e1b8979`. Primeira versão.

### Adicionado

- Gravação pelo microfone com pausa, retomada, cronômetro e medidor de nível.
- Marcação de momentos importantes com nome e observação, no tempo real do áudio.
- Player com navegação e reprodução a partir de cada momento.
- Importação de áudio com JSON opcional (ou do ZIP exportado), com validação.
- Exportação em ZIP (áudio + JSON) ou somente do áudio, quando não há marcações.

[Não lançado]: https://github.com/joaovic-tech/audio-moments/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/joaovic-tech/audio-moments/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/joaovic-tech/audio-moments/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/joaovic-tech/audio-moments/releases/tag/v0.1.0
