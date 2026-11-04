import { vueAdapter } from '../engines/vue/adapter';
import { defineChallengeSuite } from './challengeSuite';
import { frameworkGrader } from './graders';

defineChallengeSuite('vue', frameworkGrader(vueAdapter));
