# Audio Moments

Plataforma web responsiva para **gravar conversas pelo microfone, marcar momentos importantes** durante a gravação ou a reprodução e **exportar/importar** o projeto (áudio + marcações). Todo o processamento acontece localmente no navegador: nenhum áudio é enviado a servidores.

## Funcionalidades

- **Gravação** com `getUserMedia` + `MediaRecorder`: iniciar, pausar/retomar, finalizar e descartar (com confirmação). Cronômetro, indicador de estado e medidor de nível do microfone.
- **Marcação de momentos** com o botão **“Marcar momento importante”** (ou a tecla <kbd>M</kbd>). O tempo registrado é a posição real no áudio: o cronômetro desconta as pausas. Depois da gravação, ou em um áudio importado, a marcação usa a posição atual da reprodução.
- **Lista de momentos** em ordem cronológica, com nome (obrigatório), observação (opcional), ações para reproduzir a partir daquele instante, editar e excluir (com confirmação). Os marcadores também aparecem na linha do tempo do player.
- **Player**: tocar/pausar, voltar/avançar 10 s, barra de progresso navegável, tempo atual/duração e velocidade de reprodução.
- **Importar projeto**: áudio obrigatório (WAV, MP3, M4A, WebM, OGG, FLAC, AAC), JSON opcional, ou diretamente o `.zip` exportado pela aplicação. Tudo é validado antes de carregar, e a substituição de um projeto aberto pede confirmação.
- **Exportar projeto**:
  - com marcações, gera um `.zip` com o áudio original (bytes copiados sem recompressão) e `momentos-importantes.json`;
  - sem marcações, baixa **somente o áudio**, no formato original (sem ZIP nem JSON vazio).
- **Nome do projeto**, usado na interface e nos arquivos (convertido para um nome de arquivo seguro). O padrão é `gravacao-AAAA-MM-DD`.
- Tema claro/escuro automático, layout para celular (com barra fixa de marcação durante a gravação) e aviso antes de fechar a página com alterações não exportadas.

## Requisitos

- Node.js 20.19+ ou 22.12+ (testado com Node 26) e npm.
- Navegador recente (Chrome, Edge, Firefox ou Safari).
- A gravação exige **contexto seguro**: `http://localhost` durante o desenvolvimento ou **HTTPS** em produção.

## Instalação e execução

```bash
cd ~/Projects/audio-moments
npm install
npm run dev
```

Acesse <http://localhost:5173>.

| Comando             | Descrição                                        |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Servidor de desenvolvimento (Vite)               |
| `npm run build`     | Checagem de tipos + build de produção em `dist/` |
| `npm run preview`   | Serve o build de produção localmente             |
| `npm run typecheck` | Checagem de tipos do TypeScript                  |
| `npm run lint`      | Lint com oxlint                                  |
| `npm test`          | Testes unitários (Vitest)                        |
| `npm run check`     | typecheck + lint + testes + build                |

Para testar em um celular na mesma rede, use `npm run dev -- --host`. Fora de `localhost`, porém, o navegador só libera o microfone via HTTPS (por exemplo, com um proxy/túnel HTTPS ou com `@vitejs/plugin-basic-ssl`).

## Formato do arquivo JSON (versão 1)

```json
{
  "version": 1,
  "recordingName": "Reunião com cliente",
  "audioFile": "reuniao-com-cliente.webm",
  "durationSeconds": 365.4,
  "importantMoments": [
    {
      "id": "moment-001",
      "timeSeconds": 42.5,
      "timeFormatted": "00:00:42",
      "name": "Definição do orçamento",
      "observation": "O cliente mencionou o orçamento disponível."
    }
  ]
}
```

| Campo                 | Obrigatório | Descrição                                                              |
| --------------------- | ----------- | ---------------------------------------------------------------------- |
| `version`             | sim         | Versão do formato. Apenas `1` é aceita.                                |
| `recordingName`       | sim         | Nome do projeto/gravação.                                              |
| `audioFile`           | não         | Nome do arquivo de áudio associado (dentro do ZIP).                    |
| `durationSeconds`     | não         | Duração do áudio em segundos.                                          |
| `importantMoments`    | sim         | Lista de marcações (pode ser vazia).                                   |
| `id`                  | —           | Identificador único. Se faltar ou se repetir, um novo é gerado.        |
| `timeSeconds`         | sim         | Posição em segundos (≥ 0). **Referência principal** para reprodução.   |
| `timeFormatted`       | não         | `HH:MM:SS` calculado a partir de `timeSeconds` (ignorado na leitura).  |
| `name`                | sim         | Nome do momento.                                                       |
| `observation`         | não         | Texto livre; string vazia quando não preenchido.                       |

### Regras de validação na importação

