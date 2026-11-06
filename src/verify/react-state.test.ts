import { angularAdapter } from '../engines/angular/adapter';
import { reactAdapter } from '../engines/react/adapter';
import { defineChallengeSuite } from './challengeSuite';
import { frameworkGrader } from './graders';

defineChallengeSuite('react-state', frameworkGrader(reactAdapter), 'react');
defineChallengeSuite('react-state', frameworkGrader(angularAdapter), 'angular');
