# Trilha: Arquitetura com React

Base de conteúdo para uma trilha de estudo, do conceito até arquiteturas em nível de indústria.

## 1. Visão geral da trilha

**Objetivo:** ao final, a pessoa consegue escolher, justificar e implementar uma arquitetura React adequada ao contexto do produto e do time, sem cair em over-engineering.

**Pré-requisitos:** JavaScript/TypeScript sólido, React básico (componentes, props, hooks), noções de HTTP e APIs REST.

**Tese central:** React é apenas a camada de view. Arquitetura é o conjunto de decisões em quatro camadas independentes que se combinam:

1. Onde e quando renderiza
2. Como organiza o código
3. Como gerencia estado e dados
4. Como escala entre times e deploys

**Estrutura sugerida:** 6 módulos, cada um com conceitos, prática e entregável.

| Módulo | Tema | Nível |
| --- | --- | --- |
| 1 | Fundamentos: o que é arquitetura no frontend | Iniciante |
| 2 | Arquiteturas de renderização: de páginas estáticas a RSC | Intermediário |
| 3 | Organização de código | Intermediário |
| 4 | Estado e dados | Intermediário |
| 5 | Arquiteturas em escala: do monólito modular aos micro frontends (industry level) | Avançado |
| 6 | Decisão arquitetural e projeto final | Avançado |

**Escopo obrigatório:** a trilha cobre, no mínimo, as arquiteturas abaixo. Cada uma tem ao menos uma lição própria com teoria, desafio ou quiz.

| Arquitetura | Módulo | Camada de decisão |
| --- | --- | --- |
| Static Pages (páginas estáticas) | 2 | Onde e quando renderiza |
| Model-View-Controller (MVC) | 2 | Onde e quando renderiza / como organiza o código |
| Single Page Applications (SPA) | 2 | Onde e quando renderiza |
| Server-Side Rendering (SSR) | 2 | Onde e quando renderiza |
| Static Site Generation (SSG) | 2 | Onde e quando renderiza |
| Incremental Static Regeneration (ISR) | 2 | Onde e quando renderiza |
| Backend for Frontends (BFF) | 5 | Como escala entre times e deploys |
| Modular Front-end Monolith (monólito frontend modular) | 5 | Como organiza o código / como escala entre times |
| Micro-frontends | 5 | Como escala entre times e deploys |

---

## 2. Módulo 1: Fundamentos

**Conceitos**

- React como biblioteca de UI vs framework
- Arquitetura vs design de componentes vs estrutura de pastas
- Atributos de qualidade: performance, SEO, manutenibilidade, testabilidade, autonomia de times
- Trade-offs e custo de cada decisão
- ADR (Architecture Decision Record) como ferramenta de registro

**Prática**

- Pegar um app React existente e mapear em qual decisão cada uma das quatro camadas foi tomada (mesmo que implicitamente).

**Entregável**

- Um ADR simples descrevendo o contexto, a decisão e as consequências de uma escolha de um projeto real.

---

## 3. Módulo 2: Arquiteturas de renderização

O módulo segue a evolução histórica: cada modelo resolve um problema do anterior e cria um custo novo. A lição de cada modelo responde três perguntas: onde o HTML é gerado, quando é gerado e quanto JavaScript chega ao cliente.

**Conceitos**

| Modelo | Ideia | Stack de exemplo |
| --- | --- | --- |
| Static Pages | Arquivos HTML escritos à mão e servidos como estão por um servidor ou CDN. Sem build, sem servidor de aplicação | HTML + CSS em Nginx, S3, GitHub Pages |
| MVC (server-rendered) | Multi-page app: o controller recebe a request, consulta o model e renderiza uma view (template) por request. Cada navegação recarrega a página | Rails, Laravel, Django, ASP.NET MVC, Express + templates |
| SPA / CSR | Um único HTML vazio; o browser baixa o JS, renderiza tudo e navega sem recarregar. Backend expõe só API | Vite + React Router |
| SSR | HTML renderizado no servidor a cada request, depois hidrata no cliente | Next.js, Remix / React Router 7 |
| SSG | HTML gerado uma vez no build para cada rota conhecida e servido por CDN | Next.js (`generateStaticParams`), Gatsby, Astro |
| ISR | SSG com revalidação: páginas regeneradas em background após um tempo (`revalidate`) ou sob demanda, sem rebuild completo | Next.js (`revalidate`, `revalidatePath`, `revalidateTag`) |
| RSC | Componentes que rodam só no servidor, sem JS enviado ao cliente | Next.js App Router |
| Islands | Página estática com ilhas interativas hidratadas | Astro com React |

