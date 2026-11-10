# Document Management System com GitHub Copilot

## Documentação da API

Na raiz do projeto, instale as dependências e inicie o backend:

```bash
npm install --prefix backend
npm run dev --prefix backend
```

- Swagger UI: <http://localhost:3000/api-docs/>
- Especificação OpenAPI 3.0 em JSON: <http://localhost:3000/openapi.json>

Se configurar `PORT`, ajuste a porta nos endereços acima. A especificação é gerada
das anotações `@openapi` em [documents.controller.js](backend/src/controllers/documents.controller.js).
Os caminhos documentados são os do backend, sem o prefixo `/api` do proxy Vite.

No Swagger UI, abra uma operação e selecione **Try it out**. Informe `X-User-Id`
(por exemplo, `alice`) nas operações de documentos. Para `POST /upload`, selecione
um arquivo no campo `file`; use o `id` retornado para testar o download com o mesmo
usuário. Esse cabeçalho não implementa autenticação.

Os arquivos ficam em `backend/storage` por padrão, configurável por `STORAGE_DIR`.
O limite padrão é 10 MiB, configurável por `MAX_FILE_SIZE_BYTES`. Os metadados
ficam em memória e são perdidos ao reiniciar o backend.

Para validar a API e a publicação da documentação:

```bash
npm test --prefix backend
```

## Interface web

Com o backend em execução na porta 3000, inicie o frontend em outro terminal:

```bash
npm install --prefix frontend
npm run dev --prefix frontend
```

Acesse <http://localhost:5173> (ou a URL informada pelo Vite). Informe um
identificador de usuário e selecione **Abrir documentos** para enviar, listar
e baixar arquivos. O identificador é enviado no cabeçalho `X-User-Id` e não
representa autenticação. Ao trocar de usuário, a interface limpa a lista anterior.
O identificador aceita caracteres Latin-1, inclusive acentos como em `joão`,
mas não caracteres de controle ou fora desse conjunto, incompatíveis com o
cabeçalho enviado pelo navegador.

O cliente usa `fetch` com o prefixo `/api`; o proxy de desenvolvimento do Vite
encaminha essas chamadas ao backend local. Em produção, configure o servidor
para encaminhar `/api` ao backend, removendo esse prefixo.

Para executar os testes do cliente de API e dos componentes e gerar a versão de produção:

```bash
npm test --prefix frontend
npm run build --prefix frontend
```

Os testes de API usam o runner nativo do Node e simulam `fetch`. Os testes de
componentes usam Vitest, Testing Library e jsdom, cobrindo upload, download,
troca de usuário, cancelamento e recuperação de erros. As duas suítes rodam sem
backend em execução e também podem ser executadas separadamente com
`npm run test:api --prefix frontend` e `npm run test:components --prefix frontend`.
Para validar a integração manualmente, envie um arquivo,
confira sua presença na lista, baixe-o e compare o conteúdo. Troque o identificador
para confirmar que os documentos do usuário anterior não aparecem.

## Workshop

<img src="https://octodex.github.com/images/Professortocat_v2.png" align="right" height="200px" />

Hey hellyanalves!

Mona here. I'm done preparing your exercise. Hope you enjoy! 💚

Remember, it's self-paced so feel free to take a break! ☕️

[![](https://img.shields.io/badge/Go%20to%20Exercise-%E2%86%92-1f883d?style=for-the-badge&logo=github&labelColor=197935)](https://github.com/treinamentos-serpro/document-management-system-hellyan-oliveira-10112026/issues/1)

---

&copy; 2025 GitHub &bull; [Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md) &bull; [MIT License](https://gh.io/mit)

