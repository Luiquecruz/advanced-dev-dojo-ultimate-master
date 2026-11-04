import { reactAdapter } from '../engines/react/adapter';
import { defineChallengeSuite } from './challengeSuite';
import { frameworkGrader } from './graders';

defineChallengeSuite('architecture', frameworkGrader(reactAdapter));