**Detalhes por modelo**

- **Static Pages:** o ponto de partida. Performance e custo imbatíveis, zero superfície de ataque no servidor, mas todo conteúdo é manual e duplicado (header, footer) e não há dados dinâmicos. Serve de baseline para comparar todos os outros.
- **MVC:** separa model (dados e regras), view (template) e controller (fluxo da request). No servidor, gera HTML por request com SEO natural. Também existiu no cliente (Backbone, AngularJS), que abriu caminho para as SPAs. Mostrar onde o padrão sobrevive hoje: route handlers + loaders + componentes de view em Remix/Next.js.
- **SPA:** navegação instantânea e separação clara front/back, ao custo de tela branca até o JS carregar, SEO fraco, bundle grande e waterfall de requests.
- **SSR:** primeiro paint rápido e SEO, ao custo de servidor em toda request, TTFB maior e hidratação (o cliente refaz o trabalho para ligar eventos).
- **SSG:** HTML pronto na CDN, TTFB mínimo, mas dados congelados no build e tempo de build que cresce com o número de páginas.
- **ISR:** resolve dados congelados e builds longos do SSG. Modelo stale-while-revalidate: o primeiro visitante após expirar recebe a versão antiga e dispara a regeneração. Revalidação por tempo vs on-demand (webhook do CMS). Riscos: conteúdo desatualizado por uma janela e inconsistência entre páginas.

**Pontos de discussão**

- Linha do tempo: o que cada modelo resolveu do anterior e qual custo introduziu
- MPA (MVC) vs SPA: navegação, estado entre páginas, SEO e complexidade
- Hidratação e seu custo
- Streaming e Suspense
- SSG vs ISR vs SSR: frequência de mudança dos dados vs custo de infra
- Impacto em SEO, Core Web Vitals e custo de infra
- Server Components vs Client Components: onde fica a fronteira
- Mistura por rota: uma mesma aplicação pode ter páginas SSG, ISR, SSR e SPA

**Prática**

- Implementar a mesma página (listagem de produtos) em cinco modelos: página estática, MVC server-rendered, SPA, SSR e SSG com ISR. Medir LCP, TTFB e tamanho do bundle em cada um.
- Opcional: a mesma página em RSC para comparar JS enviado ao cliente.
- Simular uma mudança de preço e observar quando cada modelo reflete o novo valor (imediato, no próximo request, após o `revalidate`, só no próximo build).

**Entregável**

- Tabela comparativa com as métricas medidas, o atraso de atualização de dados de cada modelo e uma recomendação por tipo de produto.

---

## 4. Módulo 3: Organização de código

**Conceitos**

- **MVC como organização de código:** separação model/view/controller e seu legado no React (container/presentational, hooks como controller).
- **Feature-based / Screaming Architecture:** pastas por domínio (`features/checkout`, `features/catalog`) em vez de por tipo técnico.
- **Bulletproof React:** feature-based com regras de dependência, sem imports cruzados entre features.
- **Feature-Sliced Design (FSD):** camadas formais `app → pages → widgets → features → entities → shared`, com import apenas para baixo.
- **Atomic Design:** taxonomia de componentes (atoms, molecules, organisms), mais útil em design system do que na estrutura da aplicação.
- **Clean / Hexagonal no frontend:** domínio e casos de uso isolados do React, com adapters para API e storage.
- **Container/Presentational:** pattern histórico, hoje substituído por custom hooks.

