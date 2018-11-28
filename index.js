

const Client = require('ssh2').Client;
const socks = require('socksv5');
const fs = require("fs");
const configFile = "./config.json";

let config = JSON.parse(fs.readFileSync(configFile));
let sshConfig = config.ssh;
sshConfig.privateKey = fs.readFileSync(sshConfig.privateKey);

const port = config.port || 1080;

function GetSSHConnection() {
  var static = GetSSHConnection;

  if (static.sshPromise != null) {
    return static.sshPromise;
  }

  return static.sshPromise = new Promise((resolve, reject) => {
    var conn = new Client();

    conn.on("ready", () => {
      console.log("SSH Connection Ready");
      resolve(conn);
    });

    conn.on("error", (e) => {
      console.log("SSH Connection Error: " + e);
      static.sshPromise = null;
    });

    conn.connect(sshConfig);
  });
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
        client.close();
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

srv.listen(port, 'localhost', function() {
  console.log('SOCKS server listening on port ' + port);
});

srv.useAuth(socks.auth.None());
