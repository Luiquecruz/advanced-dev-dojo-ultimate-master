import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './store';

// TODO: create pre-typed hooks with useDispatch.withTypes<AppDispatch>() and useSelector.withTypes<RootState>()
export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;
