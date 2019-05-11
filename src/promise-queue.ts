import { Queue, QueueImpl } from '@mrnkr/simple-queue';
import { Observable, Subscription, PromiseFunctions } from './typings';

export class PromiseQueue<T> {

  public isComplete: boolean;
  public cancelled: boolean;

  private actions: Queue<Promise<T>>;
  private dispatch: Queue<PromiseFunctions<T>>;
  private subscription: Subscription;

  constructor(obs: Observable<T>) {
    this.isComplete = false;
    this.cancelled = false;

    this.actions = new QueueImpl<Promise<T>>();
    this.dispatch = new QueueImpl<PromiseFunctions<T>>();
    this.subscription = obs.subscribe(this.publish, this.cancel, this.complete);
  }

  public next = () => {
    if (this.hasValueInQueue()) {
      return this.actions.next()!;
    }

    return new Promise<T>((resolve, reject) => { this.dispatch.enqueue({ resolve, reject }); });
  }

  private publish = (val: T) => {
    if (this.hasPromiseToResolve()) {
      return this.dispatch.next()!.resolve(val);
    }

    this.actions.enqueue(Promise.resolve(val));
  }

  private cancel = (error: Error) => {
    this.subscription.unsubscribe();
    this.cancelled = true;

    while (this.hasPromiseToResolve()) {
      this.dispatch.next()!.reject(error);
    }
  }

  private complete = () => {
    this.isComplete = true;
  }

  private hasPromiseToResolve = () => {
    return this.dispatch.length > 0;
  }

  private hasValueInQueue = () => {
    return this.actions.length > 0;
  }

}
