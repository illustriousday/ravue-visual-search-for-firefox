# Alterações da Ravue

## 2.1.6 — versão definitiva congelada

O responsável aprovou a base após testar os cenários que falhavam na revisão anterior. Em 31/08/2026, autorizou reempacotar essa mesma versão para corrigir somente README.md, PRIVACY.md, CHANGELOG.md, TEST_MATRIX.md e AMO_PUBLICATION.md. Os arquivos de funcionamento, manifesto, interface, testes e ferramentas não foram alterados; os pacotes anteriores estão preservados. Os hashes dos novos arquivos ZIP/XPI mudam por causa da documentação.

Antes desse reempacotamento documental, a base já continha as correções abaixo. Ela não é byte a byte idêntica à candidata 2.1.6 original nem à 2.1.5; a função de espera inicial do upload havia sido restaurada exatamente ao comportamento da 2.1.5.

- Corrige Enter no seletor: o botão focado mantém sua própria ação, sem pesquisa indevida ao cancelar, redefinir, fechar ou selecionar a página visível.
- Evita confirmação involuntária durante composição de texto por IME.
- Restaura a espera pelo carregamento completo do Google Imagens antes de manipular o upload, sem início antecipado em DOMContentLoaded e sem o prazo adicional de 30 segundos introduzido nessa etapa. A espera inicial não tem prazo local; se load não ocorrer, a preparação pode permanecer visível.
- Mantém os tratamentos posteriores: espera de até 12 segundos pelo controle de arquivo quando necessária, 20 segundos após anexar o arquivo e limite independente de 30 segundos para a cobertura na página do Lens.
- Impede consumo duplicado de um JPEG por chamadas simultâneas na mesma instância do background.
- Exclui endereços locais/internos reconhecíveis da rota de URL, mantendo as alternativas locais existentes.
- Melhora duas cores de texto do tema claro, sem mudar a disposição do painel.
- Mantém os testes da implementação e acrescenta a cobertura de regressão da espera restaurada. A validação registrada contém 179 testes locais aprovados; não equivale a teste exaustivo em Firefox ou aprovação do AMO.
- No reempacotamento documental autorizado, alinha os cinco documentos ao comportamento final e reúne os textos de publicação em AMO_PUBLICATION.md. Nenhuma correção executável foi acrescentada nessa etapa.

Permissões, ID, versão, métodos de envio, heurística inteligente, arraste, clique direito, ausência de rolagem automática e uso da mesma guia de resultado foram preservados. A elegibilidade da URL continua sintática; parâmetros necessários ao recurso são mantidos.

## Salto público 1.4.1 → 2.1.6

- Migração de Manifest V2 para Manifest V3 no Firefox Desktop, com mínimo 142.
- Background de eventos em módulo e estado temporário por storage.session.
- Painel do botão da extensão com apresentação e controles.
- Sugestão local de seleção por clique e seleção manual por arraste.
- Clique direito para apagar uma seleção sem reiniciar o seletor.
- Busca direta com prioridade à URL específica da imagem; alternativas de pixels/captura quando não há URL elegível.
- Envio de JPEG pelo controle do Google Imagens, com preparação e resultado na mesma nova guia.
- Novas permissões de scripting, storage e images.google.com em relação à 1.4.1; contextMenus passa a menus. Não há acesso permanente a todos os sites.
- Não há declaração Android.

O salto não exige publicar as versões internas intermediárias. A disponibilidade do número no cadastro AMO e a validação final devem ser conferidas antes de enviar. A comparação histórica disponível é com os arquivos locais 1.4.1, não com um XPI assinado recém-baixado.
