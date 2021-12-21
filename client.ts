
import { DrawOptions } from "terminal-kit/ScreenBuffer";
import {Heap} from "./heap"

interface Info {
  srcAddr: string
  srcPort: string
  dstAddr: string
  dstPort: string
}

enum Status {
  Initialized = "initialized",
  Accepted = "accepted",
  Closed = "closed",
  Error = "error",
}

let index = 0;

class Client {
  public id : number;
  public info : Info;
  public status : Status;
  public createdAt : Date;
  public up : number;
  public down: number;

  constructor(info : Info, status : Status) {
    this.id = index ++;
    this.info = info;
    this.status = status;
    this.createdAt = new Date();
    this.up = 0;
    this.down = 0;
  }

  getId() {
    return this.id;
  }
}

// type ClientHeap = Heap;

export { Client as ClientInfo, Status, Heap as ClientHeap};
