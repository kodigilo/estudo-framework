# estudo-framework

Repositório de estudo para **construir um framework web do zero** e entender, na prática, o que um framework realmente faz por baixo dos panos.

- **Mentor:** Gabriel Alencar
- **Aluno:** Wesley

## Objetivo

Em vez de usar um framework pronto, vamos partir do servidor HTTP nativo de cada linguagem e construir as peças por cima, uma de cada vez. A ideia é que o conceito fique claro independente da sintaxe — por isso o mesmo framework será implementado em três linguagens.

## Estrutura

```
.
├── go/    # implementação em Go (net/http)
├── js/    # implementação em JavaScript/Node (http.createServer)
└── php/   # implementação em PHP (php -S / SAPI)
```

## Regras do estudo

1. **Sem bibliotecas prontas.** Só a biblioteca padrão da linguagem.
2. **Uma peça por vez.** Cada etapa adiciona um conceito e pode ser executada isoladamente.
3. **Entender antes de codar.** Toda peça do framework nasce de um conceito de HTTP explicado antes.

---

## Parte 1 — HTTP (base teórica)

Antes de escrever o framework, precisamos entender o protocolo que ele abstrai. Cada tópico se conecta diretamente com uma peça que será construída depois.

| # | Tópico | Vira no framework |
|---|--------|-------------------|
| 1.1 | Anatomia de uma request/response | Parser de Request / montagem de Response |
| 1.2 | Métodos e semântica | Roteador |
| 1.3 | Status codes e headers | Objeto Response |
| 1.4 | Same-Origin Policy | Motivação do middleware de CORS |
| 1.5 | CORS | Middleware de CORS |

### 1.1 Anatomia de uma request/response

HTTP é **texto**. Uma mensagem HTTP/1.1 tem sempre a mesma forma:

```
<linha de início>
<header>: <valor>
<header>: <valor>
                      <- linha em branco obrigatória (CRLF)
<body opcional>
```

**Request crua** (o que o navegador manda):

```http
GET /usuarios/42 HTTP/1.1
Host: localhost:3000
Accept: application/json
User-Agent: curl/8.4.0

```

**Response crua** (o que o servidor devolve):

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 27

{"id":42,"nome":"Wesley"}
```

**Exemplo prático — ver a conversa completa com `curl -v`:**

```bash
curl -v http://localhost:3000/usuarios/42
```

Linhas com `>` são o que saiu (request), linhas com `<` são o que chegou (response).

**Exemplo prático — falar HTTP "na mão" com `nc` (netcat):**

```bash
nc localhost 3000
```

Depois digite (e dê **dois** Enters no final — a linha em branco é o que encerra os headers):

```
GET / HTTP/1.1
Host: localhost

```

> **Ponto para o framework:** o servidor nativo já faz esse parse para nós. O framework vai embrulhar isso num objeto `Request` (método, caminho, headers, body) e num objeto `Response` (status, headers, body) mais confortáveis de usar.

### 1.2 Métodos e semântica

O método diz **a intenção** da request. O servidor não é obrigado a respeitar, mas todo o ecossistema (caches, proxies, navegadores) assume que respeita.

| Método | Intenção | Seguro? | Idempotente? | Tem body? |
|--------|----------|---------|--------------|-----------|
| GET    | Ler um recurso | Sim | Sim | Não |
| POST   | Criar / processar | Não | **Não** | Sim |
| PUT    | Substituir por completo | Não | Sim | Sim |
| PATCH  | Alterar parcialmente | Não | Não* | Sim |
| DELETE | Remover | Não | Sim | Raro |
| OPTIONS| Perguntar o que é permitido | Sim | Sim | Não |

- **Seguro** = não altera estado no servidor.
- **Idempotente** = repetir N vezes dá o mesmo resultado que fazer 1 vez. `DELETE /usuarios/42` duas vezes: o usuário continua removido. `POST /usuarios` duas vezes: dois usuários criados.

**Exemplo prático:**

```bash
curl -X POST http://localhost:3000/usuarios \
  -H "Content-Type: application/json" \
  -d '{"nome":"Wesley"}'

curl -X DELETE http://localhost:3000/usuarios/42
```

> **Ponto para o framework:** o roteador vai casar **método + caminho** com uma função. `GET /usuarios/42` e `DELETE /usuarios/42` têm o mesmo caminho mas são rotas diferentes.

### 1.3 Status codes e headers

A primeira linha da response carrega o **status**: um número de 3 dígitos cuja **centena** já diz a classe.

| Classe | Significado | Exemplos que vamos usar |
|--------|-------------|-------------------------|
| 2xx | Deu certo | `200 OK`, `201 Created`, `204 No Content` |
| 3xx | Vá para outro lugar | `301 Moved Permanently`, `302 Found` |
| 4xx | **Você** errou (cliente) | `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `405 Method Not Allowed` |
| 5xx | **Eu** errei (servidor) | `500 Internal Server Error` |

Headers são o **contrato** da mensagem: dizem como interpretar o body e dão metadados.

