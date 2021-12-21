
const Client      = require('ssh2').Client;
const socks       = require('socksv5');
const fs          = require("fs");
const { spawn }   = require("child_process");

const { ClientInfo, Status, ClientHeap } = require("./client");
const { ListView, Rect } = require("./term");
const NodeStream = require("stream");

const printf      = require("printf");

const httpProxyExec   = __dirname + "/socks2http";
let   configFile      = __dirname + "/config.json";

if (process.argv.length >= 3) {
    configFile = process.argv[2];
}

const config = JSON.parse(fs.readFileSync(configFile));
let sshConfigs = config.ssh;

sshConfigs.forEach((config, index) => {
  if (config.privateKeyFile) {
    config.privateKey = fs.readFileSync(config.privateKeyFile)
  }
});

const port                  = config.port || 1080;
const maxConnectionsPerHost = 1;
let configIndex             = 0;

function getConfig() {
  return sshConfigs[configIndex ++ % sshConfigs.length];
}

const ConnectionCache = {};
function GetSSHConnection(random) {
  if (!ConnectionCache.sshPromise) {
    console.log("create new cache");
    ConnectionCache.sshPromise = new Array(maxConnectionsPerHost);
  }

  if (!random) {
    random = Math.floor(Math.random() * maxConnectionsPerHost);
  }

  if (ConnectionCache.sshPromise[random] != null) {
    return ConnectionCache.sshPromise[random];
  }

  return ConnectionCache.sshPromise[random] = new Promise((resolve, reject) => {
    const conn = new Client();

    let sshConfig = getConfig();
    console.log("Connecting " + random + " to " + sshConfig.host);

    conn.on("ready", () => {
      console.log("SSH Connection " + random + " to " + sshConfig.host + " ready");
      resolve(conn);
    });

    conn.on("error", (e) => {
      console.log("SSH Connection " + random + " to " + sshConfig.host  + " error: " + e);
      conn.destroy();
    });

    conn.on("close", () => {
      console.log("SSH Connection " + random + " to " + sshConfig.host +  " closed");
      ConnectionCache.sshPromise[random] = null;
      GetSSHConnection(random);
    });

    conn.connect(sshConfig);
  });
}

function prepareConnections()
{
  for (var i=0; i < maxConnectionsPerHost; i++) {
    GetSSHConnection(i);
  }
}

const clientHeap = new ClientHeap();

const listView = new ListView(new Rect(0, 0, 120, 10), clientHeap, (client) => {
  const info = client.info;

  const life = - (client.createdAt.getTime() - (new Date()).getTime()) / 1000;

  return printf("%16s:%-5d  =>  %32s:%-5d %15s %10d up:%-6d down:%-6d", 
    info.srcAddr, 
    info.srcPort,
    info.dstAddr.substring(0, 32),
    info.dstPort,
    client.status,
    life,
    client.up,
    client.down
  )
}, (a, b) => {
  return -(a.createdAt.getTime() - b.createdAt.getTime());
});

clientHeap.on("added", (client) => {
  console.log(`client ${client.getId()} was added`);
  // listView.addItem(client);

  listView.render();
  // console.log(clientHeap.toArray())
});

clientHeap.on("removed", (client) => {
  console.log(`client ${client.getId()} was removed`);
  // listView.removeItem(client);
  listView.render();

  // console.log(clientHeap.toArray())
});

setInterval(() => {
  listView.render();
}, 300);

var srv = socks.createServer(function(info, accept, deny) {

  const clientInfo = new ClientInfo(info, Status.Initialized);
  clientHeap.add(clientInfo);

  GetSSHConnection().then((conn) => {
    conn.forwardOut(info.srcAddr, info.srcPort, info.dstAddr, info.dstPort, (err, stream) => {
      if (err != null) {

        clientInfo.status = Status.Error;
        deny();

        clientHeap.remove(clientInfo);
        return ;
      }

      const client = accept(true);
      if (!client) {
        console.log("Bad client socket, Going to close");
        stream.close();
        deny();

        clientHeap.remove(clientInfo);
        return ;
      }

      clientInfo.status = Status.Accepted;

      stream.on("error", (e) => {
        stream.close();
        clientHeap.remove(clientInfo);
      });

      client.on("error", (e) => {
        stream.close();
        clientHeap.remove(clientInfo);
      });

      client.on("close", () => {
        clientHeap.remove(clientInfo);
      });

      stream.on("close", () => {
        clientHeap.remove(clientInfo);
      });

      const counterUp = function () {
        return NodeStream.Transform({
          transform: (chunk, encoding, callback) => {
            clientInfo.up += chunk.length;
            callback(null, chunk);
          }
        });
      };

      const counterDown =  function(source) {
        return NodeStream.Transform({
          transform: (chunk, encoding, callback) => {
            clientInfo.down += chunk.length;
            callback(null, chunk);
          }
        });
      };

      NodeStream.pipeline(stream, counterDown(), client, () => {});
      NodeStream.pipeline(client, counterUp(), stream, () => {});

    });
  }, () => {
    deny();
    clientHeap.remove(clientInfo);
  });
});

srv.listen(port, '127.0.0.1', function() {

  if (config.httpPort) {
    const childProcessOptions = {
      'stdio': 'inherit'
    };
    
    spawn(httpProxyExec, ["-raddr", "127.0.0.1:" + port, "-laddr", "127.0.0.1:" + config.httpPort], childProcessOptions);
  }
});

srv.useAuth(socks.auth.None());
prepareConnections();
