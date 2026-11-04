import { angularAdapter } from '../engines/angular/adapter';
import { defineChallengeSuite } from './challengeSuite';
import { frameworkGrader } from './graders';

defineChallengeSuite('angular', frameworkGrader(angularAdapter));
