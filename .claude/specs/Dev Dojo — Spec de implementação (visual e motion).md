# Dev Dojo — Spec de implementação

Visual system e motion design · v1 · 27 de outubro de 2026

Base: especificação visual e técnica (PDF), revisada contra a proposta paralela de arquitetura. Este documento fecha as decisões de implementação, marca o que segue aberto e define a ordem de trabalho.

## 1. Escopo e princípios

Entregar um ambiente de aprendizado em que tela inicial, trilhas, currículo e atividade compartilham o mesmo universo visual.

- O ambiente (WebGL) dá personalidade; os componentes (DOM) comunicam estado; o conteúdo continua sendo o protagonista.
- Um canvas e um renderer durante toda a vida da aplicação.
- Todo efeito tem fallback, e nenhum é requisito para concluir uma atividade.
- Estado visual desacoplado de rota: a rota define o conteúdo, o coordenador de motion define a transição.

Fora de escopo desta fase: conteúdo das lições, backend, autenticação e modelos 3D.

## 2. Decisões

### 2.1 Fechadas (spec original)

- Ambiente escuro persistente.
- Uma cor de acento por trilha, sobre base global constante.
- Cards 3D com tilt controlado.
- Currículo fosco com perímetro luminoso.
- Expansão do card para a atividade com zoom ambiental sutil.
- Giroscópio opcional no mobile, com fallback por toque.

### 2.2 Adotadas nesta revisão

| Tema | Decisão | Motivo |
| --- | --- | --- |
| Borda luminosa | SVG com `pathLength` normalizado e `stroke-dashoffset` | Velocidade uniforme e acompanha o raio; conic-gradient acelera nos lados longos |
| Amplitude do tilt | Desktop ±4° (X) e ±6° (Y); mobile ±2° e ±3° | Valores da spec, a calibrar na Fase 5 |
| Container fosco | Fundo semi-opaco com ruído sutil; sem `backdrop-filter` em áreas grandes | Re-blur por frame sobre canvas animado é o ponto mais caro da stack |
| Transição | FLIP com Web Animations API, interruptível | View Transitions não é reversível no meio do caminho |
| Cena na atividade | Zoom ambiental durante a transição; depois, renderização sob demanda | Editor opaco cobre a cena; poupa GPU e bateria |
| Giroscópio | Ativado por botão explícito, nunca no carregamento | iOS exige gesto; o pedido precisa de contexto |
| Tipografia | Geist (fallback Inter) na interface; JetBrains Mono em código e metadados | Spec original |
| Carga da cena | Import dinâmico após o primeiro paint, com fundo CSS estático por baixo | Three.js fora do caminho crítico |

### 2.3 Abertas

