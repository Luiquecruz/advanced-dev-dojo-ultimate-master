export const traces = {
  SPA: {
    events: [
      { type: 'response-start', time: 70 },
      { type: 'script', time: 160, size: 298000, url: '/assets/vendor.js' },
      { type: 'script', time: 160, size: 114000, url: '/assets/app.js' },
      { type: 'long-task', time: 700, duration: 480 },
      { type: 'first-contentful-paint', time: 1240 },
      { type: 'largest-contentful-paint', time: 1240, element: 'header' },
      { type: 'long-task', time: 2310, duration: 140 },
      { type: 'largest-contentful-paint', time: 2420, element: 'img.hero' },
      { type: 'long-task', time: 2600, duration: 60 },
    ],
  },
  SSR: {
    events: [
      { type: 'response-start', time: 480 },
      { type: 'first-contentful-paint', time: 780 },
      { type: 'largest-contentful-paint', time: 780, element: 'h1' },
      { type: 'script', time: 820, size: 142000, url: '/assets/react-dom.js' },
      { type: 'script', time: 820, size: 44000, url: '/assets/page.js' },
      { type: 'largest-contentful-paint', time: 1180, element: 'img.hero' },
      { type: 'long-task', time: 1350, duration: 310 },
      { type: 'long-task', time: 1700, duration: 90 },
    ],
  },
  SSG: {
    events: [
      { type: 'response-start', time: 90 },
      { type: 'first-contentful-paint', time: 390 },
      { type: 'largest-contentful-paint', time: 390, element: 'h1' },
      { type: 'script', time: 430, size: 142000, url: '/assets/react-dom.js' },
      { type: 'script', time: 430, size: 44000, url: '/assets/page.js' },
      { type: 'largest-contentful-paint', time: 860, element: 'img.hero' },
      { type: 'long-task', time: 960, duration: 310 },
      { type: 'long-task', time: 1320, duration: 90 },
    ],
  },
  Islands: {
    events: [
      { type: 'response-start', time: 90 },
      { type: 'first-contentful-paint', time: 380 },
      { type: 'largest-contentful-paint', time: 380, element: 'h1' },
      { type: 'script', time: 420, size: 46000, url: '/assets/react-dom.js' },
      { type: 'script', time: 420, size: 6000, url: '/assets/islands.js' },
      { type: 'largest-contentful-paint', time: 850, element: 'img.hero' },
      { type: 'long-task', time: 900, duration: 75 },
    ],
  },
};
