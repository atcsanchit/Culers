import { createContext, useContext, type ReactNode } from 'react';
import { useFetchAnimation } from '../hooks/useFetchAnimation';

type FetchAnimationValue = ReturnType<typeof useFetchAnimation>;

const FetchAnimationContext = createContext<FetchAnimationValue | null>(null);

export function FetchAnimationProvider({ children }: { children: ReactNode }) {
	const value = useFetchAnimation();
	return <FetchAnimationContext.Provider value={value}>{children}</FetchAnimationContext.Provider>;
}

export function useFetchAnimationState(): FetchAnimationValue {
	const ctx = useContext(FetchAnimationContext);
	if (!ctx) {
		throw new Error('useFetchAnimationState must be used within FetchAnimationProvider');
	}
	return ctx;
}
