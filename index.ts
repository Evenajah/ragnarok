import './style.css';

import {
  fromEvent,
  startWith,
  tap,
  switchMap,
  animationFrameScheduler,
  interval,
  share,
  filter,
  Subject,
  timer,
  from,
  AsyncSubject,
  exhaustMap,
  merge,
  pipe,
  OperatorFunction,
  defer,
  ignoreElements,
  EMPTY,
  BehaviorSubject,
} from 'rxjs';
import {
  connect,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  mergeMap,
  onErrorResumeNext,
  repeat,
  shareReplay,
  takeLast,
  takeUntil,
  withLatestFrom,
} from 'rxjs/operators';
import { Acidus } from './monsters/Acidus';
import { Poring } from './monsters/Poring';
import { Monster } from './monsters/Monster';
import { GeffenMonk } from './monsters/GeffenMonk';

const canvas = document.querySelector<HTMLCanvasElement>('canvas');
const ctx = canvas.getContext('2d');
const onWindowResize$ = fromEvent(window, 'resize').pipe(
  startWith(0),
  tap(() => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  })
);

const acidus = new Acidus(canvas);
// const monk = new GeffenMonk(canvas);
// const poring = new Poring(canvas);

const porings = Array.from({ length: 30 }, () => new Poring(canvas));

const onRespawnPoring$ = new Subject<Poring>();

const render$ = new Subject<void>();

const tick = () => {
  render$.next();
};

const onEndAnimationRemoveMonster = <T>(
  monstersCage: Monster[],
  monster: Monster
): OperatorFunction<T, any> => {
  return pipe(
    onErrorResumeNext(
      timer(1500).pipe(
        tap(() => {
          const index = monstersCage.findIndex((p) => p === monster);
          if (index > -1) {
            monstersCage.splice(index, 1);
            // tick();
          }
        })
      )
    )
  );
};

const onCanvasMount$ = new AsyncSubject<void>();

const onCanvasRender$ = onWindowResize$.pipe(
  switchMap(() => {
    onCanvasMount$.next();
    onCanvasMount$.complete();

    return render$.pipe(
      debounceTime(0, animationFrameScheduler),
      tap(() => {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      })
    );
  }),
  share()
);

onCanvasRender$.subscribe(() => {
  // poring.drawImage();
  porings.forEach((poring) => poring.drawImage());
  acidus.drawImage();
  // monk.drawImage();
});

// monk.standing().subscribe(() => tick());

const onLoadPoring$ = merge(
  onRespawnPoring$.pipe(
    tap((poring) => {
      porings.push(poring);
    })
  ),
  from(porings)
).pipe(shareReplay());

onCanvasMount$.pipe(switchMap(() => onLoadPoring$)).subscribe((poring) => {
  poring.randomSpawn();
});

onLoadPoring$
  .pipe(mergeMap((poring) => poring.randomAction()))
  .subscribe(() => tick());

// const keydown$ = fromEvent<KeyboardEvent>(document, 'keydown').pipe(
//   tap((event) => event.preventDefault()),
//   share()
// );

// keydown$
//   .pipe(
//     mergeMap(() =>
//       from(porings).pipe(
//         mergeMap((poring) => {
//           return poring.forceDie().pipe(
//             tap(() => tick()),
//             removeMonster(porings, poring)
//           );
//         })
//       )
//     )
//   )
//   .subscribe();

// const keyup$ = fromEvent<KeyboardEvent>(document, 'keyup').pipe(
//   tap((event) => event.preventDefault()),
//   share()
// );

// const onKeydown = (
//   key: 'ArrowRight' | 'ArrowLeft' | 'ArrowUp' | 'ArrowDown',
//   updater: () => void
// ) => {
//   return keydown$.pipe(
//     filter((event) => event.key === key),
//     exhaustMap(() => {
//       return interval(80, animationFrameScheduler).pipe(
//         tap(() => {
//           updater();
//           tick();
//         }),
//         takeUntil(keyup$)
//       );
//     }),
//     share()
//   );
// };

// const arrowRight$ = onKeydown('ArrowRight', () => acidus.moveRight());
// const arrowLeft$ = onKeydown('ArrowLeft', () => acidus.moveLeft());
// const arrowUp$ = onKeydown('ArrowUp', () => acidus.moveUp());
// const arrowDown$ = onKeydown('ArrowDown', () => acidus.moveDown());

// const acidusMove$ = merge(arrowRight$, arrowLeft$, arrowUp$, arrowDown$).pipe(
//   map(() => acidus),
//   share()
// );

const onAcidusAttack$ = defer(() => {
  canvas.style.cursor = 'none';
  const mousemove$ = fromEvent<MouseEvent>(canvas, 'mousemove').pipe(share());
  const mousedown$ = fromEvent<MouseEvent>(canvas, 'mousedown').pipe(share());
  const nextAction$ = new BehaviorSubject<string>('move');

  const actions$ = merge(
    mousedown$.pipe(map(() => 'attack')),
    nextAction$
  ).pipe(distinctUntilChanged(), shareReplay(1));

  const animation$ = actions$.pipe(
    switchMap((action) => {
      if (action === 'attack') {
        return acidus.attack().pipe(
          tap(() => tick()),
          finalize(() => nextAction$.next('move'))
        );
      } else if (action === 'move') {
        return acidus.standing();
      }
      return EMPTY;
    })
  );

  const canAttack$ = actions$.pipe(
    filter((action) => action === 'attack'),
    withLatestFrom(mousemove$),
    map(([action, event]) => event)
  );
  const canMove$ = mousemove$.pipe(
    tap((event) => {
      acidus.x = event.x - acidus.width / 2;
      acidus.y = event.y - acidus.height / 2;
      tick();
    })
  );
  return merge(
    canMove$.pipe(ignoreElements()),
    canAttack$,
    animation$.pipe(ignoreElements())
  );
}).pipe(share());

onAcidusAttack$
  .pipe(
    map((eventAttact) => {
      let { x: sourceX, y: sourceY } = eventAttact;
      sourceX = sourceX - acidus.width / 2;

      return porings.filter((monster) => {
        const { x: targetX, y: targetY } = monster;
        const distance = Math.sqrt(
          (sourceX - targetX) ** 2 + (sourceY - targetY) ** 2
        );
        return distance <= 80;
      });
    }),
    mergeMap((collision) => {
      return from(collision).pipe(
        mergeMap((monster) =>
          monster.forceDie().pipe(
            connect((animate$) => {
              const render$ = animate$.pipe(tap(() => tick()));
              const removeMonsterOffScreen$ = animate$.pipe(
                onEndAnimationRemoveMonster(porings, monster),
                takeLast(1)
              );
              const respawnPoring$ = removeMonsterOffScreen$.pipe(
                switchMap(() => {
                  const respawnTime = Math.random() * 30000 + 10000;
                  return timer(respawnTime);
                }),
                tap(() => {
                  onRespawnPoring$.next(new Poring(canvas));
                })
              );
              return merge(
                render$,
                removeMonsterOffScreen$.pipe(ignoreElements()),
                respawnPoring$.pipe(ignoreElements())
              );
            })
          )
        )
      );
    })
  )
  .subscribe();
