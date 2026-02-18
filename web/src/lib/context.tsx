import { createContext, useContext } from 'react';
import { DataContext } from './types';

export const DataContextState = createContext<DataContext | null>(null);

export function useDataContext() {
    return useContext(DataContextState);
}
