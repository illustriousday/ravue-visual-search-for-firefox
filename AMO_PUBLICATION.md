# Publicação da Ravue 2.1.6 definitiva

Documentação alinhada em 31/08/2026 para o salto público 1.4.1 → 2.1.6. O responsável testou os cenários que falhavam na revisão anterior, aprovou o funcionamento e autorizou reempacotar somente para corrigir os documentos.

## Identidade e escopo do reempacotamento

- Nome: Ravue — Visual Search for Firefox.
- Versão: 2.1.6; Manifest V3.
- ID: `{351e58ce-b7a8-4e88-b53f-d23acc464659}`.
- Firefox Desktop mínimo 142.0; sem declaração Android.
- Permissões preservadas: activeTab, menus, scripting, storage, images.google.com e lens.google.com.
- Dados transmitidos declarados: websiteContent.
- Manter Todos os direitos reservados e o GitHub somente para consulta.

O XPI contém 31 arquivos; apenas README.md e PRIVACY.md foram atualizados. O ZIP de fonte contém 69 arquivos; além desses dois documentos, foram atualizados CHANGELOG.md, TEST_MATRIX.md e AMO_PUBLICATION.md. Todos os outros arquivos permanecem idênticos aos do par aceito no teste do responsável. Não houve alteração de código, testes, manifesto, permissões, estilos, interface, ícones ou métodos de envio. Os arquivos anteriores foram preservados separadamente.

Pacotes de entrega:

- `ravue-visual-search-v2.1.6-final.xpi` — não assinado; 70881 bytes; SHA-256 `693573af60bdceb97bf28cf4a71954bdc7a863defff49cf5ff65356c05120148`.
- `ravue-visual-search-v2.1.6-final-source.zip` — fonte correspondente, com manifest.json na raiz e sem outros pacotes embutidos.

Os novos hashes são diferentes dos pacotes anteriores por causa dos documentos. Não usar um hash ou relatório de outra revisão só porque ela também se chama 2.1.6. O hash do próprio ZIP de fonte é calculado externamente depois do empacotamento, evitando uma referência circular.

## Validação e limitações

A referência automatizada desta implementação contém 179 testes aprovados: 166 unitários/regressão e 13 com codecs nativos, incluindo 12 cenários de carregamento do upload. Os testes e ferramentas são preservados sem modificação. A conferência deste reempacotamento reexecuta a suíte e compara cada arquivo com a base aceita.

Os testes com APIs/DOM utilizam substitutos explícitos; os codecs nativos usam Skia/libvips, não Gecko. Não se atribuem milhares de testes independentes às amostras de geometria. A suíte verifica 42 arquivos de sintaxe e 3 JSON.

O responsável relatou êxito no Firefox nos cenários que falhavam antes. Não foram fornecidos registros formais de toda a matriz por navegador, sistema, duração ou cenário. O relato não é apresentado como uma matriz exaustiva.

O validador oficial não estava disponível no ambiente de preparação; verificar o resultado durante o upload no AMO. A instalação/atualização assinada desde 1.4.1 ainda precisa ser conferida. Não há promessa de aprovação da Mozilla, disponibilidade permanente do Google ou ausência absoluta de defeitos. Veja [TEST_MATRIX.md](TEST_MATRIX.md).

## Pontos técnicos que os textos agora refletem

A espera inicial pelo Google Imagens usa documento completo ou load, exatamente como no comportamento restaurado da 2.1.5. Não dispara o envio em DOMContentLoaded. Não há prazo local para essa espera inicial; se load nunca ocorrer, a preparação pode permanecer até o usuário fechar a guia.

Continuam existindo limites em etapas distintas: 12 segundos para aguardar o controle de arquivo quando necessário, 20 segundos após anexar o arquivo e 30 segundos independentes para a cobertura na página do Lens. Esses limites não formam um prazo global de conclusão da pesquisa.

O envio por URL específica da imagem, as alternativas locais, o seletor, o clique direito, o teclado, a preparação na mesma guia e a ausência de rolagem automática não mudaram neste reempacotamento.

## Publicar uma etapa por vez