| Header | Lado | Para quê |
|--------|------|----------|
| `Content-Type` | ambos | Formato do body (`application/json`, `text/html`) |
| `Content-Length` | ambos | Tamanho do body em bytes |
| `Accept` | request | O que o cliente aceita receber |
| `Authorization` | request | Credenciais |
| `Location` | response | Para onde ir (em 3xx e 201) |
| `Set-Cookie` / `Cookie` | response / request | Estado entre requests ([guia de cookies na MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)) |

**Exemplo prático — só os headers, sem body:**

```bash
curl -I http://localhost:3000/usuarios/42
```

**Exemplo prático — uma response 404 crua:**

```http
HTTP/1.1 404 Not Found
Content-Type: application/json
Content-Length: 31

{"erro":"usuario nao encontrado"}
```

> **Ponto para o framework:** o objeto `Response` vai ter atalhos como `res.status(404).json({...})`, que por baixo só monta essas linhas de texto.

### 1.4 Same-Origin Policy (SOP)

**Origem** = `esquema + host + porta`. Se qualquer um dos três muda, é outra origem.

| URL A | URL B | Mesma origem? |
|-------|-------|---------------|
| `http://site.com/a` | `http://site.com/b` | Sim (só o caminho muda) |
| `http://site.com` | `https://site.com` | **Não** (esquema) |
| `http://site.com` | `http://api.site.com` | **Não** (host) |
| `http://localhost:3000` | `http://localhost:5173` | **Não** (porta) |

A SOP é uma regra **do navegador**: JavaScript rodando em uma origem não pode *ler* a resposta de outra origem. O servidor responde normalmente — é o navegador que bloqueia a leitura.

**Exemplo prático — reproduzir o erro:**

1. Suba a API em `localhost:3000`.
2. Abra qualquer site (ou um `index.html` servido em `localhost:5173`) e rode no console:

```js
fetch('http://localhost:3000/usuarios/42')
  .then(r => r.json())
  .then(console.log)
```

3. O console mostra algo como:

```
Access to fetch at 'http://localhost:3000/usuarios/42' from origin 'http://localhost:5173'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
on the requested resource.
```

4. Agora rode o mesmo `curl` no terminal — funciona. **Isso prova que a restrição é do navegador, não do servidor.**

> **Por que existe:** sem a SOP, qualquer site que você visitasse poderia fazer `fetch` no seu internet banking (usando seus cookies) e ler a resposta.

### 1.5 CORS (Cross-Origin Resource Sharing)

CORS é o mecanismo pelo qual o **servidor** diz ao **navegador**: "pode liberar, eu confio nessa origem". Ele faz isso com headers na response.

#### Requisição simples

Se a request é "simples" (GET/HEAD/POST, só headers básicos, `Content-Type` em `text/plain`, `multipart/form-data` ou `application/x-www-form-urlencoded`), o navegador envia direto com o header `Origin` e só confere a resposta:

```http
GET /usuarios/42 HTTP/1.1
Host: localhost:3000
Origin: http://localhost:5173
```

```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json

{"id":42,"nome":"Wesley"}
```

Sem o `Access-Control-Allow-Origin` na response, o navegador descarta o body e lança o erro do item 1.4.

#### Preflight (`OPTIONS`)

Se a request **não** é simples (ex.: `Content-Type: application/json`, método `PUT`/`DELETE`, header `Authorization`), o navegador **pergunta antes** com um `OPTIONS`:

```http
OPTIONS /usuarios/42 HTTP/1.1
Host: localhost:3000
Origin: http://localhost:5173
Access-Control-Request-Method: DELETE
Access-Control-Request-Headers: authorization
```

O servidor responde o que permite:

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

Só então o navegador manda o `DELETE` de verdade.

**Exemplo prático — simular o preflight com curl:**

```bash
curl -i -X OPTIONS http://localhost:3000/usuarios/42 \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: DELETE" \
  -H "Access-Control-Request-Headers: authorization"
```

#### Headers de CORS (resumo)

| Header (response) | Para quê |
|-------------------|----------|
| `Access-Control-Allow-Origin` | Origem liberada (`*` ou uma origem específica) |
| `Access-Control-Allow-Methods` | Métodos liberados (só no preflight) |
| `Access-Control-Allow-Headers` | Headers que o cliente pode enviar (só no preflight) |
| `Access-Control-Allow-Credentials` | `true` para permitir cookies; **incompatível com `*`** |
| `Access-Control-Expose-Headers` | Headers da response que o JS pode ler além dos básicos |
| `Access-Control-Max-Age` | Por quanto tempo (s) o navegador pode cachear o preflight |

> **Ponto para o framework:** CORS é o middleware perfeito para começar. Ele precisa rodar **antes** de qualquer rota, precisa **interceptar** o `OPTIONS` e responder sozinho, e precisa **adicionar headers** na response de todas as outras rotas. Isso exercita tudo que um pipeline de middlewares precisa fazer.

---

## Parte 2 — Framework (construção)

Cada etapa vira uma pasta/arquivo numerado dentro de `go/`, `js/` e `php/`. Os exemplos abaixo estão em JS por ser o mais curto de ler; a ideia é idêntica nas outras linguagens.

