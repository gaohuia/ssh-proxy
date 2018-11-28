SSH-PROXY
--------------

Set up a socksv5 proxy with SSH-Channel.

## USAGE

Build a `config.json` with the config below.

```JSON
{
  "ssh" : {
    "host": "<ssh-host>",
  	"username": "<ssh-user>",
  	"keepaliveInterval": 10000,
  	"keepalive": 1,
  	"keepaliveCountMax": 3,
  	"privateKey": "<ssh-private-key>"
  },
  "port" : 1080
}
```

Run `node index.js`
