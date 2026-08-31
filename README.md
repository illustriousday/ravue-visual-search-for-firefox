# Ravue — Visual Search for Firefox

Busca visual com o Google Lens: pesquise uma imagem da página ou selecione uma área visível para procurar em uma nova guia.

**Versão deste código: 2.1.6 · Manifest V3 · Firefox Desktop 142 ou mais recente.**

> **Repositório somente para consulta:** este repositório disponibiliza o código-fonte da Ravue para transparência e referência. Não são aceitos relatórios de erros, solicitações de suporte, sugestões, feedback, pull requests ou contribuições.

## Recursos

- Painel com explicações e botão para abrir o seletor.
- Pesquisa da imagem clicada pelo menu de contexto, sem abrir o seletor.
- Prioridade para a URL específica da imagem, sem recortar o recurso pelos limites da tela.
- Seleção manual por arraste e sugestão local de região por clique.
- Movimentação e redimensionamento do recorte.
- Clique direito para apagar a seleção sem fechar o seletor.
- Opção para selecionar toda a página visível e confirmar a pesquisa.
- Preparação e resultado na mesma nova guia, sem guia auxiliar de upload.
- Português do Brasil e inglês; painel e preparação em tema claro/escuro.
- Sem servidor intermediário da Ravue, anúncios ou telemetria.

A página de origem não é rolada automaticamente. O seletor inicia vazio; a página inteira só é selecionada pelo comando **Página visível**.

## Como usar

### Painel e menu

Clique no ícone da Ravue e em **Selecionar uma área**. O menu de contexto também oferece **Selecionar uma área com Ravue**. O atalho configurável Alt+Shift+V permanece disponível; sua linha promocional não aparece no painel.

### Pesquisar uma imagem inteira

1. Clique com o botão direito sobre a imagem.
2. Escolha **Pesquisar esta imagem com Ravue**, dentro do submenu da Ravue quando houver.
3. A nova guia mostra a preparação e segue para a pesquisa.

Esse comando já confirma o envio; não abre o seletor nem pede uma confirmação adicional.

Quando aceita, a URL HTTP(S) da imagem é enviada ao Google Lens para que o serviço obtenha o recurso. A Ravue não reamostra a imagem nesse caminho. O endereço precisa estar acessível ao Google; login, bloqueios de origem e links temporários podem impedir a pesquisa.

Endereços locais/internos reconhecíveis e URLs com usuário/senha incorporados não usam essa rota. A verificação é sintática, não uma consulta DNS ou prova de acesso público. Os parâmetros da URL são mantidos: não use links sensíveis ou privados que não deseja compartilhar.

Se a URL não for elegível, a Ravue tenta os pixels decodificados do elemento no documento principal e, se necessário e permitido, uma captura do retângulo renderizado. Esses caminhos geram JPEG de até 1200 pixels no maior lado, sem rolar a página; não preservam os bytes do arquivo original. Se uma URL já enviada falhar no Google, não existe nova captura automática: use o seletor de área como alternativa.

### Selecionar uma área

| Controle | Ação |
| --- | --- |
| Clique esquerdo simples | Sugere uma região sob o ponteiro |
| Clique, segure e arraste | Desenha um recorte livre |
| Arraste o recorte ou suas alças | Move ou redimensiona a seleção |
| Clique direito no seletor | Apaga a seleção sem fechar |
| Redefinir | Limpa a seleção atual |
| Página visível | Seleciona todo o viewport; não envia sozinho |
| Pesquisar | Confirma o envio do recorte |
| Cancelar, Fechar ou Esc | Encerra o seletor antes do envio |
| Tab / Shift+Tab | Percorre os controles disponíveis |
| Enter / Espaço em um botão | Executa a ação desse botão |
| Enter com a seleção focada | Confirma a pesquisa |
| Setas / Shift+setas | Move a seleção em passos de 1 / 10 pixels CSS |

A seleção inteligente usa heurísticas locais de cores, regiões e limites do documento. Não é OCR, não usa reconhecimento semântico de pessoas/animais e não baixa modelos de IA. Quando a análise é ambígua, favorece a imagem inteira se seus limites estiverem disponíveis. A sugestão pode errar: confira e ajuste antes de pesquisar.

Para alterar zoom ou tamanho da janela durante o uso, feche e reabra o seletor. Ele trabalha sobre uma captura do momento em que foi iniciado.