**Exemplo de estrutura feature-based**

```text
src/
  app/            # providers, rotas, bootstrap
  features/
    checkout/
      api/
      components/
      hooks/
      types.ts
      index.ts    # public API da feature
    catalog/
  shared/
    ui/
    lib/
    config/
```

**Prática**

- Refatorar um projeto organizado por tipo técnico para feature-based.
- Configurar regras de lint (ex.: `eslint-plugin-boundaries` ou `import/no-restricted-paths`) para impor as fronteiras.

**Entregável**

- Repositório refatorado com as regras de dependência validadas no CI. Esta base é o ponto de partida do monólito modular no Módulo 5.

---

## 5. Módulo 4: Estado e dados

**Conceitos**

- **Server state vs client state:** dados remotos têm ciclo de vida próprio (cache, revalidação, stale). TanStack Query e SWR resolvem isso.
- **Redux / Redux Toolkit:** store global previsível para estado complexo e compartilhado.
- **Estado atômico:** Jotai e Recoil, para estado granular e derivado.
- **State machines:** XState, para fluxos com muitos estados (checkout, wizard, upload).
- **GraphQL com cache normalizado:** Relay e Apollo.
- Estado na URL como fonte de verdade (filtros, paginação, abas).

**Regra prática**

Antes de adicionar uma lib global, perguntar: este estado é remoto, de URL, de formulário ou realmente de UI? Cada tipo tem a ferramenta mais adequada.

**Prática**

- Construir um fluxo de checkout em três versões: estado local puro, TanStack Query + Context, e XState. Comparar complexidade e bugs possíveis.

**Entregável**

- Mapa de estado da aplicação classificando cada pedaço de estado por tipo e justificando a ferramenta escolhida.

---

## 6. Módulo 5: Arquiteturas em escala (industry level)

O módulo segue um espectro de acoplamento de deploy: monólito → monólito modular → monorepo → micro frontends. Cada passo à direita compra autonomia de times com complexidade operacional.

**Conceitos**

- **Modular Front-end Monolith (monólito frontend modular):** um único app, um único build e um único deploy, dividido em módulos de domínio com fronteiras explícitas (public API por módulo, sem imports internos cruzados, regras validadas por lint ou teste de arquitetura). Entrega a maior parte da autonomia de código de micro frontends sem o custo de deploy distribuído. Pontos: ownership por módulo (`CODEOWNERS`), lazy loading por módulo, extração futura de um módulo para pacote ou micro frontend.
- **Monorepo:** Nx ou Turborepo, com apps e packages compartilhados (design system, utils, configs). Padrão em empresas grandes.
- **Micro frontends:** times independentes entregam partes da UI com deploy separado. Tipos de composição: build-time (pacotes npm), server-side (SSI/ESI, composição no servidor), edge e client-side em runtime. Implementações: Module Federation (Webpack/Rspack), single-spa, Web Components, iframes. Desafios: dependências compartilhadas (versões de React), roteamento entre apps, comunicação (eventos, URL, contratos), consistência visual e performance. Cases conhecidos: Zalando (Project Mosaic) e IKEA.
- **BFF (Backend for Frontend):** camada de API sob medida para cada frontend (web, mobile, TV), agregando e adaptando microserviços. Diferença para API Gateway genérico, quem é dono do BFF (o time de frontend), BFF em Node.js, em route handlers/server actions do Next.js ou via GraphQL. Riscos: lógica de negócio duplicada entre BFFs e BFF virando monólito. Comum em Netflix, Spotify e SoundCloud.
- **Design System como plataforma:** pacote versionado consumido por vários produtos (Polaris da Shopify, Atlassian Design System, Carbon da IBM).
- **Composable / headless commerce:** React no front (Next.js, Hydrogen) consumindo backends desacoplados via API.

**Ponto crítico**