| # | Decisão | Default adotado até decidir |
| --- | --- | --- |
| 1 | Identidade: manter a paleta fria e diferenciar por movimento e wordmark, ou incorporar o conceito dojo (faixas como progresso) | Paleta da spec; faixas fora do escopo |
| 2 | Framework do front | Módulos TypeScript puros com adapter fino por framework |
| 3 | Ciano (#4DD9FF) e azul (#7C9CFF) são próximos | Manter valores; ícone e rótulo por trilha como reforço; revisar após teste de contraste |
| 4 | Dispositivos de referência | Listar antes da Fase 5 (1 desktop, 1 iPhone, 1 Android intermediário, 1 tablet) |
| 5 | GSAP | Não usar; WAAPI cobre a necessidade |
| 6 | Rotas por hash ou por path | Seguir o roteador atual |

## 3. Estrutura sugerida

```
src/
  design/tokens.css
  capabilities/capabilities.ts      detecção + perfil de performance
  scene/
    scene.ts                        createScene(): SceneAPI
    particles.ts  grid.ts  shaders/
  motion/
    coordinator.ts  states.ts       máquina de estados
    flip.ts  tilt.ts  gyro.ts
  ui/
    PathCard  Curriculum  GlowBorder  ActivityShell
  app/
    router-adapter.ts               rota -> conteúdo + estado inicial
```

Regra de dependência: `ui/` e `app/` só falam com `scene/` pela `SceneAPI`; nenhum componente toca câmera, materiais ou buffers.

## 4. Tokens

Uma única fonte de verdade. A cena lê o acento do mesmo token (`getComputedStyle`) e o repassa por `setAccent()`.

```css
:root {
  --void: #0A0F18;
  --panel: #121C2A;
  --elevated: #1B293A;
  --text-primary: #EAF2FC;
  --on-accent: #0A0F18;
  --accent: #4DD9FF;
  --accent-rgb: 77 217 255;
  --radius-card: 16px;
  --radius-panel: 20px;
  --persp: 1200px;
  --ease-out: cubic-bezier(.2, .8, .2, 1);
  --dur-fast: 150ms;
  --dur-base: 250ms;
  --dur-expand: 520ms;
  --tilt-x: 0;
  --tilt-y: 0;
}
[data-trail='typescript']    { --accent: #4DD9FF; --accent-rgb: 77 217 255; }
[data-trail='javascript']    { --accent: #7C9CFF; --accent-rgb: 124 156 255; }
[data-trail='algorithms']    { --accent: #B69CFF; --accent-rgb: 182 156 255; }
[data-trail='system-design'] { --accent: #6DE6B2; --accent-rgb: 109 230 178; }
```

Notas:

- Acento como fundo de botão exige texto escuro (`--on-accent`), nunca branco.
- Validar contraste (AA) de cada acento sobre `--void` e `--panel` antes de congelar os valores.
- Cor nunca é o único sinal de estado: erro, bloqueio e conclusão levam ícone e texto.

## 5. Capacidades do dispositivo

```ts
export interface Capabilities {
  webgl2: boolean;
  fineHover: boolean;        // (hover: hover) and (pointer: fine)
  coarsePointer: boolean;
  reducedMotion: boolean;    // prefers-reduced-motion
  secureContext: boolean;
  orientation: 'unsupported' | 'needs-permission' | 'available';
  tier: 'high' | 'mid' | 'low';
}
```

Perfil de performance (valores iniciais, a calibrar):

| Tier | Partículas desktop / mobile | DPR máximo | Grid | Blur em elementos pequenos |
| --- | --- | --- | --- | --- |
| high | 5000 / 1500 | 2 / 1.5 | WebGL | sim |
| mid | 2500 / 1000 | 1.5 | WebGL | não |
| low | 800 | 1 | CSS estático | não |

Selecão do tier: medir o frame time médio em \~90 frames na intro. Acima de 24 ms desce um nível; acima de 33 ms vai para `low`. Reavaliar se o frame time degradar por mais de 2 s.

Reduced motion: partículas quase estáticas, sem tilt e sem giroscópio, borda luminosa estática com baixa opacidade, transições viram crossfade de 150 ms (mesma máquina de estados).

## 6. Cena ambiental

```ts
export type SceneState = 'intro' | 'explorer' | 'curriculum' | 'activity';

export interface SceneAPI {
  setAccent(hex: string, durationMs?: number): void;   // default 600 ms
  setSceneState(state: SceneState): void;              // velocidade, brilho, câmera
  setFocus(amount: number): void;                      // 0..1, atenua o ambiente atrás do conteúdo
  setPointer(x: number, y: number): void;              // -1..1, parallax discreto
  setRenderMode(mode: 'running' | 'idle' | 'paused'): void;
  resize(): void;
  destroy(): void;                                     // só no encerramento definitivo
}

export function createScene(canvas: HTMLCanvasElement, caps: Capabilities): Promise<SceneAPI>;
```

Implementação:

- Partículas: `Points` com `BufferGeometry` (atributos de posição, semente e tamanho) e `ShaderMaterial`. Movimento calculado no vertex shader a partir de `uTime`; nenhuma atualização de buffer por frame. Três faixas de profundidade com velocidades distintas.
- Grid: plano grande com shader (linhas por `fract()`, fade por distância, mais intenso perto do horizonte).
- Uniforms: `uTime`, `uAccent`, `uFocus`, `uSpeed`, `uPixelRatio`. `setAccent` interpola `uAccent` com amortecimento dentro do loop.
- Câmera de perspectiva fixa; parallax limitado a um deslocamento pequeno e suavizado.
- Importar só as classes usadas de `three` para permitir tree-shaking.

Modos de renderização:

| Modo | Comportamento |
| --- | --- |
| running | `setAnimationLoop` contínuo |
| idle | Loop limitado a \~15 fps com `uSpeed` reduzido |
| paused | Loop cancelado; o último frame permanece; `resize` renderiza um frame |

Lifecycle:

- `visibilitychange`: aba oculta vai para `paused` e restaura o modo anterior ao voltar.
- `webglcontextlost`: `preventDefault()` e fundo estático; em `webglcontextrestored`, recriar apenas recursos de GPU, sem recriar a aplicação.
- `destroy()` libera geometrias, materiais, renderer e listeners. Não é chamado em troca de rota.
- Carga: `import('./scene/scene')` dentro de `requestIdleCallback` (fallback `setTimeout`) depois do primeiro paint. O canvas entra com fade de opacidade quando o primeiro frame estiver pronto.

## 7. Motion coordinator

| Estado | Rota típica (ajustável) | Cena | Interface |
| --- | --- | --- | --- |
| INTRO | início | `intro`, focus 0 | Marca e CTA |
| PATH\_EXPLORER | trilhas | `explorer` | Cards com tilt |
| CURRICULUM | trilha | `curriculum`, acento da trilha, focus \~0.35 | Container fosco e borda |
| ACTIVITY\_TRANSITION | — | `curriculum` → `activity`, zoom | FLIP |
| ACTIVITY | lição | `activity`, render idle ou paused | Editor |
| RETURN\_TRANSITION | — | `activity` → `curriculum` | FLIP reverso |

```ts
type MotionState =
  | 'INTRO' | 'PATH_EXPLORER' | 'CURRICULUM'
  | 'ACTIVITY_TRANSITION' | 'ACTIVITY' | 'RETURN_TRANSITION';

interface MotionCoordinator {
  readonly state: MotionState;
  resolveInitial(route: ResolvedRoute): void;               // sem animação
  go(target: ResolvedRoute, origin?: HTMLElement): Promise<void>;
  cancelTo(state: MotionState): void;                       // saída de emergência
  subscribe(fn: (s: MotionState) => void): () => void;
}
```

Regras:

1. Acesso direto por URL ou reload usa `resolveInitial`, que posiciona o estado final sem transição.
2. Navegação durante uma transição reverte a `Animation` atual a partir do progresso corrente (`animation.reverse()`), sem saltar para o fim.
3. Timeout de segurança: transição que não termina em 2× a duração força o estado final.
4. Camadas inativas recebem `inert` e `aria-hidden` durante e depois da transição.
5. Foco: ao entrar em ACTIVITY, foco no título da lição (`tabindex='-1'`); ao voltar, foco no item de origem.
6. Reduced motion usa a mesma máquina, com transições de 150 ms.

## 8. Cards 3D e tilt

| Parâmetro | Desktop | Mobile |
| --- | --- | --- |
| Rotação X máxima | ±4° | ±2° |
| Rotação Y máxima | ±6° | ±3° |
| Elevação | 4–8 px no hover (`translateZ`) | Sem hover; toque ou sensor |
| Perspectiva | `var(--persp)` no container do grupo | idem |

Algoritmo:

- Um único loop `requestAnimationFrame` no módulo `tilt`, ativo só enquanto `|alvo − atual| > 0.01`.
- Entrada: `pointermove` (mouse e caneta) normalizado para -1..1 em relação ao centro do grupo; alvo = valor × limite.
- Suavização independente de frame rate: `k = 1 − exp(−dt × 8)` e `atual += (alvo − atual) × k`.
- Saída: escreve `--tilt-x` e `--tilt-y` (graus) no container. Os cards usam `rotateX(calc(var(--tilt-x) * -1deg)) rotateY(calc(var(--tilt-y) * 1deg))`; camadas internas usam `translateZ` para parallax.
- Brilho especular: `radial-gradient` com posição derivada do tilt (`--glow-x`, `--glow-y`).
- `pointerleave` leva o alvo a 0. Foco por teclado aplica a elevação, sem rotação.
- Seleção, foco, scroll e legibilidade têm prioridade sobre o efeito.

Giroscópio:

- Botão 'Ativar movimento' visível apenas se `orientation !== 'unsupported'` e `coarsePointer`.
- iOS: `DeviceOrientationEvent.requestPermission()` dentro do handler do clique. Android: listener direto. Exige contexto seguro.
- Calibração: a média dos primeiros \~10 eventos define o zero (`beta0`, `gamma0`); o desvio é o valor menos o zero.
- Filtro: clamp do desvio em ±20° de entrada, mapeado para os limites de saída, com o mesmo low-pass.
- Negado ou indisponível: fallback por toque (arrastar sobre o grupo aplica o mesmo alvo; soltar volta ao centro). Usar `touch-action: pan-y` e tratar só movimento horizontal dominante, para não brigar com o scroll.
- O sensor é pausado em `visibilitychange` e dentro de ACTIVITY.

## 9. Currículo e borda luminosa

```html
<div class='curriculum' data-trail='typescript'>
  <svg class='glow-border' aria-hidden='true' focusable='false'>
    <rect class='glow-track' />
    <rect class='glow-light' pathLength='100' />
  </svg>
  <!-- conteúdo -->
</div>
```

```css
.curriculum {
  position: relative;
  background: rgb(18 28 42 / .82);
  border-radius: var(--radius-panel);
}
.glow-border {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  pointer-events: none; overflow: visible;
}
.glow-track { fill: none; stroke: rgb(var(--accent-rgb) / .18); stroke-width: 1; }
.glow-light {
  fill: none; stroke: var(--accent); stroke-width: 1.5; stroke-linecap: round;
  stroke-dasharray: 4 46;               /* 2 pontos de luz */
  animation: glow-run 6s linear infinite;
}
@keyframes glow-run { to { stroke-dashoffset: -50; } }
```

- `ResizeObserver` ajusta `viewBox`, `width`, `height` e `rx` dos `rect` ao tamanho real do container (que muda na expansão). O `pathLength='100'` mantém a velocidade independente do tamanho.
- Pausar a animação (`animation-play-state`) com `IntersectionObserver` quando fora da viewport e em ACTIVITY.
- A borda não intercepta eventos de ponteiro e não carrega informação.
- Efeito fosco: `setFocus(~0.35)` atenua o ambiente atrás do container; o fundo semi-opaco com ruído completa a sensação, sem blur grande.
- Se a borda SVG pesar em celular intermediário, plano B: dois ou três pontos pequenos com `offset-path`. Medir na Fase 3, não antes.

## 10. Expansão para a atividade (FLIP)

1. First: `card.getBoundingClientRect()`.
2. Aplicar o layout final do `ActivityShell` e medir Last.
3. Invert: o shell recebe `translate` e `scale` inversos, com `transform-origin: 0 0`. Compensar o raio de borda animando `clip-path: inset(... round ...)`, não escalando o raio.
4. Play: `shell.animate(...)` com 450–600 ms (protótipo: 520 ms). Em paralelo, `scene.setSceneState('activity')` aplica o zoom ambiental (câmera \~6% mais próxima).
5. Conteúdo: anima só o container (fundo, borda, clip). O conteúdo do editor entra em fade (200 ms) a partir de \~60% do progresso, sem ser escalado, para o texto não distorcer.
6. Fim: `setRenderMode('idle')` (ou `paused`), `inert` na camada de trilhas, foco no título.
7. Retorno: `animation.reverse()`; ao terminar, restaurar o contexto e `setRenderMode('running')`.

```ts
async function expand(card: HTMLElement, shell: HTMLElement, scene: SceneAPI) {
  const first = card.getBoundingClientRect();
  shell.hidden = false;                       // layout final aplicado
  const last = shell.getBoundingClientRect();
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  const sx = first.width / last.width;
  const sy = first.height / last.height;

  const anim = shell.animate(
    [
      { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
      { transformOrigin: '0 0', transform: 'none' },
    ],
    { duration: 520, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'both' }
  );

  scene.setSceneState('activity');
  await anim.finished.catch(() => {});        // cancelamento não é erro
  return anim;
}
```

Preservação de estado: o editor é montado uma vez ao abrir a atividade e sobrevive à transição. O rascunho de código vive em um store por `lessonId`, persistido com debounce para sobreviver a reload. Animar apenas `transform`, `opacity` e `clip-path`; nada que force layout contínuo.

## 11. Performance e lifecycle

| Indicador | Meta inicial | Como medir |
| --- | --- | --- |
| Frame time | Próximo de 16,7 ms nos dispositivos de referência | Painel `?debug=perf` e DevTools |
| Contextos WebGL | 1 por sessão, nenhum novo por rota | Contador no debug |
| Memória gráfica | Sem crescimento após 20 ciclos de navegação | `renderer.info.memory` (geometrias e texturas constantes) |
| Carga | Three.js fora do JS inicial; LCP do conteúdo independe do canvas | Lighthouse e bundle analyzer |
| Fallback | Aplicação funcional sem WebGL e sem sensores | Teste manual com WebGL desligado |

Instrumentação: modo debug com fps, frame time, tier, quantidade de partículas e `renderer.info`. A meta de 60 FPS só vale se verificada em dispositivos reais.

Checklist de lifecycle:

- Remover listeners e liberar recursos só no encerramento definitivo.
- Reutilizar geometrias, materiais e texturas.
- Não reconstruir a cena em mudança de rota.
- Reduzir ou suspender trabalho com a aba oculta.
- Limitar `devicePixelRatio` conforme o tier.

## 12. Acessibilidade e degradação

- Respeitar `prefers-reduced-motion` (ver seção 5).
- Navegação por teclado completa, foco visível, ordem semântica e foco correto após transições.
- Elementos ocultos durante transições ficam `inert` e fora da árvore de acessibilidade.
- O conteúdo educacional nunca depende do canvas; falha de WebGL mostra o fundo estático.
- Erro, bloqueio e conclusão comunicados por ícone e texto, não só por cor.
- Contraste AA do texto sobre o container fosco, testado com as partículas ao fundo.
- Giroscópio e tilt nunca são necessários para acessar ou concluir uma atividade.

## 13. Plano de implementação

### Fase 1 — Ambiente persistente

Entrega: canvas único com fundo CSS de fallback; `createScene`; partículas e grid; `setAccent`, `setSceneState`, `setFocus`; resize; `visibilitychange`; perda de contexto; `capabilities` e tier.

Pronto quando: nenhuma rota recria o renderer; o acento muda em \~600 ms; funciona sem WebGL; frame time dentro da meta em um desktop de referência.

### Fase 2 — Tokens e cards

Entrega: `tokens.css`; `PathCard`; `tilt.ts`; `gyro.ts`; fallback por toque.

Pronto quando: limites de ângulo respeitados; foco, seleção e scroll intactos; reduced motion sem tilt.

### Fase 3 — Currículo

Entrega: container fosco; `GlowBorder`; integração com progresso; acento por trilha; `setFocus`.

Pronto quando: contraste AA do texto; borda sem captura de ponteiro; animação pausa fora da viewport; borda medida em celular intermediário.

### Fase 4 — Coordenador e atividade

Entrega: máquina de estados; `resolveInitial`; FLIP interruptível; `ActivityShell`; editor persistente; render sob demanda.

Pronto quando: transição reversível em qualquer ponto; deep link sem animação; foco correto; código preservado; nenhum estado intermediário permanente.

### Fase 5 — Calibração

Entrega: tiers ajustados; ângulos mobile; duração entre 450 e 600 ms com conteúdo real; testes em dispositivos reais; auditoria de acessibilidade.

Pronto quando: todos os critérios da seção 14 passam.

## 14. Critérios de aceitação

- Ambiente contínuo entre tela inicial, currículo e atividade.
- Acento muda por trilha sem alterar a base global.
- Tilt com limites, suavização e fallback por toque.
- Container fosco com perímetro luminoso sem prejuízo de leitura.
- Expansão com zoom ambiental sutil e retorno reversível.
- Código e estado da atividade preservados durante transições.
- Sem novo renderer WebGL por rota.
- Movimento reduzido e fallback sem WebGL funcionais.
- Performance, memória e acessibilidade testadas em dispositivos de referência.

## 15. Riscos

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Borda SVG pesada em mobile | Queda de FPS | Pausar fora da viewport; plano B com `offset-path`; medir na Fase 3 |
| Giroscópio negado ou ruidoso | Tilt errático | Calibração, filtro, fallback por toque |
| Texto distorcido na expansão | Legibilidade | Animar só o container; conteúdo entra em fade |
| Blur sobre canvas animado | Queda de FPS | Sem blur grande; fundo semi-opaco; tiers |
| Acentos ciano e azul parecidos | Confusão e daltonismo | Ícone e rótulo por trilha; decisão aberta nº 3 |
| Transição presa | Interface bloqueada | Timeout de segurança, `cancelTo`, testes de interrupção |
| Three.js no bundle inicial | LCP pior | Import dinâmico após o primeiro paint |
