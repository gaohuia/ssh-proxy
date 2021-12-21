import { EventEmitter } from "events";

interface IdentifiedObject {
  getId(): number
}

class Heap extends EventEmitter {
  private heap: Map<number, IdentifiedObject>;
  public length = 0;

  constructor() {
    super();
    this.heap = new Map<number, IdentifiedObject>();
  }

  add(client: IdentifiedObject) {
    this.heap.set(client.getId(), client);
    this.length += 1;
    this.emit("added", client);
    // this.emit("change");
  }

  remove(client: IdentifiedObject) {
    this.heap.delete(client.getId());
    this.length -= 1;
    this.emit("removed", client);
  }

  toArray()
  {
    return this.heap.values();
  }
}

export { Heap }

// class User {
//   getId() {
//     return 1;
//   }
// }
