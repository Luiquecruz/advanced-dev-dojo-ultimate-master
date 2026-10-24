import * as Vue from 'vue';
import * as VueRouter from 'vue-router';
import * as Pinia from 'pinia';
import * as VueUse from '@vueuse/core';
import * as VueQuery from '@tanstack/vue-query';
import * as VeeValidate from 'vee-validate';
import * as Zod from 'zod';
import { esModule, type ModuleRegistry } from '../shared/project';

/**
 * Injects component styles into the current document.
 */
function injectStyle(css: string): void {
  const style = document.createElement('style');
  style.setAttribute('data-dojo-style', '');
  style.textContent = css;
  document.head.appendChild(style);
}

export const vueRegistry: ModuleRegistry = {
  vue: esModule(Vue),
  'vue-router': esModule(VueRouter),
  pinia: esModule(Pinia),
  '@vueuse/core': esModule(VueUse),
  '@tanstack/vue-query': esModule(VueQuery),
  'vee-validate': esModule(VeeValidate),
  zod: esModule(Zod),
  '__dojo/style': { __esModule: true, default: injectStyle },
};
