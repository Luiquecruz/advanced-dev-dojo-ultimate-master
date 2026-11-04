import { nodeAdapter } from '../engines/node/adapter';
import { defineChallengeSuite } from './challengeSuite';
import { frameworkGrader } from './graders';

defineChallengeSuite('node', frameworkGrader(nodeAdapter));
