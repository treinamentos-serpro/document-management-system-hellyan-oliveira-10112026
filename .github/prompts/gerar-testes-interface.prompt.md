---
name: Gerar testes de interface
description: "Use when creating or extending React frontend UI tests with Vitest and Testing Library in this workspace."
argument-hint: "Componente, fluxo ou comportamento que deve ser testado"
agent: agent
---

Crie ou amplie testes de interface para o frontend cobrindo: ${input:target:Componente, fluxo ou comportamento a testar}.

Considere o código selecionado como contexto, se houver. Caso contrário, localize os componentes, serviços e testes relacionados ao comportamento informado antes de editar.

Siga as convenções existentes neste projeto:
- JavaScript com React, Vitest e `@testing-library/react`; não adicione dependências.
- Coloque ou atualize os testes em `frontend/test/`, seguindo os padrões dos testes próximos.
- Teste resultados observáveis pelo usuário usando consultas acessíveis, como role, label e texto; evite detalhes internos de implementação.
- Simule serviços e APIs nas fronteiras, sem depender de um backend em execução ou de rede real.
- Cubra o fluxo principal e os estados relevantes para o comportamento pedido, incluindo erros, carregamento, vazio ou controles desabilitados quando aplicável.
- Mantenha nomes de símbolos em inglês e use os rótulos reais da interface nas asserções.
- Mantenha o escopo em testes. Não altere código de produção nem faça refatorações; se o teste revelar um provável defeito, descreva-o sem corrigi-lo.

Depois de editar, execute `npm run test:components --prefix frontend`. Corrija falhas causadas pelos testes adicionados e execute o comando novamente. Ao final, resuma os cenários cobertos e informe o resultado da validação.