import { nodeAdapter } from '../engines/node/adapter';
import { defineChallengeSuite } from './challengeSuite';

defineChallengeSuite('node', nodeAdapter);