### 2.1 Servidor HTTP mínimo

Ponto de partida: a lib padrão já entrega request parseada e uma forma de escrever a response.

```js
// js/01-servidor/index.js
const http = require('node:http');

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ola mundo');
}).listen(3000);
```

```go
// go/01-servidor/main.go
http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("ola mundo"))
})
http.ListenAndServe(":3000", nil)
```

```php
// php/01-servidor/index.php   (rodar com: php -S localhost:3000)
echo 'ola mundo';
```

### 2.2 Abstração de Request e Response

Embrulhar o que a lib entrega em objetos com a cara que **nós** queremos.

```js
class Request {
  constructor(req) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    this.method = req.method;
    this.path = url.pathname;
    this.query = Object.fromEntries(url.searchParams);
    this.headers = req.headers;
    this.params = {};        // preenchido pelo roteador
    this.body = null;        // preenchido por um middleware de body parser
  }
}

class Response {
  constructor(res) { this.res = res; this.statusCode = 200; }
  status(code) { this.statusCode = code; return this; }
  header(k, v) { this.res.setHeader(k, v); return this; }
  json(data) {
    this.header('Content-Type', 'application/json');
    this.res.writeHead(this.statusCode);
    this.res.end(JSON.stringify(data));
  }
}
```

Uso esperado:

```js
res.status(404).json({ erro: 'usuario nao encontrado' });
```

### 2.3 Roteador

Casar `método + caminho` com um handler, extraindo parâmetros de rota.

```js
class Router {
  constructor() { this.rotas = []; }

  add(method, path, handler) {
    // "/usuarios/:id"  ->  /^\/usuarios\/([^/]+)$/  + ["id"]
    const keys = [];
    const regex = new RegExp('^' + path.replace(/:(\w+)/g, (_, k) => {
      keys.push(k);
      return '([^/]+)';
    }) + '$');
    this.rotas.push({ method, regex, keys, handler });
  }

  get(path, h)    { this.add('GET', path, h); }
  post(path, h)   { this.add('POST', path, h); }
  delete(path, h) { this.add('DELETE', path, h); }

  match(method, path) {
    for (const r of this.rotas) {
      const m = r.regex.exec(path);
      if (m && r.method === method) {
        const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
        return { handler: r.handler, params };
      }
    }
    return null;
  }
}
```

Uso esperado:

```js
app.get('/usuarios/:id', (req, res) => {
  res.json({ id: req.params.id });
});
```

### 2.4 Pipeline de middlewares

Um middleware é uma função `(req, res, next)`. Chamar `next()` passa a bola para o próximo; não chamar encerra a cadeia ali.

```js
class App {
  constructor() { this.middlewares = []; this.router = new Router(); }

  use(fn) { this.middlewares.push(fn); }

  handle(req, res) {
    let i = 0;
    const next = () => {
      const mw = this.middlewares[i++];
      if (mw) return mw(req, res, next);

      // fim da cadeia: cai no roteador
      const rota = this.router.match(req.method, req.path);
      if (!rota) return res.status(404).json({ erro: 'nao encontrado' });
      req.params = rota.params;
      rota.handler(req, res);
    };
    next();
  }
}
```

Um middleware de log, para ver o pipeline funcionando:

```js
app.use((req, res, next) => {
  console.log(req.method, req.path);
  next();
});
```

### 2.5 Middleware de CORS

Agora a Parte 1.5 vira código. Repare nas três responsabilidades: rodar antes de tudo, responder o `OPTIONS` sozinho, e decorar as demais responses.

```js
function cors({ origin = '*', methods = 'GET,POST,PUT,DELETE,OPTIONS', headers = 'Content-Type,Authorization' } = {}) {
  return (req, res, next) => {
    res.header('Access-Control-Allow-Origin', origin);

    if (req.method === 'OPTIONS') {
      // preflight: responde e NÃO chama next()
      res.header('Access-Control-Allow-Methods', methods);
      res.header('Access-Control-Allow-Headers', headers);
      res.header('Access-Control-Max-Age', '86400');
      return res.status(204).end();
    }

    next();
  };
}

app.use(cors({ origin: 'http://localhost:5173' }));
```

Teste de aceite: repetir o `fetch` do item 1.4 no console do navegador e ver o JSON aparecer em vez do erro.

### 2.6 Tratamento de erros

Se um handler lança exceção, o usuário deve receber um `500` em JSON, não uma conexão caída.

```js
handle(req, res) {
  try {
    // ... pipeline ...
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'erro interno' });
  }
}
```

### 2.7 Próximas peças

Definidas conforme o estudo avançar. Candidatas: body parser (JSON), grupos de rota com prefixo, arquivos estáticos, middleware de autenticação.

---

## Referências

- [MDN — Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) — como cookies funcionam, atributos (`HttpOnly`, `Secure`, `SameSite`) e a relação com CORS/credenciais.

## Como acompanhar

Cada linguagem terá seu próprio `README.md` dentro da pasta com instruções de execução. Os commits seguem a ordem do roteiro, então o histórico do git serve como linha do tempo do estudo.
