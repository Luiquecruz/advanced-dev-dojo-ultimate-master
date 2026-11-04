import { defineChallengeSuite } from './challengeSuite';
import { pythonGrader } from './graders';

defineChallengeSuite('python', pythonGrader());
