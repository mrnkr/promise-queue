# Promise queue

### Introduction
Perhaps you use redux-observable. That's good, I love it. However, your team may find it a little bit too hard to adapt to rxjs, we may understand it, they may not or perhaps they don't even care. Maybe you just don't use observables, you don't need observables for 90% of the things your app should do but there is that one functionality that screams observable. If you're using redux-saga and face this issue, this will help!

#### Disclaimer
This already exists, there is a library with a very similar implementation and identical name. Problem with it? Does not have unit tests and I wanted to understand it before I used it (and needed typings, I love my types) so I went ahead and rewrote it. As I did I found stuff in the original library that, given the subtle differences between the implementations, was unnecessary. You could say this is a bit of a simplified version of it, it is more strict in the sense that it has unit tests and will continue to get them as I realize what I did not consider at first, blah, blah, blah. I had fun making this myself, I feel like I learnt a lot and now I hope it will help someone out there!

### Quick start
The way to use this is quite simple really, all complexity is hidden from you so you don't need to worry. That's something I wanted to add to this the original library lacked. I grabbed the basic definition of Observable from rxjs and copied it (don't want it changing if it ever changes in that library, however unlikely) and that is what you pass to the constructor.

This is what those observables should look like in typescript:

```typescript
interface Observable<T> {
  subscribe(
    next: (value: T) => void,
    error?: (error: any) => void,
    complete?: () => void,
  ): Subscription;
}
```

The subscription object the observable returns when it is subscribed to is declared like the following interface:

```typescript
interface Subscription {
  unsubscribe(): void;
}
```

Then the saga, in case you're working with sagas (which is, by the way, the only use case I can imagine but if you get creative and find another one share it) will look like this:

```typescript
function* handler(): SagaIterator {
  const observable: Observable<number> = ...;
  const promiseQueue = new PromiseQueue<number>(observable);

  try {
    while (true) {
      const val = yield call(promiseQueue.next);
      yield fork(
        function* (val: number) { yield put({ type: 'EMIT', payload: { val } }); },
        val,
      );
    }
  } catch (err) {
    yield put({ type: 'ERROR', error: err });
  } finally {
    if (promiseQueue.isComplete) {
      yield put({ type: 'COMPLETE' });
    }
  }
}
```

As you can see, all you need to do is provide the constructor with the observable you want. You can always transform anything that behaves like an observable to the expected shape and you'll be good to go all the same. Once you do that, all else is handled for you. Calling next in the first line of the `while (true)` we await a promise that will resolve to the next value the observable emits, as the value gets emitted and next is called again it will return another promise which will then resolve to the subsequent value and so on. It handles completion and errors pretty nicely as well. When the observable is cancelled or completed so does the promise queue.

Just in case anyone needs the functionality (I know I do) it is also possible to cancel the promise queue (hence the observable) manually. Just call queue.cancel() and you'll be good to go!

### API

```typescript
interface PromiseQueue<T> {
  isComplete: boolean;
  cancelled: boolean;
  next(): Promise<T>;
  cancel(): void;
}
```

### A litte insight

This is implemented using two queues: `actions: Queue<Promise<T>>` which enqueues promises which resolve to specific values and `dispatch: Queue<PromiseFunctions<T>>` which enqueues pointers to the resolve and reject functions that promises are built with.

When next() is first called it returns a promise whose resolve and reject will be enqueued in dispatch. Since the yield keyword is used execution gets blocked in that line until it resolves, hence, until the observable emits a value.

Afterwards two things can happen. One is that the observable does not emit anything right away. In that case the same process is repeated. In case it does emit before next can be called then there will be a promise stored in the actions queue - it gets returned.

The publishing mechanism internally allows for this to happen by behaving in two distinct ways. If there are promises to resolve (there are pointers in queue for resolve functions) then they get resolved to the value that the publish funciton received. In other case a new promise gets created which resolves to the value that was emitted by the observable and then enqueues the promise so that it can be returned by next() as soon as it is called.

Observables can be cancelled. This implementation handles errors in the inner observable as a reason for cancellation. Once the PromiseQueue is forcefully terminated all reject functions in dispatch are called with the error that caused it. When the observable is completed only the isComplete flag gets updated to reflect it.

Although I was not the one to come up with this logic I feel happy that I was able to understand it and offer a simpler implementation of it. Simpler and thanks to my unit tests possibly more robust. This is a really useful structure, really clever, hopefully you can get something out of it like I did!
