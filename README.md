SSH-PROXY
--------------

Set up a socksv5 proxy with SSH-Channel.

## USAGE

Install dependencies.

```
npm install 
```

Build a `config.json` with the config below.

```JSON
{
  "ssh" : {
    "host": "<ssh-host>",
  	"username": "<ssh-user>",
    "password": "<password>",
  	"keepaliveInterval": 10000,
  	"keepalive": 1,
  	"keepaliveCountMax": 3,
  	"privateKey": "<ssh-private-key>"
  },
  "port" : 1080
}
```

* port: The port to listen for sock5 connections.
* host: The ip address of your ssh server.
* username: The ssh account
* password: Password of the ssh account. If privateKey is provided, this param can omit.
* privateKey: Private key of your ssh account.

Run `node index.js`
