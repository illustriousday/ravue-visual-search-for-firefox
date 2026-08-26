# Privacidade da Ravue

Última atualização: 26 de agosto de 2026.

## Resumo

A Ravue não possui telemetria, anúncios, conta de usuário nem servidor próprio. A extensão processa capturas e recortes localmente e transmite uma imagem ao Google Lens somente depois de uma ação explícita do usuário.

## Dados processados

### Pesquisar esta imagem

Quando o usuário escolhe **Pesquisar esta imagem com Ravue**, esse clique confirma a pesquisa. Sempre que a página permite, a Ravue captura localmente apenas os pixels visíveis da imagem clicada e envia esse recorte diretamente ao Google Lens.

Se a imagem estiver dentro de um frame que o Firefox não permita recortar, a Ravue usa como contingência o endereço de origem da própria imagem para que o Google Lens possa buscá-la. Nenhum endereço de página é enviado além do endereço específico da imagem necessário nessa contingência.

### Selecionar uma área

Ao iniciar o seletor, a Ravue cria uma captura temporária apenas da área visível da guia ativa. A captura permanece na memória da extensão pelo tempo necessário para a operação e expira automaticamente. Nada é transmitido até o usuário confirmar a região escolhida em **Pesquisar**.

Em ambos os modos, a Ravue não grava imagens em armazenamento persistente. O tratamento posterior dos dados enviados fica sujeito aos termos e à política de privacidade do Google.

## Dados que a Ravue não coleta

- histórico de navegação;
- endereços das páginas visitadas, exceto o endereço específico de uma imagem usado na contingência descrita acima;
- credenciais, cookies ou conteúdo de formulários;
- métricas de uso, relatórios de falha ou identificadores publicitários;
- cópias das imagens em servidores da Ravue.

## Permissões

- `activeTab`: permite capturar e interagir com a guia ativa somente após uma ação do usuário;
- `contextMenus`: adiciona os dois comandos de busca visual ao menu de contexto;
- `https://lens.google.com/*`: permite entregar a imagem escolhida ao Lens em uma nova guia de resultados e identificar uma eventual resposta de erro. A permissão é limitada a esse domínio e não dá acesso geral aos sites visitados.

O Firefox classifica a imagem selecionada ou seu endereço de origem como conteúdo de site transmitido para viabilizar a busca visual. A Ravue não solicita acesso permanente a todos os sites.
