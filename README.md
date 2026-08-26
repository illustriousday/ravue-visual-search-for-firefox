# Ravue — Visual Search for Firefox

Ravue é uma extensão independente de busca visual para Firefox. Ela pesquisa uma imagem inteira com um clique ou permite selecionar qualquer área visível da página, sempre abrindo os resultados do Google Lens em uma nova guia normal.

**Repositório somente para consulta:** este repositório disponibiliza o código-fonte da Ravue para transparência e referência. Não são aceitos relatórios de erros, solicitações de suporte, sugestões, feedback, pull requests ou contribuições.


## Recursos

- pesquisa direta da imagem clicada, sem abrir o seletor;
- seleção livre de área com movimentação e redimensionamento;
- opção para pesquisar toda a página visível;
- resultados em uma nova guia normal do Firefox;
- processamento local da captura e do recorte;
- interface responsiva, temas claro e escuro e navegação por teclado;
- português do Brasil e inglês;
- sem telemetria, anúncios ou servidor intermediário da Ravue.

## Como usar

### Pesquisar uma imagem inteira

1. Clique com o botão direito sobre uma imagem.
2. Escolha **Pesquisar esta imagem com Ravue**.
3. A imagem é preparada sem mostrar o seletor.
4. Os resultados abrem em uma nova guia.

### Selecionar uma área

1. Clique no botão da Ravue, pressione `Alt+Shift+V` ou escolha **Selecionar uma área com Ravue** no menu de contexto.
2. Arraste a moldura sobre a área desejada.
3. Ajuste o recorte e escolha **Pesquisar**.
4. Os resultados abrem em uma nova guia.

Cada pesquisa mantém intacta a página de origem.

## Privacidade

Capturas e recortes são processados localmente. Na busca direta, o clique no comando é a confirmação do usuário; na seleção de área, nada é enviado antes do clique em **Pesquisar**. A imagem escolhida é transmitida ao Google Lens somente para produzir os resultados. Consulte [PRIVACY.md](PRIVACY.md) para os detalhes.

## Compatibilidade

- Firefox para desktop 140 ou mais recente;
- páginas internas e outras páginas protegidas do Firefox não permitem a injeção do seletor;
- a integração de envio depende da interface web do Google Lens e pode precisar de manutenção se o serviço mudar.

## Desenvolvimento

Carregamento temporário:

1. Abra `about:debugging#/runtime/this-firefox`.
2. Escolha **Carregar extensão temporária**.
3. Selecione `manifest.json`.

Testes locais:

```bash
node --test tests/*.test.cjs
```

Para instalação permanente no Firefox estável, o pacote precisa ser assinado pela Mozilla, inclusive quando distribuído fora da loja.

## Independência

Ravue possui identidade, estrutura e implementação próprias. Não é afiliada, patrocinada nem endossada pelo Google ou pela Mozilla. Google Lens e Firefox são marcas de seus respectivos proprietários.