## Privacidade

Na busca direta, o Google recebe a URL específica da imagem ou um JPEG preparado por uma alternativa local.

Ao abrir o seletor, o Firefox captura **todo o viewport antes do recorte**. O PNG de trabalho e sua análise ficam locais. Após confirmar, somente o JPEG da área escolhida é entregue ao Google Imagens para iniciar a busca no Lens. Se confirmar a página visível inteira, todo esse conteúdo entra no JPEG. Não há remoção automática de dados pessoais presentes nos pixels.

O JPEG final, a URL e o estado de passagem entre etapas usam `storage.session`. Os registros têm validade lógica de cinco minutos e são removidos no consumo, encerramento ou limpeza de registros vencidos. A captura de trabalho do seletor tem ciclo de vida separado. Não é usado `storage.local` ou `storage.sync` para arquivar imagens.

Google Imagens/Lens é um serviço externo. Regras, cookies, histórico normal das guias, processamento e retenção do Google não são controlados pela Ravue. Leia a [política de privacidade](PRIVACY.md).

## Compatibilidade e permissões

A versão usa Manifest V3, com background de eventos em módulo, específico para Firefox. Não há declaração de compatibilidade Android.

| Permissão | Finalidade |
| --- | --- |
| `activeTab` | Acesso temporário à guia acionada pelo usuário |
| `menus` | Comandos de contexto e identificação do elemento clicado |
| `scripting` | Injeção dos auxiliares locais e seletor |
| `storage` | Passagem temporária de dados por `storage.session` |
| `https://images.google.com/*` | Entrega do JPEG ao controle de arquivo em uma busca pendente |
| `https://lens.google.com/*` | Cobertura de preparação na guia da busca |

Não é pedido acesso permanente a todos os sites. Páginas internas/protegidas e restrições de frames, CORS ou CSP podem impedir operações. Imagens em frames inacessíveis podem usar uma URL elegível; os caminhos locais não capturam outro frame como substituto.

A disponibilidade e o resultado da busca dependem do Google. Antes do envio de um JPEG, a Ravue aguarda o carregamento completo da página do Google Imagens. Essa espera inicial não tem prazo local: se o evento de carregamento não ocorrer, a preparação pode continuar visível e a guia pode ser fechada pelo usuário. Existem tratamentos de falha nas etapas posteriores, mas não uma garantia de duração máxima para toda a busca. Isso não contorna CAPTCHA, login, consentimento ou bloqueios do serviço.

## Testes e desenvolvimento

O runtime é original, legível e não minificado. Não há compilação, transpilação ou bundling necessário para executá-lo.

Com Node.js compatível:

```bash
node --experimental-vm-modules --test tests/*.test.cjs tests/regression/*.test.cjs
```

A opção de VM executa o background real com substitutos explícitos das APIs de navegador. Os testes cobrem regras e estados; não simulam aprovação da Mozilla.

Há também testes opcionais de pixels com `@napi-rs/canvas` 0.1.100 e `sharp` 0.35.4 instalados apenas no ambiente de teste:

```bash
node --experimental-vm-modules --test tests/native/*.test.cjs
```

Essas dependências **não integram o XPI**. Essa suíte decodifica imagens e JPEGs de verdade, mas usa Skia/libvips, não Gecko.

Para o laboratório sintético local:

```bash
node tests/fixture-server.cjs
```

Abra o endereço informado pelo servidor em um perfil de teste. Fontes locais não são acessíveis ao Google; teste a rota de URL com uma imagem pública não sensível. A instalação temporária em `about:debugging#/runtime/this-firefox` serve para desenvolvimento, não equivale a instalação/atualização assinada.

Consulte [TEST_MATRIX.md](TEST_MATRIX.md), [AMO_PUBLICATION.md](AMO_PUBLICATION.md) e [CHANGELOG.md](CHANGELOG.md). Testes automatizados aprovados não substituem o validador oficial nem a instalação e os dois fluxos reais no Firefox.

## Direitos e independência

Todos os direitos reservados. A disponibilização do código para consulta não é apresentada como uma licença de código aberto.

Ravue é independente e não é afiliada, patrocinada ou endossada pelo Google ou pela Mozilla. Google Lens e Firefox são marcas de seus respectivos proprietários.
