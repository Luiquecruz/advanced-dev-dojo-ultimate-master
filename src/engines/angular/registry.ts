import '@angular/compiler';
import 'reflect-metadata';
import * as AngularCore from '@angular/core';
import * as AngularCoreRxjsInterop from '@angular/core/rxjs-interop';
import * as AngularCoreTesting from '@angular/core/testing';
import * as AngularCommon from '@angular/common';
import * as AngularCommonHttp from '@angular/common/http';
import * as AngularCommonHttpTesting from '@angular/common/http/testing';
import * as AngularForms from '@angular/forms';
import * as AngularFormsSignals from '@angular/forms/signals';
import * as AngularRouter from '@angular/router';
import * as AngularRouterTesting from '@angular/router/testing';
import * as AngularPlatformBrowser from '@angular/platform-browser';
import * as NgrxSignals from '@ngrx/signals';
import * as NgrxSignalsEntities from '@ngrx/signals/entities';
import * as NgrxSignalsRxjsInterop from '@ngrx/signals/rxjs-interop';
import * as NgrxStore from '@ngrx/store';
import * as Rxjs from 'rxjs';
import * as RxjsOperators from 'rxjs/operators';
import * as Zod from 'zod';
import { esModule, type ModuleRegistry } from '../shared/project';

export const angularRegistry: ModuleRegistry = {
  '@angular/core': esModule(AngularCore),
  '@angular/core/rxjs-interop': esModule(AngularCoreRxjsInterop),
  '@angular/core/testing': esModule(AngularCoreTesting),
  '@angular/common': esModule(AngularCommon),
  '@angular/common/http': esModule(AngularCommonHttp),
  '@angular/common/http/testing': esModule(AngularCommonHttpTesting),
  '@angular/forms': esModule(AngularForms),
  '@angular/forms/signals': esModule(AngularFormsSignals),
  '@angular/router': esModule(AngularRouter),
  '@angular/router/testing': esModule(AngularRouterTesting),
  '@angular/platform-browser': esModule(AngularPlatformBrowser),
  '@ngrx/signals': esModule(NgrxSignals),
  '@ngrx/signals/entities': esModule(NgrxSignalsEntities),
  '@ngrx/signals/rxjs-interop': esModule(NgrxSignalsRxjsInterop),
  '@ngrx/store': esModule(NgrxStore),
  rxjs: esModule(Rxjs),
  'rxjs/operators': esModule(RxjsOperators),
  zod: esModule(Zod),
};
