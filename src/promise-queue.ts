import { Queue, QueueImpl } from '@mrnkr/simple-queue';
import { Action, Observable, Subscription, PromiseFunctions } from './typings';

export class PromiseQueue<T> {

  public isComplete: boolean;
  public cancelled: boolean;

  private actions: Queue<Promise<Action<T>>>;
  private dispatch: Queue<PromiseFunctions<Action<T>>>;
  private subscription: Subscription;

  constructor(obs: Observable<T>) {
    this.isComplete = false;
    this.cancelled = false;

    this.actions = new QueueImpl<Promise<Action<T>>>();
    this.dispatch = new QueueImpl<PromiseFunctions<Action<T>>>();
    this.subscription = obs.subscribe(this.publish, this.cancel, this.complete);
  }

  public next = () => {
    if (this.hasValueInQueue()) {
      return this.actions.next()!;
    }

    return new Promise<Action<T>>(
      (resolve, reject) => {
        this.dispatch.enqueue({ resolve, reject });
      },
    );
  }

  public cancel = (error: Error) => {
    this.subscription.unsubscribe();
    this.cancelled = true;

    while (this.hasPromiseToResolve()) {
      this.dispatch.next()!.reject(error);
    }
  }

  private publish = (value: T) => {
    const valueToEmit: Action<T> = { value, done: false };

    if (this.hasPromiseToResolve()) {
      return this.dispatch.next()!.resolve(valueToEmit);
    }

    this.actions.enqueue(Promise.resolve(valueToEmit));
  }

  private complete = () => {
    this.isComplete = true;
    const valueToEmit: Action<T> = { value: null, done: true };

    if (this.hasPromiseToResolve()) {
      return this.dispatch.next()!.resolve(valueToEmit);
    }

    this.actions.enqueue(Promise.resolve(valueToEmit));
  }

  private hasPromiseToResolve = () => {
    return this.dispatch.length > 0;
  }

  private hasValueInQueue = () => {
    return this.actions.length > 0;
  }

}
