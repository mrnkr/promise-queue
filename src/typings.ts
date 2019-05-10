export interface Subscription {
  unsubscribe(): void;
}

export interface Observable<T> {
  subscribe(
    next: (value: T) => void,
    error?: (error: any) => void,
    complete?: () => void,
  ): Subscription;
}

export interface PromiseFunctions<T> {
  resolve: (value?: T | PromiseLike<T> | undefined) => void;
  reject: (reason?: any) => void;
}
