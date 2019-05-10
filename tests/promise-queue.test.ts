import { SagaIterator } from 'redux-saga';
import { call, fork, put } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import { BehaviorSubject } from 'rxjs';
import { PromiseQueue } from '../src';

describe('promise queue tests', () => {

  let behaviorSubject: BehaviorSubject<number>;
  let testPromiseQueue: PromiseQueue<number>;
  let handler: () => SagaIterator;

  beforeAll(() => {
    handler = function* (): SagaIterator {
      try {
        while (true) {
          const val = yield call(testPromiseQueue.next);
          yield fork(
            function* (val: number) { yield put({ type: 'EMIT', payload: { val } }); },
            val,
          );
        }
      } catch (err) {
        yield put({ type: 'ERROR', error: err });
      } finally {
        if (testPromiseQueue.isComplete) {
          yield put({ type: 'COMPLETE' });
        }
      }
    };
  });

  beforeEach(() => {
    behaviorSubject = new BehaviorSubject<number>(3);
    testPromiseQueue = new PromiseQueue(behaviorSubject.asObservable());
  });

  it('should have a module', () => {
    expect(PromiseQueue).toBeDefined();
  });

  it('should resolve each promise to the next value in the chain and finish', async () => {
    setTimeout(
      () => {
        behaviorSubject.next(43);
        behaviorSubject.next(22);
      },
      2,
    );

    return expectSaga(handler)
      .put({ type: 'EMIT', payload: { val: 43 } })
      .put({ type: 'EMIT', payload: { val: 22 } })
      .not.put({ type: 'COMPLETE' })
      .silentRun();
  });

  it('should handle errors', () => {
    setTimeout(
      () => {
        behaviorSubject.next(27);

        setTimeout(
          () => {
            behaviorSubject.error(Error('Hehe'));
          },
          2,
        );
      },
      2,
    );

    return expectSaga(handler)
      .put({ type: 'EMIT', payload: { val: 27 } })
      .put({ type: 'ERROR', error: Error('Hehe') })
      .not.put({ type: 'COMPLETE' })
      .silentRun();
  });

  it('should handle observable completion', () => {
    setTimeout(
      () => {
        behaviorSubject.next(27);

        setTimeout(
          () => {
            behaviorSubject.complete();
          },
          2,
        );
      },
      2,
    );

    return expectSaga(handler)
      .put({ type: 'EMIT', payload: { val: 27 } })
      .put({ type: 'COMPLETE' })
      .silentRun();
  });

});
