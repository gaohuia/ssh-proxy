
import { terminal } from "terminal-kit";
import { Heap } from "./heap";
import printf from "printf";
import { ClientInfo } from "./client";

type FormatterFunction = (obj : any) => string;
type SortFunction = (obj1 : any, obj2 : any) => number;

function pad(s : string, length: number)
{
  return new Array(length - s.length + 1).join(" ") + s;
}

class Rect {
  public x : number;
  public y : number;
  public w : number;
  public h : number;

  constructor(x : number, y : number, w : number, h : number) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
}

class ListView {
  public rect : Rect;
  private heap : Heap;
  private formatter: FormatterFunction;
  private sorter: SortFunction;
  private lines: number = 0;

  constructor(rect: Rect, heap: Heap, formatter: FormatterFunction, sorter: SortFunction) {
    this.rect = rect;
    this.formatter = formatter;
    this.heap = heap;
    this.sorter = sorter;

    // terminal.tabSet();
    // terminal.saveCursor();
  }

  render()
  {
    terminal.moveTo(1, 1);
    // terminal.eraseScrollback();
    terminal.eraseDisplayBelow();
    terminal.eraseDisplayAbove();
    
    this.lines = 0;

    const list = [...this.heap.toArray()].sort(this.sorter);

    const max = terminal.height - 2;

    let i = 0;
    for (const client of list) {
      i += 1;

      if (i >= max) {
        continue;
      }

      // terminal("%s. %s\n", pad(String(i), 3), this.formatter(client));
      terminal(
        printf("% 3d. %s\n", i, this.formatter(client))
      )
      this.lines += 1;
    }

    terminal("Clients: " + i + "\n");
    this.lines += 1;
    // terminal("Date: " + new Date() + "\n");
  }
}

function interval(interval : number, callback : CallableFunction, loop : number, startRightAway: boolean) : CallableFunction
{
  let count = 0;

  if (startRightAway) {
    callback();
    count += 1;
  }

  const i = setInterval(() => {
    callback();
    if (count ++ >= loop) {
      clearInterval(i);
    }
  }, interval);

  return () => {
    clearInterval(i);
  };
}

export { ListView, Rect }

