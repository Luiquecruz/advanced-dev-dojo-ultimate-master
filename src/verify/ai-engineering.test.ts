import { nodeAdapter } from '../engines/node/adapter';
import { defineChallengeSuite } from './challengeSuite';
import { frameworkGrader, pythonGrader } from './graders';

defineChallengeSuite('ai-engineering', frameworkGrader(nodeAdapter), 'node');
defineChallengeSuite('ai-engineering', pythonGrader(), 'python');
