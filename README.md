# TaskFlow (versão web)

Aplicativo web para organizar tarefas acadêmicas: cada pessoa cria sua conta, entra e gerencia as próprias atividades e prazos. Feito só com **HTML, CSS e JavaScript**, sem servidor e sem bibliotecas externas.

> Projeto acadêmico de Engenharia de Software. Os dados ficam **no navegador** (veja [Armazenamento](#armazenamento-de-dados) e [Limitações](#limitações-e-segurança)).

## Funcionalidades

| Código | Requisito | Onde está no app |
|---|---|---|
| RF01 | Cadastrar tarefa | Botão **+ Nova tarefa** → **Salvar** |
| RF02 | Editar tarefa | Detalhes → **Editar** |
| RF03 | Definir prazo | Campo **Prazo** do formulário |
| RF04 | Listar tarefas | Tela inicial, ordenada por prazo |
| RF05 | Marcar como concluída | Círculo na lista ou **Concluir** nos detalhes (alterna com **Reabrir**) |
| RF06 | Excluir tarefa | Detalhes → **Excluir** (pede confirmação) |

Além dos requisitos acima, a versão web tem **criar conta**, **entrar** e **sair**, com os dados de cada usuário separados.

Regras de validação:

- Título e prazo são obrigatórios; a descrição é opcional.
- Título: até 100 caracteres. Descrição: até 500.
- Conta: nome (mínimo 2 caracteres), e-mail válido e senha com no mínimo 8 caracteres. O e-mail não diferencia maiúsculas de minúsculas e não pode se repetir.

## Como executar

**Opção 1: abrir direto.** Dê dois cliques em `index.html`.

**Opção 2: servidor local** (recomendado, e necessário se o navegador bloquear a criptografia ao abrir o arquivo diretamente):

```bash
cd taskflow-web
python3 -m http.server 8000
```

Depois acesse <http://localhost:8000>.

Para testar vários usuários: crie uma conta, adicione tarefas, clique em **Sair**, crie outra conta e confira que a segunda não vê as tarefas da primeira.

## Estrutura do projeto

```
taskflow-web/
├── index.html        # telas: acesso, lista, formulário e detalhes
├── css/
│   └── style.css     # tema escuro minimalista
├── js/
│   ├── storage.js    # leitura e escrita no localStorage
│   ├── auth.js       # cadastro, login e logout
│   └── app.js        # navegação entre telas e regras das tarefas
└── README.md
```

## Armazenamento de dados

Tudo é guardado no `localStorage` do navegador:

| Chave | Conteúdo |
|---|---|
| `taskflow:usuarios` | Lista de usuários: `id_usuario`, `nome`, `email`, `salt`, `hash`, `criado_em` |
| `taskflow:tarefas:<id_usuario>` | Tarefas **de um único usuário** (uma chave por usuário) |
| `taskflow:sessao` (em `sessionStorage`) | Id do usuário logado naquela aba |

É essa separação por chave que isola os dados de cada pessoa. A sessão fica em `sessionStorage`, então fechar a aba encerra o login.

### Modelo de dados

```
USUARIO (id_usuario PK, nome, email, salt, hash, criado_em)
   │ 1
   │
   │ N
TAREFA  (id_tarefa PK, id_usuario, titulo, descricao, prazo, status, criada_em)
```

- `status` assume `pendente` ou `concluida`.
- `prazo` é guardado como `AAAA-MM-DD` e exibido como `dd/mm/aaaa`.
- O modelo do trabalho acadêmico tinha só a entidade TAREFA. **USUARIO** foi acrescentada porque o login e a separação de dados exigem. Se a entrega da disciplina pedir apenas TAREFA, deixe isso claro ao apresentar esta versão.

## Segurança (o que foi feito)

- A senha **não é guardada em texto puro**: o app guarda um sal aleatório de 16 bytes e o resultado de PBKDF2-SHA256 (150 000 iterações) pela Web Crypto API.
- Mensagem de erro genérica no login ("E-mail ou senha incorretos"), tanto para senha errada quanto para e-mail inexistente.
- Todo texto digitado pelo usuário é inserido na página com `textContent`, nunca como HTML, o que evita injeção de código.

## Limitações e segurança

Esta é uma demonstração **sem servidor**, e isso tem consequências:

- **Os dados existem só no navegador e no computador em que foram criados.** Outro navegador, outro computador ou a limpeza dos dados do site começam do zero.
- Quem tem acesso ao navegador pode ler o `localStorage` (pelas ferramentas do desenvolvedor) e até editá-lo. O login impede o uso casual, mas **não é segurança real**. Não use senhas que você utiliza em outros serviços.
- Não há recuperação de senha.
- Os dados de todos os usuários ficam no mesmo navegador. Para contas realmente isoladas, é preciso um back-end com banco de dados.
- Em modo privado, ou com o armazenamento bloqueado, o app avisa que não consegue salvar.

### Para apagar tudo

Nas ferramentas do desenvolvedor do navegador, aba *Application/Armazenamento*, remova as chaves que começam com `taskflow:`. Ou execute no console:

```js
Object.keys(localStorage).filter(k => k.startsWith("taskflow:")).forEach(k => localStorage.removeItem(k));
```

## Como evoluir

Para uma versão de verdade, o caminho natural é substituir `js/storage.js` e `js/auth.js` por chamadas a uma API (por exemplo Node.js ou Python com um banco de dados), que passaria a cuidar do cadastro, do login com senha protegida no servidor e do armazenamento. A interface em `app.js` continuaria quase igual.

## O que foi verificado

Um teste automatizado, rodando a página em um navegador simulado (jsdom), cobriu: validação do cadastro, criação de conta, login com senha certa e errada, RF01 a RF06, ordenação por prazo, isolamento das tarefas entre dois usuários e persistência após recarregar. **Não foi testado em navegadores reais nem com usuários.** Se encontrar algo estranho no visual, confira primeiro em um navegador atualizado (Chrome, Edge, Firefox ou Safari).
