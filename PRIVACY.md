# Política de privacidade da Ravue

Última atualização: 31 de agosto de 2026. Aplicável à Ravue 2.1.6 definitiva. O reempacotamento atualiza somente documentos; todos os arquivos de funcionamento permanecem idênticos aos da versão aprovada pelo responsável.

## Resumo

A Ravue permite pesquisar uma imagem ou um recorte com o Google Lens. Ela não opera servidor intermediário, conta própria, anúncios ou telemetria. O Google recebe a URL específica da imagem ou os pixels preparados para a busca. Imagens e endereços podem conter informações pessoais.

Abrir o painel apenas mostra informações e controles. O botão **Selecionar uma área** inicia uma captura local; escolher **Pesquisar esta imagem com Ravue** no menu inicia diretamente a busca.

## Busca direta de imagem

A Ravue prioriza o endereço da imagem informado pelo Firefox. Aceita HTTP ou HTTPS, rejeita usuário/senha incorporados e remove o fragmento (`#...`). Os parâmetros de consulta (`?...`) são mantidos porque podem ser necessários para localizar a imagem.

Esta revisão exclui da rota por URL endereços locais reconhecíveis, como localhost, nomes de intranet sem domínio, domínios locais conhecidos e intervalos de IP locais/reservados reconhecidos. Quando possível, utiliza os caminhos de pixels descritos abaixo. Se não houver uma alternativa local permitida, a operação falha e pode ser substituída por uma seleção manual.

A validação continua sendo sintática: não consulta DNS, não testa acesso público e não verifica todos os redirecionamentos. Um domínio aparentemente público pode apontar para uma origem privada. Tokens, identificadores ou dados pessoais nos parâmetros de consulta não são removidos automaticamente. Não use a rota direta para uma imagem ou endereço que não deseja compartilhar com o Google.

Uma nova guia mostra a preparação e navega para `https://lens.google.com/uploadbyurl`, incluindo o endereço específico da imagem. O Google tenta obter o recurso nessa origem. A Ravue não reamostra o arquivo nesse caminho, mas não controla como o Google o busca, processa ou armazena.

Se não houver uma URL elegível inicialmente, a Ravue tenta ler os pixels decodificados da imagem inteira no documento principal. Se essa leitura for bloqueada, pode pedir ao Firefox uma captura do retângulo renderizado. A Ravue não rola a página para realizar essas operações. As alternativas geram JPEG com qualidade configurada em 0,94 e até 1200 pixels no maior lado. Podem perder transparência, animação, detalhes ou características do arquivo original.

Uma falha do Google depois que uma URL foi enviada não dispara automaticamente uma nova captura. O usuário pode iniciar uma pesquisa com o seletor de área.

## Seleção de área

Ao abrir o seletor, o Firefox captura a área visível da guia ativa inteira: o viewport, não a página rolável completa nem a barra do navegador. Essa imagem de trabalho pode incluir textos, fotografias e conteúdo visível de formulários, inclusive dados pessoais. Não existe detecção ou ocultação automática de informações sensíveis.

O PNG de trabalho e uma cópia reduzida para análise de até 960 pixels no maior lado permanecem em memória local durante a seleção. A análise visual é local e utiliza heurísticas de pixels e limites do documento; não usa OCR, serviço remoto de inteligência artificial ou envio de rede para sugerir o recorte.

Clique simples, arraste, movimentação, redimensionamento e clique direito para limpar apenas ajustam a seleção. Ao acionar **Pesquisar**, o recorte é convertido localmente em JPEG de até 1200 pixels no maior lado. Somente esse JPEG é entregue ao controle de arquivo do Google Imagens, cujo código inicia a pesquisa no Lens. Ao selecionar **Página visível** e confirmar em **Pesquisar**, todo o viewport selecionado entra no JPEG. O PNG intermediário não é enviado como arquivo.

Cancelar, Fechar ou Esc antes da submissão encerram o seletor. Enter ou Espaço em um botão executa a ação desse botão; Enter na seleção confirma a pesquisa. A confirmação por Enter durante composição de texto por IME é ignorada.

## Memória e retenção

O background do Manifest V3 pode ser suspenso. Para passar dados entre etapas, a Ravue mantém temporariamente o JPEG final ou a URL da imagem, identificadores aleatórios de operação, associação à guia de resultado, fase e horário de expiração em `browser.storage.session`.

Os registros deixam de ser válidos após cinco minutos. O JPEG é removido quando consumido; uma trava em memória impede que mensagens simultâneas recebam duas cópias desse mesmo registro. As associações são limpas ao concluir/encerrar o fluxo ou quando um acesso ou limpeza encontra um registro vencido.

Não existe promessa de apagamento físico exatamente no quinto minuto: validade e remoção são mecanismos distintos. Encerrar a sessão do navegador limpa essa área de sessão. A captura de trabalho do seletor não usa o mesmo temporizador e permanece enquanto o seletor precisa dela.

A implementação não usa `storage.local`, `storage.sync`, banco de dados próprio ou servidor da Ravue para arquivar imagens. Não garante apagamento forense da memória. Histórico normal das guias, cache e dados mantidos pelo Google seguem o funcionamento do navegador e do serviço externo.

## Informações que não são acrescentadas à busca

A Ravue não acrescenta deliberadamente histórico de navegação, cookies, identificadores publicitários, métricas de uso ou relatórios de falha ao payload. A Ravue não envia a URL da página como campo separado da pesquisa. Entretanto, uma URL de imagem pode conter identificadores ou até um endereço de página nos seus próprios parâmetros, e os pixels selecionados podem conter qualquer informação visível.

A ausência de servidor da Ravue não significa que nenhum dado saia do dispositivo. A transmissão ao Google é parte da função solicitada. Requisições normais ao Google podem envolver IP, cabeçalhos, cookies existentes e estado da conta conforme o navegador e o serviço. A Ravue não controla essa camada nem promete anonimato.

## Permissões e sites

- `activeTab`: permite atuar temporariamente na guia acionada pelo usuário.
- `menus`: cria os comandos de contexto e identifica o elemento clicado.
- `scripting`: injeta auxiliares locais e a interface de seleção.
- `storage`: permite passar temporariamente dados e estado por `storage.session`.
- `https://images.google.com/*`: permite localizar o controle de pesquisa por arquivo e entregar o JPEG somente quando há uma operação pendente para aquela guia.
- `https://lens.google.com/*`: permite administrar a cobertura local de preparação de uma operação pendente.

Não é solicitada permissão permanente para todos os sites. Os scripts nos hosts Google/Lens consultam o estado pendente antes de montar a cobertura ou manipular o controle de upload. O script do Lens não reconhece o conteúdo dos resultados nem certifica que a pesquisa teve sucesso. Na página do Lens há um limite de espera para a cobertura. Esse limite não se aplica à espera inicial pelo carregamento completo do Google Imagens: se esse carregamento não terminar, a preparação pode permanecer visível até o usuário fechar a guia.

A categoria obrigatória declarada no manifesto é `websiteContent`, necessária à busca visual. A extensão é destinada ao Firefox Desktop 142 ou mais recente.

## Google e independência

O tratamento pelo Google está sujeito à [Política de Privacidade do Google](https://policies.google.com/privacy) e aos [Termos do Google](https://policies.google.com/terms). Os sistemas internos do serviço não foram auditados pela Ravue.

Ravue é independente, sem afiliação ou endosso do Google ou da Mozilla. O [repositório de código-fonte](https://github.com/illustriousday/ravue-visual-search-for-firefox) destina-se exclusivamente à consulta; não é um canal de atendimento ou contribuições.
