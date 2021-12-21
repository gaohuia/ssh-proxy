import { terminal } from "terminal-kit";

// terminal.on("terminal", () => {
//   terminal("HELLO\n");
// });

terminal.clear();
terminal.hideCursor();

let i = 0;

setInterval(() => {
  terminal.moveTo(0, 0)
  terminal("HELLO: " + i + "\n");
  i += 1;
}, 1000);

terminal("HELLO");

setTimeout(() => {}, 10000);