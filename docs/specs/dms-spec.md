# Especificação - Document Management System

## 1. Objetivo

Permitir que usuários enviem, consultem e baixem seus documentos, armazenando os arquivos no filesystem local da aplicação e mantendo seus metadados em memória.

## 2. Escopo

### Dentro do escopo

- Envio de documentos por upload.
- Listagem dos documentos associados ao usuário solicitante.
- Download de um documento pelo identificador.
- Associação simples entre documentos e usuários.
- Interface web para envio, listagem e download.
- Armazenamento dos arquivos em disco local com Multer `diskStorage`.
- Armazenamento dos metadados em memória durante a execução do processo.

### Fora do escopo

- Armazenamento em nuvem ou em serviços externos.
- Versionamento, edição ou exclusão de documentos.
- Persistência dos metadados após reiniciar o backend.
- Autenticação, cadastro ou administração de usuários.
- Compartilhamento de documentos entre usuários.
- Busca avançada, categorias e pré-visualização de arquivos.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O sistema deve aceitar o envio de um arquivo por requisição `multipart/form-data`, no campo `file`. |
| RF-02 | O sistema deve associar cada documento ao usuário identificado pelo cabeçalho `X-User-Id`. |
| RF-03 | O sistema deve gerar um identificador único para cada documento. |
| RF-04 | O sistema deve gravar o conteúdo do arquivo no filesystem local usando Multer com `diskStorage`. |
| RF-05 | O sistema deve armazenar em memória os metadados do documento após o arquivo ser gravado. |
| RF-06 | O sistema deve listar somente os documentos pertencentes ao usuário indicado em `X-User-Id`. |
| RF-07 | A listagem deve apresentar os documentos em ordem decrescente de data de envio. |
| RF-08 | O sistema deve permitir o download de um documento pertencente ao usuário indicado em `X-User-Id`. |
| RF-09 | O sistema deve retornar erro `404` quando o documento não existir ou não pertencer ao usuário solicitante. |
| RF-10 | A interface deve permitir selecionar e enviar um arquivo, apresentar o resultado e atualizar a listagem após o envio bem-sucedido. |
| RF-11 | A interface deve permitir baixar um documento listado e apresentar mensagens compreensíveis quando uma operação falhar. |
| RF-12 | O endpoint `GET /health` existente deve continuar disponível e retornar o estado de saúde do backend. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem permanecer exclusivamente no filesystem local da aplicação; não devem ser usados provedores externos. |
| RNF-02 | O armazenamento padrão dos arquivos deve ser `backend/storage`, configurável por `STORAGE_DIR`. |
| RNF-03 | Os metadados devem ser mantidos em memória e podem ser perdidos ao reiniciar o processo. |
| RNF-04 | O tamanho máximo do arquivo deve ser configurável por `MAX_FILE_SIZE_BYTES`, com padrão de 10 MiB (10.485.760 bytes). |
| RNF-05 | A configuração operacional deve ser feita por variáveis de ambiente, incluindo `PORT`, `STORAGE_DIR` e `MAX_FILE_SIZE_BYTES`. |
| RNF-06 | O nome físico do arquivo deve ser gerado pelo servidor e não deve derivar diretamente do nome fornecido pelo usuário. |
| RNF-07 | O caminho físico e o nome interno de armazenamento não devem ser expostos pela API. |
| RNF-08 | Erros de entrada devem ser tratados na fronteira HTTP e convertidos em respostas consistentes, sem expor stack traces. |
| RNF-09 | O backend deve manter o fluxo de dependências `routes -> controllers -> services -> repositories`. |
| RNF-10 | O frontend deve acessar a API usando `fetch` pelo prefixo `/api`; o proxy de desenvolvimento do Vite remove esse prefixo ao encaminhar as chamadas ao backend. |

## 5. Modelo de dados

### Documento

| Campo | Tipo | Exposição | Descrição |
| --- | --- | --- | --- |
| `id` | `string` | API | Identificador único, gerado pelo servidor, preferencialmente UUID. |
| `originalName` | `string` | API | Nome original fornecido pelo cliente, usado para exibição e download. |
| `size` | `number` | API | Tamanho do arquivo em bytes. |
| `uploadedAt` | `string` | API | Data e hora do upload em ISO 8601 UTC. |
| `owner` | `string` | API | Identificador do usuário recebido em `X-User-Id`. |
| `storedName` | `string` | Interno | Nome gerado pelo servidor para o arquivo no disco. |
| `storagePath` | `string` | Interno | Caminho local necessário para localizar o arquivo; não deve ser retornado pela API. |
| `mimeType` | `string` | Interno | Tipo informado/detectado para o arquivo, usado quando necessário na resposta de download. |

Os metadados devem ser mantidos por um repositório em memória. O repositório deve oferecer operações para registrar, listar por proprietário e localizar por identificador. O acesso ao arquivo físico deve ser feito pelo componente responsável pelo armazenamento local, sem incluir caminhos internos no contrato público.

### Identidade do usuário

O MVP não implementa autenticação. Para permitir a associação e filtragem por usuário, as requisições devem fornecer `X-User-Id`, com valor não vazio. Esse valor é uma identificação declarada pelo cliente e não comprova identidade; o mecanismo não deve ser considerado seguro para exposição pública ou uso multiusuário confiável.

## 6. Contratos de API

Os contratos abaixo usam o prefixo público `/api`, atendido pelo proxy do Vite no desenvolvimento. O backend recebe os caminhos sem esse prefixo, conforme a configuração atual do proxy.

### Resposta de erro

Erros da API devem usar o formato:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Descrição compreensível do erro."
  }
}