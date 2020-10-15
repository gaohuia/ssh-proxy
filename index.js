

const Client = require('ssh2').Client;
const socks = require('socksv5');
const fs = require("fs");
const { spawn } = require("child_process");

const httpProxyExec = __dirname + "/socks2http";

let configFile = __dirname + "/config.json";

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

console.log("Start");

const port = config.port || 1080;
let maxConnectionsPerHost = 5;
let configIndex = 0;

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

var srv = socks.createServer(function(info, accept, deny) {
  GetSSHConnection().then((conn) => {
    console.log("Forward out " + info.srcAddr + ":" + info.srcPort + " => " + info.dstAddr + ":" + info.dstPort);
    conn.forwardOut(info.srcAddr, info.srcPort, info.dstAddr, info.dstPort, (err, stream) => {
      if (err != null) {
        console.log("Forward out failed, " + err);
        deny();
        return ;
      }

      console.log("Forward out success." + (typeof stream));

      var client = accept(true);

      if (!client) {
        console.log("Bad client socket, Going to close");
        stream.close();
        deny();
        return ;
      }

      stream.on("error", (e) => {
        console.log("stream error: " + e);
        stream.close();
      });

      client.on("error", (e) => {
        console.log("client error: " + e);
        stream.close();
      });

      client.on("close", () => {
        console.log("client is closed!");
      });

      stream.on("close", () => {
        console.log("stream is closed!");
      });

      stream.pipe(client);
      client.pipe(stream);
    });
  }, () => {
    deny();
  });
});

srv.listen(port, '0.0.0.0', function() {
  console.log('SOCKS server listening on port ' + port);


  if (config.httpPort) {
    const childProcessOptions = {
      'stdio': 'inherit'
    };
    spawn(httpProxyExec, ["-raddr", ":" + port, "-laddr", ":" + config.httpPort], childProcessOptions);
  }
});



srv.useAuth(socks.auth.None());

prepareConnections();
