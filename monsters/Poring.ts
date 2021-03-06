import { defer, Observable } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { CropImage, Monster } from './Monster';

export class Poring extends Monster {
  x = 100;
  y = 100;
  speedX = 5;
  speedY = 5;
  frameX = 0;
  frameY = 0;
  width = 60;
  height = 60;

  frames: CropImage[][] = [
    [
      { order: 0, offsetX: 0, width: 60 },
      { order: 1, offsetX: 60, width: 60 },
      { order: 2, offsetX: 120, width: 60 },
      { order: 3, offsetX: 185, width: 60 },
    ],
    [
      { order: 0, offsetX: 0, width: 50 },
      { order: 1, offsetX: 50, width: 50 },
      { order: 2, offsetX: 100, width: 50 },
      { order: 3, offsetX: 155, width: 50 },
      { order: 4, offsetX: 200, width: 50 },
      { order: 5, offsetX: 255, width: 50 },
      { order: 6, offsetX: 310, width: 50 },
      { order: 7, offsetX: 365, width: 50 },
    ],
    [],
    [
      { order: 0, offsetX: 0, width: 50, offsetY: 200, height: 50 },
      { order: 1, offsetX: 50, width: 50, offsetY: 200, height: 50 },
      { order: 2, offsetX: 130, width: 90, offsetY: 200, height: 50 },
      {
        order: 3,
        offsetX: 240,
        offsetY: 190,
        width: 90,
        height: 80,
        marginHeight: -20,
        marginWidth: 0,
      },
      {
        order: 4,
        offsetX: 310,
        offsetY: 180,
        width: 130,
        height: 80,
        marginWidth: -45,
        marginHeight: -25,
      },
      {
        order: 5,
        offsetX: 430,
        offsetY: 200,
        width: 120,
        height: 60,
        marginWidth: -45,
        marginHeight: -3,
      },
    ],
  ];

  constructor(canvas: HTMLCanvasElement) {
    super(
      canvas,
      'https://www.spriters-resource.com/resources/sheets/124/126666.png?updated=1582904836'
    );
  }

  getFrameEntry(frameY: number, frameX: number) {
    return this.frames[frameY][frameX];
  }
  standing(): Observable<any> {
    return defer(() => {
      this.frameY = 0;
      return this.createForwardFrame(250, 0, 3);
    });
  }

  dying(): Observable<any> {
    return defer(() => {
      this.frameY = 3;
      return this.createForwardFrame(150, 0, 5).pipe(
        takeWhile((frameX) => {
          return frameX + 1 <= 5;
        })
      );
    });
  }

  walking(): Observable<any> {
    return defer(() => {
      this.frameY = 1;
      return this.createForwardFrame(100, 0, 7);
    });
  }
}
