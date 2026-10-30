import { useState } from 'react';
import { createShell } from './shell/createShell';
import { Shell } from './shell/Shell';
import * as catalogModule from './modules/catalog';
import * as cartModule from './modules/cart';
import * as accountModule from './modules/account';

const applicationModules = [catalogModule, cartModule, accountModule];

export function createApp() {
  const shell = createShell();
  applicationModules.forEach((applicationModule) => applicationModule.register(shell));
  return shell;
}

export default function App() {
  const [shell] = useState(createApp);
  return <Shell shell={shell} />;
}