1. Usar o cadastro existente da Ravue, sem criar outra extensão nem alterar o ID.
2. Enviar o XPI final e conferir versão, plataforma, permissões e resultado do validador. Se surgir erro, alerta ou indisponibilidade do número 2.1.6, parar para avaliar; não modificar o pacote para contornar a plataforma.
3. Na pergunta sobre transformação de fonte, usar Não para este runtime. Os arquivos são legíveis; não há compilação, transpilação, minificação ou bundling. O empacotador apenas os reúne. Se solicitado, fornecer o ZIP de fonte correspondente. [Critério de fonte da Mozilla](https://extensionworkshop.com/documentation/publish/source-code-submission/).
4. Preencher notas ao revisor e notas da versão com as seções deste documento. Manter o dever de responder às solicitações privadas da Mozilla, mesmo sem suporte público no GitHub.
5. Atualizar os textos da listagem e a política de privacidade, coordenando a apresentação com a versão realmente oferecida ao público.
6. Conferir as capturas finais antes de enviá-las. Não expor dados pessoais.
7. Depois da aprovação/publicação, conferir a versão oferecida, instalação, atualização assinada e os dois fluxos. A assinatura altera o hash do arquivo; guardar o XPI assinado separadamente.

Nada foi publicado no AMO nem alterado remotamente no GitHub por este documento.

## Campos da listagem

| Campo | Valor |
| --- | --- |
| Nome | Ravue — Visual Search for Firefox |
| Slug existente | ravue-visual-search-firefox |
| Idioma padrão | Português do Brasil |
| Página inicial | https://github.com/illustriousday/ravue-visual-search-for-firefox |
| Suporte e contribuições | Manter campos vazios e canais públicos desativados |
| Licença | Manter Todos os direitos reservados |
| Categorias | Ferramentas de pesquisa; Fotos, música e vídeos |
| Etiquetas | google; image search; search |
| Política de privacidade | Copiar integralmente PRIVACY.md deste fonte |
| Experimental / pagamento | Manter a decisão de versão final gratuita |

Conferir a prévia e o formato aceito em cada campo. Não colar a sintaxe de um link Markdown em um campo que não a suporte; usar o endereço completo se necessário.

## Resumo — português

Pesquise imagens inteiras ou áreas visíveis com o Google Lens. Selecione por clique ou arraste, revise o recorte e abra os resultados em uma nova guia.

## Summary — English

Search whole images or visible page areas with Google Lens. Click or drag to select, review your crop, and open results in a new tab.

## Descrição — português

Pesquise visualmente com a Ravue: use uma imagem da página ou escolha a área que deseja procurar no Google Lens.

Painel e acesso rápido
Abra o painel da Ravue pelo botão da extensão e escolha “Selecionar uma área”. Você também pode iniciar pelo menu de contexto.

Pesquisar uma imagem inteira
Clique com o botão direito sobre a imagem e escolha “Pesquisar esta imagem com Ravue”. A extensão prioriza o endereço específico da imagem para que o Google obtenha o recurso sem recortá-lo pelos limites da tela. Isso depende de o endereço estar acessível ao Google.

Selecionar do seu jeito
Clique uma vez para sugerir uma região ou clique, segure e arraste para desenhar livremente. Mova e redimensione o recorte antes de pesquisar. A sugestão usa heurísticas locais; confira os limites antes de confirmar.

Corrigir sem recomeçar
Clique com o botão direito dentro do seletor para apagar a seleção e escolher outra sem fechar a interface. “Página visível” seleciona todo o viewport; confirme em “Pesquisar” para enviar.

Uma nova guia para a busca
A página de origem não é rolada automaticamente. A nova guia apresenta “Preparando a busca” durante a transição para o Google/Lens, sem criar uma segunda guia auxiliar de upload. A disponibilidade dos resultados depende do serviço do Google.

Privacidade e controle
Na pesquisa direta, o Google recebe a URL específica da imagem, incluindo seus parâmetros, ou um JPEG preparado localmente quando a URL não é elegível. Endereços locais reconhecíveis são excluídos da rota de URL, mas a Ravue não verifica acesso público por DNS nem remove automaticamente tokens dos parâmetros. Evite imagens privadas ou links sensíveis. Uma falha de URL já enviada não inicia automaticamente outra captura.

No seletor, o Firefox captura todo o viewport localmente antes do recorte. A sugestão por clique não usa OCR nem inteligência artificial remota. Depois da confirmação, o JPEG da área escolhida é entregue ao Google Imagens para iniciar a busca no Lens. Revise o conteúdo selecionado: os pixels podem incluir informações pessoais. As alternativas locais geram JPEG de até 1200 pixels no maior lado.

A Ravue não possui servidor intermediário, anúncios ou telemetria. O tratamento pelo Google segue os termos e a política de privacidade do serviço. Consulte a política de privacidade da extensão para detalhes.

A interface está disponível em português do Brasil e inglês. Requer Firefox Desktop 142 ou mais recente.

Código-fonte para consulta
https://github.com/illustriousday/ravue-visual-search-for-firefox
O repositório é destinado à transparência e à consulta do código. Não são aceitos suporte, relatórios de erros, sugestões, feedback, pull requests ou contribuições.

Ravue é independente e não é afiliada, patrocinada ou endossada pelo Google ou pela Mozilla. Google Lens e Firefox são marcas de seus respectivos proprietários.

## Description — English

Search visually with Ravue: use an image from the page or choose a visible area to look up with Google Lens.

Panel and quick access
Open Ravue's toolbar panel and choose “Select an area”. You can also start from the context menu.

Search a whole image
Right-click an image and choose “Search this image with Ravue”. The extension prioritizes the image's specific URL so Google can retrieve the resource without cropping it to the screen boundaries. This requires the address to be accessible to Google.

Select your way
Click once to suggest a region, or click, hold and drag to draw freely. Move and resize the selection before searching. Suggestions use local heuristics; always check the boundaries before confirming.

Correct without restarting
Right-click inside the selector to clear the current selection and choose another without closing it. “Visible page” selects the entire viewport; confirm with “Search” to send it.

One new search tab
The source page is not automatically scrolled. The new tab shows “Preparing your search” during the transition to Google/Lens, without creating a second helper upload tab. Results depend on Google's service availability.

Privacy and control
For direct search, Google receives the image's specific URL, including query parameters, or a locally prepared JPEG when the URL is not eligible. Recognizable local addresses are excluded from URL delivery, but Ravue does not verify public access through DNS or automatically remove query tokens. Avoid private images or sensitive links. Failure after a URL has been sent does not automatically trigger another capture.

The area selector first captures the whole visible viewport locally, then crops it. Click suggestions do not use OCR or remote AI. After confirmation, the selected area's JPEG is handed to Google Images to start a Lens search. Review the selected content: its pixels can include personal information. Local image alternatives produce JPEGs up to 1200 pixels on the longest side.

Ravue has no intermediary server, ads or telemetry. Google's processing is subject to its own terms and privacy policy. See the extension's privacy policy for details.

The interface supports Brazilian Portuguese and English. Requires Firefox Desktop 142 or later.

Source code for reference
https://github.com/illustriousday/ravue-visual-search-for-firefox
The repository is provided for transparency and code reference only. Support requests, bug reports, suggestions, feedback, pull requests and contributions are not accepted.

Ravue is independent and is not affiliated with, sponsored or endorsed by Google or Mozilla. Google Lens and Firefox are trademarks of their respective owners.

## Notas da versão — português

Ravue 2.1.6 — atualização desde a versão pública 1.4.1

• Migração para Manifest V3 no Firefox Desktop, com versão mínima 142.
• Painel com apresentação e controles da extensão.
• Seleção manual por arraste e sugestão local de região por clique.
• Clique direito para apagar a seleção sem reiniciar o seletor.
• Pesquisa direta com prioridade ao endereço da imagem, sem limitar o recurso ao viewport.
• Alternativas locais de pixels/captura quando não há URL elegível.
• Preparação e resultado na mesma nova guia, sem rolagem automática da página de origem.
• Correções de confirmação pelo teclado, tratamento de estado expirado e consumo simultâneo de imagens.
• Envio de recortes aguarda o carregamento completo do Google Imagens, preservando o fluxo aprovado em uso.
• Exclusão de endereços locais reconhecíveis da rota por URL e melhor contraste de textos claros.
• Documentação de privacidade e testes ampliados.

O envio de recortes utiliza o controle de arquivo do Google Imagens. Há novas permissões de scripting, storage e images.google.com em relação à 1.4.1; não é solicitado acesso permanente a todos os sites. O atalho continua disponível, sem a linha promocional no painel. Português do Brasil e inglês.

## Release notes — English

Ravue 2.1.6 — update from public version 1.4.1

• Migrates to Manifest V3 for Firefox Desktop, minimum version 142.
• Adds a toolbar panel with an introduction and controls.
• Supports manual drag selection and local click-to-suggest regions.
• Right-click clears a selection without restarting the selector.
• Direct image search prioritizes the image URL without limiting the resource to the viewport.
• Local pixel/capture alternatives remain available when no URL is eligible.
• Preparation and results share one new tab; the source page is not automatically scrolled.
• Fixes keyboard confirmation, expired-state handling and concurrent image consumption.
• Crop delivery waits for the Google Images page to finish loading, preserving the accepted upload flow.
• Excludes recognizable local addresses from URL delivery and improves light-theme text contrast.
• Expands privacy documentation and tests.

Crop delivery uses the Google Images file input. Compared with 1.4.1, scripting, storage and images.google.com permissions are new; no permanent all-sites access is requested. The keyboard shortcut remains available without its promotional row in the panel. Brazilian Portuguese and English are supported.

## Notes for Reviewers

Copiar o conteúdo em inglês abaixo para o campo privado do revisor, sem copiar esta instrução.

RAVUE 2.1.6 — PUBLIC UPDATE FROM 1.4.1

IDENTITY

Name: Ravue — Visual Search for Firefox
Add-on ID: {351e58ce-b7a8-4e88-b53f-d23acc464659}
Manifest version: 3
Extension version: 2.1.6
Minimum Firefox Desktop: 142.0
No Android compatibility is declared.

This updates the existing Ravue listing. The maintainer accepted the 2.1.6 implementation after testing the restored upload flow in the previously failing scenarios, then authorized a documentation-only repack. All non-documentation files remain byte-for-byte identical to that accepted base, including every executable, manifest, CSS, HTML, localization file, icon, test and packaging tool. Only README.md and PRIVACY.md changed inside the XPI; the source ZIP also updates CHANGELOG.md, TEST_MATRIX.md and AMO_PUBLICATION.md. There is no version, ID, permission or behavior change in this repack.

No Ravue account, login or developer-provided credentials are required. Google Images/Lens may present its own consent, login, rate limit or CAPTCHA. Ravue does not bypass those controls.

CHANGES SINCE 1.4.1

The update migrates from MV2 to Firefox MV3 and adds the toolbar panel, local click-to-suggest selection, right-click clearing, URL-priority image search and session-backed handoff. The event background is a packaged module using background.scripts/type module, not a Chrome service worker.

The retained changes correct Enter handling on focused selector buttons, pending-operation expiry and preparation-cover cleanup, duplicate consumption of stored JPEGs, recognizable local URL handling and two light-theme text colors. The direct-image route does not open the area selector. Preparation and results share the same newly opened tab; no helper tab or automatic source-page scrolling is used.

Before this documentation-only repack, the last executable change had restored only waitForDocumentComplete in content/google-upload.js to the 2.1.5 behavior. It waits for document.readyState === “complete” or the window load event before touching the upload controls. It does not start on DOMContentLoaded, and the additional 30-second deadline previously introduced for this initial wait is absent. This initial wait has no local timeout: if load never occurs, the preparation cover may remain until the user closes the tab. The existing 12-second file-input wait, 20-second post-attachment timer, and separate 30-second Lens-page cover deadline remain. These are different stages, not an overall search-duration guarantee.

TEST STEPS

Test 1 — direct image search

1. Open a normal page with a public, non-sensitive image, including a tall image. Right-click and choose “Search this image with Ravue” / “Pesquisar esta imagem com Ravue”. Check that no selector appears, the source page does not scroll, and one new tab proceeds from preparation to Lens results for the image resource.

Test 2 — area selection

2. Open the toolbar panel and choose “Select an area” / “Selecionar uma área”. The selector starts empty. Click for a suggestion, right-click to clear, then drag manually. Move/resize and choose Search. Check that only the confirmed region appears in the JPEG used for the search. Visible page first selects the viewport and still requires Search confirmation.

3. Use Tab to focus each control. Enter/Space should activate that button, not accidentally submit from Cancel, Reset, Close or Visible page. Escape cancels before submission. Test expired operations, slow loading, closed result tabs and unavailable Google controls. Distinguish the initial Google Images load wait (no local deadline, as disclosed above) from later input, submission and Lens-page error/expiry handling.

4. The source includes synthetic fixtures for image formats, frames and CSP. Loopback images cannot be fetched publicly by Google; use a genuine public image for the URL route. The full matrix remains useful for zoom, HiDPI, lazy loading, object-fit, host-permission changes and signed-update testing. Daily-use acceptance is not a claim that every matrix entry was individually completed.

DATA FLOW AND PRIVACY

Direct image search first considers the image's HTTP(S) URL. Embedded credentials and recognizable local/intranet/private literal addresses are excluded, the fragment is removed, and query parameters are preserved. The result tab navigates to https://lens.google.com/uploadbyurl with that specific image URL. Ravue does not resize or re-encode the image on this eligible-URL path.

Eligibility is syntactic: it does not verify DNS/public reachability, inspect all redirects or remove secret query tokens. A URL may be temporary or unavailable to Google. A failed URL already submitted does not automatically trigger JPEG resubmission.

If the URL is initially ineligible, Ravue attempts the complete decoded image pixels in the main document, or a rendered-rectangle capture when permitted, without scrolling. Those alternatives generate JPEG at quality 0.94 and at most 1200 pixels on the longest edge; they are not copies of the original file bytes. Inaccessible frames without an eligible URL fail rather than capturing the wrong frame.

Area selection begins with a local PNG of the entire visible tab viewport, before cropping. A local analysis copy is limited to 960 pixels on its longest edge. Suggestions use packaged DOM/pixel heuristics, not OCR, remote AI or downloaded models. Only the confirmed region is encoded into the final JPEG. Pixels may contain personal information; Ravue does not redact them.

For JPEG delivery, the same new tab navigates to https://images.google.com/. A packaged content script first checks for a pending Ravue operation belonging to that tab, mounts the preparation cover, locates Google's image-search/file input, assigns a File and dispatches input/change. Google's page performs the upload. Ravue's fetch of a data URL only decodes local bytes.

The Lens script releases the preparation cover after readiness or failure/expiry handling. Readiness is not semantic validation of search quality or HTTP success. No service restrictions are bypassed.

The final JPEG or image URL and operation association use browser.storage.session with a logical five-minute validity limit. JPEGs are removed on consumption; associations are cleaned on completion, closure or expired-record cleanup. Exact physical deletion at expiry is not promised. The selector's working screenshot has a separate local in-memory lifetime. Ravue does not archive images in storage.local, storage.sync or a developer server. Normal Google requests, cookies, browser history and Google's retention are outside Ravue's control.

PERMISSIONS

activeTab: temporary access following explicit user action.
menus: context commands and identification of the clicked element.
scripting: injection of packaged selector/helper code.
storage: temporary storage.session handoff.
https://images.google.com/*: JPEG delivery through Google's file input for a pending Ravue tab.
https://lens.google.com/*: preparation-cover handling for a pending result tab.

Required transmitted-data category: websiteContent. Compared with 1.4.1, scripting, storage and images.google.com are additions; contextMenus becomes menus. There is no permanent all-sites host permission.

VALIDATION EVIDENCE

The maintainer's everyday-use acceptance is a report provided for this release. Exact Firefox/OS versions, duration and per-scenario manual records were not supplied, so none are invented here.

The local automated suite contains 179 tests: 166 unit/regression tests and 13 native pixel-processing tests using Skia/libvips. The recorded validation of this implementation passed all 179 without failures, skipped or cancelled tests. The suite includes 12 loading-event regression scenarios. Tests execute the real packaged functions with explicit browser/DOM doubles; native codecs are not Gecko. The suite is rerun as part of the documentation-only release check. All 31 XPI files must match the corresponding source ZIP files byte-for-byte. All 64 non-Markdown source files and all 29 non-Markdown XPI members must remain identical to the accepted test package; no test source was changed to permit this repack.

The recorded automated-validation environment did not have Firefox or web-ext/addons-linter installed. No official-validator pass, exhaustive Firefox test matrix or signed 1.4.1-to-2.1.6 upgrade is claimed. The AMO validation result is to be checked during submission. No approval or guaranteed external-service availability is asserted.

SOURCE AND REPRODUCTION

The runtime has no compilation, transpilation, bundling, minification, remote executable code or obfuscation. Packaging copies readable JS, CSS, HTML, JSON, SVG, documentation and image assets into an XPI. Native image libraries are test-only and are not included in the XPI. The source-transformation answer is No for this runtime; the exact matching source ZIP is available if requested.

The matching source ZIP contains 69 files, including README.md, PRIVACY.md, CHANGELOG.md, TEST_MATRIX.md, this publication guide, tests, fixtures and tools/package.cjs. The five Markdown documents were aligned to the accepted implementation; previous statements about a universal preparation deadline are corrected. The accepted original archives remain preserved separately. The new archive hashes differ because of documentation only.

To reproduce the XPI on Node.js, extract the source ZIP and run: node tools/package.cjs ../dist-reproducao
The unchanged packager uses historical output basenames ending in “revisada”; compare archive bytes rather than the output basename. It copies untransformed runtime files using fixed ZIP metadata. Runtime packaging has no third-party build dependency. Native image libraries are needed only for optional native tests, not to build or run the extension.

Unsigned documentation-aligned XPI:
ravue-visual-search-v2.1.6-final.xpi
SHA-256: 693573af60bdceb97bf28cf4a71954bdc7a863defff49cf5ff65356c05120148

Matching source ZIP:
ravue-visual-search-v2.1.6-final-source.zip
The source ZIP's own hash is recorded externally after packaging; it is not embedded inside itself.

Public source reference:
https://github.com/illustriousday/ravue-visual-search-for-firefox

The owner will synchronize this reference with the released version. It is a reference-only repository, not a public support/contribution channel. The publisher remains responsible for responding to Mozilla's review requests.

## GitHub — fonte e apresentação

Extrair somente `ravue-visual-search-v2.1.6-final-source.zip` em uma pasta separada. O conteúdo já reúne código, testes e os cinco documentos corrigidos. Não misturar os documentos externos antigos com esta extração, não reempacotar e não enviar XPI/ZIP como substituto da árvore de código.

Enviar os arquivos da raiz e as pastas _locales, content, icons, popup, shared, tests, tools e ui, preservando os caminhos. Não excluir testes ou ferramentas apenas por não integrarem o XPI. Conferir a lista e o diff antes do commit; respeitar proteções de branch e avisos de credenciais. [Upload de arquivos no GitHub](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).

Na comparação com o fonte 1.4.1 local, somente background.html e content/lens-result.js deixaram de existir. Se ainda estiverem no repositório, conferir esses dois caminhos e removê-los explicitamente na etapa apropriada; upload não deve ser tratado como exclusão automática. Não apagar outros arquivos nem mudanças não relacionadas.

Descrição curta para About:

Busca visual para Firefox com Google Lens: imagem inteira, recorte manual ou sugestão local por clique. Manifest V3, sem anúncios ou telemetria.

Mensagem de commit sugerida:

Publish Ravue 2.1.6 source

Descrição do commit sugerida:

Update the public source from 1.4.1 to the accepted Manifest V3 release. Preserve the tested runtime byte-for-byte and include aligned documentation, tests, localization and assets.

Manter o aviso de repositório somente para consulta, sem suporte, relatórios, feedback, pull requests ou contribuições. Não mudar a licença nem criar canais adicionais.

## Capturas — ordem e legendas

| Ordem | Captura | Legenda |
| --- | --- | --- |
| 1 | Painel da Ravue | Conheça os controles e abra o seletor pelo painel da extensão. |
| 2 | Acesso pelo menu | Inicie a seleção de uma área pelo menu de contexto da página. |
| 3 | Pesquisa de imagem | Pesquise a imagem clicada com o Google Lens, sem abrir o seletor. |
| 4 | Seleção de área | Clique para sugerir uma região ou arraste para definir o recorte antes de pesquisar. |

Os quatro arquivos promocionais finais não estão disponíveis para conferência nesta preparação e não foram incluídos nos pacotes. Reanexá-los quando chegar à etapa de capturas. Não substituir por prints brutos com dados pessoais, não fabricar controles/resultados e não afirmar uma inspeção visual que não ocorreu.

Conferir especialmente a lateral direita do painel e a borda inferior do item 03, corrigidas anteriormente pelo responsável. Não mostrar contas, abas pessoais, barra de tarefas, relógio, favoritos, outras extensões ou URLs privadas.

## Reproduzir o empacotamento

O runtime não precisa de dependências ou build de terceiros. Com Node.js, na raiz do fonte:

```bash
node tools/package.cjs ../dist-reproducao
```

A ferramenta preservada mantém os nomes históricos `ravue-visual-search-v2.1.6-revisada.xpi` e `ravue-visual-search-v2.1.6-revisada-source.zip` para suas saídas. O nome externo não altera os bytes internos; o conteúdo deve corresponder ao par final. Não substituir por arquivos de uma execução antiga com os mesmos nomes.

Para testes, usar os comandos do [README.md](README.md). Bibliotecas de pixels são exclusivas dos testes e não entram no XPI. As evidências locais não substituem a validação do AMO nem a instalação assinada. Para distribuição e atualização, distinguir o canal AMO de instalações self/unlisted. [Atualizações de extensões](https://extensionworkshop.com/documentation/manage/updating-your-extension/).
