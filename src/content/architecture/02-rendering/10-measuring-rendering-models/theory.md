## Opinions are cheap, traces are not

Every model in this module claims to be "faster". Faster at what? A SPA answers the first request quickly and paints content late; SSR answers late and paints early; islands ship less JavaScript but paint about as fast as SSG. Choosing between them needs numbers, and the numbers only mean something when you know what each one measures.

## The metrics

**Core Web Vitals** are the three user-centred metrics Google uses in search ranking, judged at the 75th percentile of real visits:

| Metric | Measures | Good |
| --- | --- | --- |
| **LCP** (Largest Contentful Paint) | When the largest text block or image in the viewport is painted: "is the main content there?" | ≤ 2.5 s |
| **INP** (Interaction to Next Paint) | The slowest interaction (click, tap, key) until the next frame, across the visit: "does it respond?" | ≤ 200 ms |
| **CLS** (Cumulative Layout Shift) | How much visible content jumps around: "is it stable?" | ≤ 0.1 |

**Diagnostic metrics** explain the vitals:

- **TTFB** (Time to First Byte): until the first byte of the HTML arrives. Server time, CDN distance, redirects. Good: ≤ 0.8 s.
- **FCP** (First Contentful Paint): the first text or image. Good: ≤ 1.8 s.
- **TBT** (Total Blocking Time): for every **long task** (over 50 ms) between FCP and Time to Interactive, the part above 50 ms, summed. A 120 ms task blocks for 70 ms. It is the lab stand-in for INP, which needs a real user to interact.
- **JavaScript bytes**: not a user metric, but the cost that drives TBT and INP on slow phones.

LCP has its own rules: the browser reports **candidates** as bigger elements paint (a heading, then the hero image) and the **last** one counts; it stops reporting after the first user input.

## The four models, side by side

The sample traces in `traces.js` simulate the same product page on a mid-range phone:

| Model | TTFB | FCP | LCP | TBT | JS |
| --- | --- | --- | --- | --- | --- |
| Islands | 90 ms | 380 ms | 850 ms | 25 ms | 52 kB |
| SSG | 90 ms | 390 ms | 860 ms | 300 ms | 186 kB |
| SSR | 480 ms | 780 ms | 1180 ms | 300 ms | 186 kB |
| SPA | 70 ms | 1240 ms | 2420 ms | 100 ms | 412 kB |

Read it metric by metric and each one tells a partial story:

- By **TTFB**, the SPA wins: its empty shell comes straight from a CDN. The user still sees nothing useful for over two seconds.
- By **TBT**, the SPA beats SSR and SSG. Its 480 ms bundle evaluation happens **before** FCP, while the screen is blank, so TBT does not count it. Low TBT here means "blocked while invisible", not "fast".
- SSG and islands have almost the same **LCP**: both send the content as HTML. Islands win on **JavaScript** and **TBT**, which is what INP feels.
- SSR pays for rendering per request in **TTFB**, but its LCP still beats the SPA by over a second.

## Measuring in the field

Field data (Real User Monitoring) comes from real devices and networks. The browser exposes the raw entries through `PerformanceObserver`:

```js
new PerformanceObserver((list) => {
  const candidates = list.getEntries();
  const lcp = candidates[candidates.length - 1];
  console.log('LCP candidate', lcp.startTime, lcp.element);
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

Use the `web-vitals` library in production instead of hand-written observers: it handles back/forward cache, hidden tabs, prerendering and INP's interaction grouping.

```js
import { onCLS, onINP, onLCP, onTTFB } from 'web-vitals';

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
onTTFB(sendToAnalytics);
```

The **Chrome UX Report (CrUX)** publishes the same field metrics for popular origins, visible in PageSpeed Insights and Search Console.

## Measuring in the lab

Lab tools load the page in a controlled environment, repeatably: **Lighthouse** (DevTools, CI with Lighthouse CI), **WebPageTest** (real devices, filmstrips, waterfalls) and the DevTools **Performance** panel. Throttle CPU and network to a realistic phone, run several times and take the median. The lab explains **why**; the field tells you **whether** users feel it. Bundle size comes from the build (`vite build`, a bundle analyzer) and belongs in a CI budget.

## Pitfalls

- Comparing models on a fast laptop with a fast network: every model looks fine.
- Optimizing one metric and moving the cost elsewhere: SSR improves LCP and worsens TTFB; a skeleton improves FCP and can worsen CLS.
- Trusting averages: vitals are judged at p75, and the slow tail is where the users leave.
- Lab-only decisions: a lab run cannot measure INP and does not see your real users' devices.

## When to choose it

Measure before changing a route's rendering model and again after, with the same script and conditions in the lab, and confirm with field data at p75. Decide with the whole table, weighted by what the route needs: LCP for landing and product pages, INP for interactive tools, TTFB when the server or the CDN is the suspect, and JavaScript bytes as the budget that protects INP on slow devices.