Micro frontends, monorepo e BFF resolvem problemas organizacionais (escala de times), não problemas técnicos. Adotar antes de ter o problema é uma das falhas de arquitetura mais comuns. O monólito modular é o padrão recomendado até que deploys independentes sejam uma necessidade real.

**Prática**

- Transformar o repositório feature-based do Módulo 3 em monólito modular: módulos com public API, ownership e regras de fronteira testadas.
- Construir um BFF que agrega dois serviços (ex.: catálogo e estoque) em um endpoint sob medida para a listagem de produtos.
- Montar um monorepo com Turborepo contendo dois apps e um pacote de design system compartilhado.
- Opcional: extrair um módulo do monólito para micro frontend e expor um componente de um app para o outro via Module Federation.

**Entregável**

- Documento curto avaliando quando micro frontends se justificariam para o produto do estudo em vez do monólito modular, com critérios (número de times, cadência de deploy, acoplamento).

---

## 7. Módulo 6: Decisão arquitetural e projeto final

**Guia de escolha por contexto**

| Contexto | Arquitetura sugerida |
| --- | --- |
| Landing page ou site institucional sem mudanças frequentes | Static Pages ou SSG |
| Blog, documentação, marketing | SSG (ISR se vier de CMS) |
| Catálogo grande com preço ou estoque mudando ao longo do dia | ISR com revalidação on-demand |
| Sistema legado server-rendered (MVC) | Manter MVC e adicionar ilhas React, migrar por rota |
| Produto interno / dashboard | SPA + feature-based + TanStack Query |
| Site público com SEO e dados por usuário | Next.js ou Remix (SSR/RSC) + feature-based |
| Vários clientes (web, mobile) consumindo os mesmos microserviços | BFF por cliente |
| Muitos times no mesmo produto | Monólito modular + monorepo + design system, depois avaliar micro frontends |
| Times com deploys independentes e domínios desacoplados | Micro frontends |
| Regra de negócio complexa | Domínio separado do React (hexagonal/clean) |
| E-commerce composable | Next.js/Hydrogen + backends headless + BFF |

**Projeto final**

Dado um briefing de produto fictício (contexto, número de times, requisitos de SEO e performance, regras de negócio), a pessoa deve:

1. Escolher a arquitetura nas quatro camadas.
2. Registrar cada decisão em um ADR.
3. Implementar um esqueleto funcional (walking skeleton) com uma feature de ponta a ponta.
4. Apresentar os trade-offs e o que ficou de fora de propósito.

**Critérios de avaliação**

- Justificativa das decisões ligada ao contexto, não a moda
- Modelo de renderização escolhido por rota, ligado à frequência de mudança dos dados
- Fronteiras de dependência claras e verificadas
- Separação correta entre server state e client state
- Simplicidade: nada além do necessário

---

## 8. Recursos de referência

- Documentação oficial do React (react.dev), seção sobre Server Components
- Documentação do Next.js (App Router, rendering, ISR e revalidação) e do React Router 7
- Patterns.dev: rendering patterns (static, CSR, SSR, SSG, ISR, islands)
- Martin Fowler: GUI Architectures (MVC e derivados)
- Sam Newman: Backends For Frontends
- Bulletproof React (repositório no GitHub)
- Feature-Sliced Design (feature-sliced.design)
- TanStack Query (tanstack.com/query)
- Micro Frontends (micro-frontends.org, artigo de Cam Jackson em martinfowler.com) e documentação do Module Federation
- Nx e Turborepo (documentação oficial)
- Artigos sobre Design Systems: Polaris, Carbon, Atlassian

## 9. Sugestões de formato para a trilha

- Cada módulo com: resumo de 1 página, leitura guiada, exercício prático e entregável.
- Checkpoint ao final de cada módulo (quiz curto ou revisão de código).
- ADRs acumulados ao longo da trilha formam o portfólio final.
- Carga estimada: 1 a 2 semanas por módulo em ritmo de estudo paralelo ao trabalho.