- JSON malformado, `version` diferente de `1` ou ausência de `recordingName`/`importantMoments` → o JSON é **rejeitado por inteiro** e nenhuma marcação é carregada. O áudio pode ser importado sozinho.
- Marcações individuais sem nome ou com `timeSeconds` inválido → são **ignoradas**, e cada uma é relatada nos avisos.
- Marcações além da duração do áudio → são **ignoradas** e relatadas. Até 0,5 s além do fim, são ajustadas para o último instante.
- Divergências de `audioFile` ou de `durationSeconds` em relação ao áudio escolhido → aviso, sem bloquear a importação.

## Arquitetura

```text
src/
├── App.tsx                      # Orquestra estado, gravação, player, importação/exportação
├── components/
│   ├── AudioRecorder.tsx        # Nome, estado, cronômetro, controles e botão de marcação
│   ├── RecordingControls.tsx    # Iniciar / pausar / retomar / finalizar / descartar
│   ├── LevelMeter.tsx           # Medidor de nível do microfone
│   ├── AudioPlayer.tsx          # Player com linha do tempo e marcadores
│   ├── ImportantMomentList.tsx  # Lista + estado vazio
│   ├── ImportantMomentItem.tsx  # Item (visualização/edição)
│   ├── ImportantMomentForm.tsx  # Formulário nome/observação com validação
│   ├── ImportProjectDialog.tsx  # Seleção e validação dos arquivos importados
│   ├── ImportExportControls.tsx # Botões do cabeçalho
│   ├── ConfirmDialog.tsx        # Confirmação reutilizável (AlertDialog)
│   └── ui/                      # Componentes shadcn/ui
├── hooks/
│   ├── useAudioRecorder.ts      # MediaRecorder, cronômetro sem pausas, erros de permissão
│   ├── useAudioPlayer.ts        # Controle do <audio>, correção da duração de WebM
│   ├── useProject.ts            # Reducer do projeto (nome, áudio, marcações)
│   ├── useObjectUrl.ts          # createObjectURL/revokeObjectURL com ciclo de vida
│   └── ...
├── services/
│   ├── audioService.ts          # Formatos, MIME types, leitura de metadados
│   ├── projectImportService.ts  # Validação do JSON, leitura de ZIP, prévia de importação
│   └── projectExportService.ts  # Montagem do JSON, ZIP e download
├── lib/                         # Formatação de tempo, nomes de arquivo seguros, ids
└── types/project.ts             # Tipos do domínio e do formato de arquivo
```

Stack: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (Radix), Lucide React, JSZip (carregado sob demanda) e Vitest.

## Testes e verificações

- `npm test`: 24 testes unitários cobrindo a formatação de tempo, a sanitização de nomes de arquivo, a validação do JSON (sintaxe, versão, campos obrigatórios, tempos fora da duração, ids duplicados) e a exportação (somente áudio × ZIP, bytes do áudio preservados, ida e volta exportar → importar sem perdas).
- Testes manuais no navegador (Chromium), com um stream sintético no lugar do microfone: gravação com pausa/retomada (marcações descontando a pausa), reprodução a partir de uma marcação, exportação ZIP e somente áudio, importação de WAV + JSON (com marcação fora da duração), JSON inválido, arquivo não suportado, reimportação do ZIP, edição/exclusão de marcações importadas, bloqueio de marcação sem nome, confirmações de substituir/descartar, erro de permissão negada e layout em 375 px.

## Privacidade e armazenamento

- O microfone só é acessado depois de um clique em “Iniciar gravação” e da permissão do navegador. Ele é liberado ao finalizar ou descartar.
- Nenhum dado sai do navegador. Não há transcrição, reconhecimento de fala nem serviços de terceiros.
- **Não há persistência**: o projeto fica na memória da aba e se perde ao fechar ou recarregar a página. A aplicação avisa antes de fechar se houver alterações não exportadas. Exporte para guardar o trabalho.

## Limitações conhecidas

- O formato da gravação depende do navegador: WebM/Opus (Chrome, Edge, Firefox recente), OGG (Firefox antigo) ou MP4/AAC (Safari). O áudio é exportado no formato em que foi gravado ou importado; **não há conversão** (por exemplo, para MP3).
- Arquivos WebM gravados pelo navegador não trazem a duração no cabeçalho. A aplicação a calcula ao carregar, mas alguns players externos podem mostrar a duração incorreta ou demorar para avançar no arquivo.
- A precisão das marcações durante a gravação é a do cronômetro do navegador (diferenças de poucos centésimos de segundo em relação ao arquivo final). Marcações que ficariam além do fim real são ajustadas para o último instante.
- O ZIP é montado em memória. Áudios muito longos (centenas de MB) podem esgotar a memória em celulares; avisamos a partir de 300 MB, e o limite de importação é 2 GB.
- A gravação em segundo plano (aba oculta ou tela bloqueada) depende do sistema operacional. A aplicação pede para manter a tela ligada (Wake Lock) enquanto grava, quando o navegador permite.
- Formatos que o navegador não decodifica (por exemplo, FLAC em alguns Safari) são recusados na importação com uma mensagem explicando o motivo.
