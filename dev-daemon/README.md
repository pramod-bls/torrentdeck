# Dev daemon

A throwaway Transmission 4.x daemon for developing against.

```sh
docker compose up -d
```

Connect the app to `localhost:9091` with username `dev`, password `devpass`.

## First-run note

The image generates `config/settings.json` with `"rpc-bind-address": "[::]"`, which fails
silently when the container network has no IPv6 — the RPC port accepts TCP but nothing
answers. If `curl -u dev:devpass http://localhost:9091/transmission/rpc -d '{}'` gets an
empty reply, fix it once with:

```sh
docker compose stop
python3 -c "import json; p='config/settings.json'; d=json.load(open(p)); d['rpc-bind-address']='0.0.0.0'; json.dump(d, open(p,'w'), indent=4)"
docker compose up -d
```
