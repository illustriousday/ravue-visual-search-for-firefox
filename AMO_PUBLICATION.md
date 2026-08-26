# Publicação no AMO — Ravue 1.4.0

## Nome

Ravue — Visual Search for Firefox

## Resumo em português do Brasil

Pesquise uma imagem inteira com um clique ou selecione qualquer área visível da página para abrir resultados no Google Lens em uma nova guia.

## Summary in English

Search a full image with one click or select any visible page area to open Google Lens results in a new Firefox tab.

## Descrição em português do Brasil

Ravue oferece duas maneiras simples de pesquisar visualmente sem sair do seu fluxo no Firefox:

- **Pesquisar esta imagem:** clique com o botão direito sobre uma imagem e abra diretamente os resultados, sem passar pelo seletor.
- **Selecionar uma área:** desenhe, mova e redimensione um recorte sobre qualquer conteúdo visível antes de confirmar a pesquisa.

Os resultados são abertos em uma nova guia normal. A página original permanece intacta.

Capturas e recortes são processados localmente. A imagem escolhida é enviada diretamente ao Google Lens somente após uma ação explícita do usuário. A Ravue não possui servidor intermediário, telemetria, anúncios, rastreamento ou conta de usuário.

Inclui interface em português do Brasil e inglês, temas claro e escuro, suporte a teclado e permissões restritas ao necessário.

Ravue é um produto independente e não é afiliada, patrocinada nem endossada pelo Google ou pela Mozilla.

## Description in English

Ravue provides two straightforward ways to search visually without disrupting your Firefox workflow:

- **Search this image:** right-click an image and open its results directly, without showing the area selector.
- **Select an area:** draw, move, and resize a crop over any visible content before confirming the search.

Results open in a regular new tab while the original page remains unchanged.

Screenshots and crops are processed locally. The chosen image is sent directly to Google Lens only after an explicit user action. Ravue has no intermediary server, telemetry, advertising, tracking, or user account.

Includes Brazilian Portuguese and English, light and dark themes, keyboard support, and permissions limited to what the core feature requires.

Ravue is an independent product and is not affiliated with, sponsored by, or endorsed by Google or Mozilla.

## Notas da versão 1.4.0

- Corrige **Pesquisar esta imagem com Ravue** para pesquisar diretamente a imagem clicada, sem abrir o seletor.
- Mantém **Selecionar uma área com Ravue** como o único comando que abre o overlay de seleção.
- Adiciona contingência por URL para imagens em frames que não permitem captura direta.
- Adota o nome público **Ravue — Visual Search for Firefox**.
- Atualiza descrições, documentação e política de privacidade para refletir precisamente os dois fluxos.

## Version notes 1.4.0

- Fixes **Search this image with Ravue** so it searches the clicked image directly without opening the selector.
- Keeps **Select an area with Ravue** as the only context-menu command that opens the selection overlay.
- Adds a source-URL fallback for images in frames that cannot be captured directly.
- Adopts the public name **Ravue — Visual Search for Firefox**.
- Updates descriptions, documentation, and privacy disclosures to accurately cover both workflows.

## Notes for Reviewers

No account or login is required to test Ravue. A Google account is optional and is not required for the core functionality. No test credentials are necessary.

Test 1 — direct image search:

1. Open a regular HTTP or HTTPS page containing an image.
2. Right-click the image.
3. Choose “Search this image with Ravue”.
4. Confirm that no area-selection overlay appears.
5. Confirm that a new tab opens with Google Lens results for the clicked image.

Test 2 — area selection:

1. Return to the original page.
2. Click the Ravue toolbar button, press Alt+Shift+V, or choose “Select an area with Ravue”.
3. Draw and adjust a selection.
4. Click “Search”.
5. Confirm that a new tab opens with Google Lens results for the selected crop.

The extension normally captures the visible pixels of the clicked image or selected area and processes the crop locally. If an image is inside an inaccessible embedded frame, Ravue sends that image's source URL directly to Google Lens as a fallback. No developer-operated server receives any image, URL, analytics, or telemetry.

No build step is used. All JavaScript, CSS, HTML, JSON, SVG, and Markdown files in the XPI are original, readable, and unminified. There is no compilation, transpilation, bundling, code generation, remote code, or obfuscation.

Permissions:

- `activeTab`: capture and interact with the active tab following an explicit user action.
- `contextMenus`: provide the direct-image and area-selection commands.
- `https://lens.google.com/*`: submit the chosen image and detect an upload error.

Required transmitted data category: `websiteContent`, used only for the extension's core visual-search function.

## Categoria sugerida

Search Tools

## Plataforma recomendada para a primeira publicação

Firefox Desktop. Não marque Android nesta publicação, pois esta versão foi validada somente no fluxo de desktop.
