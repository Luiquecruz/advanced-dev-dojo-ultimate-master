import * as React from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import * as ReactDom from 'react-dom';
import * as ReactDomClient from 'react-dom/client';
import * as ReactDomServer from 'react-dom/server';
import * as Zustand from 'zustand';
import * as ZustandMiddleware from 'zustand/middleware';
import * as ZustandShallow from 'zustand/shallow';
import * as ZustandMiddlewareImmer from 'zustand/middleware/immer';
import * as ZustandReactShallow from 'zustand/react/shallow';
import * as ZustandVanilla from 'zustand/vanilla';
import * as Jotai from 'jotai';
import * as JotaiUtils from 'jotai/utils';
import * as ReduxToolkit from '@reduxjs/toolkit';
import * as ReactRedux from 'react-redux';
import * as ReactRouter from 'react-router';
import * as ReactQuery from '@tanstack/react-query';
import * as ReactHookForm from 'react-hook-form';
import * as HookFormResolvers from '@hookform/resolvers/zod';
import * as Zod from 'zod';
import * as Clsx from 'clsx';
import * as ReduxToolkitQuery from '@reduxjs/toolkit/query';
import * as ReduxToolkitQueryReact from '@reduxjs/toolkit/query/react';
import * as Mobx from 'mobx';
import * as MobxReactLite from 'mobx-react-lite';
import * as Valtio from 'valtio';
import * as ValtioUtils from 'valtio/utils';
import * as Xstate from 'xstate';
import * as XstateReact from '@xstate/react';
import * as Immer from 'immer';
import * as UseImmer from 'use-immer';
import { esModule, type ModuleRegistry } from '../shared/project';

export const reactRegistry: ModuleRegistry = {
  react: esModule(React),
  'react/jsx-runtime': esModule(ReactJsxRuntime),
  'react/jsx-dev-runtime': esModule(ReactJsxRuntime),
  'react-dom': esModule(ReactDom),
  'react-dom/client': esModule(ReactDomClient),
  'react-dom/server': esModule(ReactDomServer),
  zustand: esModule(Zustand),
  'zustand/middleware': esModule(ZustandMiddleware),
  'zustand/shallow': esModule(ZustandShallow),
  'zustand/middleware/immer': esModule(ZustandMiddlewareImmer),
  'zustand/react/shallow': esModule(ZustandReactShallow),
  'zustand/vanilla': esModule(ZustandVanilla),
  jotai: esModule(Jotai),
  'jotai/utils': esModule(JotaiUtils),
  '@reduxjs/toolkit': esModule(ReduxToolkit),
  'react-redux': esModule(ReactRedux),
  'react-router': esModule(ReactRouter),
  'react-router-dom': esModule(ReactRouter),
  '@tanstack/react-query': esModule(ReactQuery),
  'react-hook-form': esModule(ReactHookForm),
  '@hookform/resolvers/zod': esModule(HookFormResolvers),
  zod: esModule(Zod),
  clsx: esModule(Clsx),
  '@reduxjs/toolkit/query': esModule(ReduxToolkitQuery),
  '@reduxjs/toolkit/query/react': esModule(ReduxToolkitQueryReact),
  mobx: esModule(Mobx),
  'mobx-react-lite': esModule(MobxReactLite),
  valtio: esModule(Valtio),
  'valtio/utils': esModule(ValtioUtils),
  xstate: esModule(Xstate),
  '@xstate/react': esModule(XstateReact),
  immer: esModule(Immer),
  'use-immer': esModule(UseImmer),
};
