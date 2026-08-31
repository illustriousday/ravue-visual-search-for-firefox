# Matriz de validação — Ravue 2.1.6 definitiva

Atualização documental: 31/08/2026. O responsável relatou sucesso, no Firefox, nos cenários que falhavam na revisão anterior e aprovou a base. O reempacotamento atual altera apenas documentação; nenhuma linha dos testes ou do funcionamento foi modificada.

A validação automatizada de referência contém 179 testes aprovados: 166 unitários/regressão e 13 com codecs nativos. O aceite cotidiano não equivale a uma matriz manual exaustiva. **O resultado oficial do AMO e a atualização assinada ainda precisam de evidência.**

## Validações automatizadas

- Suíte principal: testes originais preservados, contratos de release atualizados explicitamente para as correções e novas regressões.
- Regressões de KEY-01: Enter sobre Cancelar, Redefinir, Fechar ou Página visível não submete a seleção. Ativação nativa do botão preservada; composição IME ignorada.
- Regressões de LENS-02: na página do Lens, expiração, resposta negativa, falha de mensagem e o prazo local liberam a cobertura.
- Carregamento do Google Imagens: 12 cenários de regressão cobrem a espera pelo documento completo ou load antes de manipular o upload. DOMContentLoaded não antecipa o envio. Não há prazo local para essa espera inicial; se load nunca ocorrer, a cobertura pode permanecer até o usuário fechar a guia.
- Consumo único: chamadas simultâneas não recebem cópias duplicadas do JPEG.
- URLs: endereços locais reconhecíveis são excluídos; URLs elegíveis e parâmetros da imagem continuam preservados.
- Geometria: 10.000 amostras determinísticas e casos de limites, escalas e proporções.
- Imagens nativas: PNG → recorte → JPEG em seis escalas; imagem 288×412; imagem alta; PNG transparente, WebP, SVG; backup de bitmap completo e decodificação inválida.
- Pacote: sintaxe/JSON, recursos locais, ícones PNG, traduções, permissões, hashes, CRC e igualdade XPI/fonte.
- Contraste: pares de cores-base dos textos pequenos claros acima de 4,5:1. Isso não é certificação WCAG de toda a interface.

Os testes de APIs usam substitutos explícitos de navegador/DOM. Os testes nativos usam Skia e libvips, não Gecko. As 10.000 amostras fazem parte de testes existentes; não são milhares de testes independentes. As informações para publicação estão em AMO_PUBLICATION.md, dentro deste fonte, sem depender de um kit antigo.

## Matriz de testes reais e registro de evidências

Nesta tabela, “pendente” significa ausência de evidência formal individual para aquele cenário; não invalida nem transforma em testes exaustivos o relato de uso aprovado pelo responsável. Registrar somente o que for efetivamente executado.

Use perfil separado, sem informações pessoais. Registre versão exata do Firefox, sistema, idioma, zoom, DPR/escala, permissões e SHA-256 do pacote. Não desative assinatura, CSP ou mecanismos do Google para forçar sucesso.

| ID | Verificação | Evidência local / pendência |
| --- | --- | --- |
| F01 | Instalação no Firefox mínimo 142 e no estável instalado | Manifesto validado; instalação pendente |
| F02 | Atualização assinada 1.4.1 → 2.1.6, mesmo ID, sem duplicado | Identidade comparada; atualização real pendente |
| F03 | Painel PT-BR/EN, versão, botão e ausência da linha de atalho | Código/traduções testados; render pendente |
| F04 | Painel, menu e atalho iniciam seletor vazio | Lógica testada; interação Firefox pendente |
| F05 | Imagem pública pequena, grande e maior que a tela | Rota testada, sem captura/scroll; resultado Google pendente |
| F06 | Imagem em iframe de mesma origem e origem diferente | Rotas simuladas; aplicação real de permissões pendente |
| F07 | Fontes blob/data, JPEG, PNG, WebP, SVG e transparência | Pixels/formatos nativos testados; Gecko/CORS pendentes |
| F08 | Lazy loading, picture/srcset, imagem ainda decodificando | Casos locais parciais; sites reais pendentes |
| F09 | object-fit, bordas/padding, object-position | Geometria testada; CSS/renderização reais pendentes |
| F10 | Zoom 80/100/125/150/200%; DPR 1/1,25/1,5/2/3 | Matemática e pixels testados; Firefox/OS pendentes |
| F11 | CSP forte e captura fora do viewport sem deslocamento | Fixture e chamadas testadas; segurança Gecko pendente |
| F12 | Clique inteligente, arraste, mover, oito alças e clique direito | Testes de lógica aprovados; conforto visual pendente |
| F13 | Texto grande, legenda, balão, fotos de pessoas/animais | Heurísticas sintéticas; não prometer reconhecimento semântico |
| F14 | Enter/Espaço em cada botão, Tab/Shift+Tab, Esc e setas | Regressões aprovadas; teclado real/leitor de tela pendentes |
| F15 | Página visível só envia após Pesquisar; cancelar não envia | Lógica testada; interação real pendente |
| F16 | Preparação na mesma guia e resultado correspondente | Estado e esperas por etapa testados; sem prazo global para load do Google Imagens; matriz real por cenário pendente |
| F17 | Offline, input ausente, expiração, 403, CAPTCHA e consentimento | Falhas simuladas; Google real pendente, sem bypass |
| F18 | Fechar resultado durante preparo e repetir; reinício do background | Limpeza/retomada simuladas; suspensão real pendente |
| F19 | Dois acionamentos, duas janelas, concorrência | Bloqueios e consumo único testados; interação real pendente |
| F20 | Trocar guia ativa durante captura | Rejeição testada; Firefox pendente |
| F21 | Revogar/conceder cada host de Google/Lens | Permissões estáticas; experiência real pendente |
| F22 | Contêineres, cookies e janela privada | Não validados; conferir antes de anunciar compatibilidade nesses contextos |
| F23 | Temas, contraste, reduced motion e ampliação de interface | Cores-base/CSS inspecionados; composição visual pendente |
| F24 | Validador oficial no XPI final | Não executado neste ambiente |
| F25 | XPI/fonte final e runtime assinado | Comparação local dos pacotes; arquivos não documentais idênticos à base aceita; assinatura futura pendente |

## Laboratório de páginas difíceis

Na pasta fonte:

```bash
node tests/fixture-server.cjs
```

As páginas locais incluem fixtures de formatos, frames e CSP. Loopback não é uma imagem pública que o Google possa obter. Nesta revisão URLs locais seguem os caminhos locais quando permitidos. Para testar a rota prioritária, use uma imagem pública não sensível; não publique o laboratório ou arquivos pessoais na internet.

## Critérios de aceite antes da publicação

1. Nenhum teste automatizado da revisão final falhando.
2. Validador oficial executado; erros resolvidos e alertas examinados.
3. Instalação e pesquisas por URL e por recorte concluídas no Firefox, com resultados visuais conferidos.
4. Teclado/cancelamento, mesma guia, ausência de scroll e tratamento de falhas confirmados.
5. Atualização desde a versão pública e novas permissões verificadas em perfil separado.
6. Documentação, XPI e fonte correspondentes; 2.1.6 disponível no cadastro existente.

Os testes locais não garantem aprovação no AMO, inclusão no programa de recomendadas, disponibilidade do Google ou ausência de qualquer defeito. Nenhuma publicação foi executada.
