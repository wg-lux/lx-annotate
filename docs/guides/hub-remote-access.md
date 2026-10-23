# Hub Remote Access

This guide defines how authorized laptops inside the LuxNix VPN use the
central hub's browser UI, and how any lx-annotate client switches to another
machine in remote mode.

## Scope And Threat Model

- The hub holds anonymized processed media and reports only. Browser and API
  access from VPN laptops is therefore protected by TLS plus the Keycloak
  session; client certificates are not required for browser traffic.
- Node-to-node hub transfer is unchanged: it still requires mTLS, envelope
  encryption and the `NetworkNode` request authentication described in
  [hub-export-workflow.md](hub-export-workflow.md).
- Raw media never leaves a site node through this path. Remote mode does not
  proxy, mirror or forward API requests between machines.

## Who May Use The Hub

Access requires all of the following:

1. The laptop is connected to the LuxNix VPN. When
   `remoteAccess.restrictToVpn.enable` is set, nginx serves the lx-annotate
   virtual host only to `allowedClientCidrs` and denies every other address.
2. The user signs in through the hub's Keycloak client.
3. The user holds the role required by each endpoint. Viewing hub data,
   starting training (`/model-training`, dispatched to the hub's own Celery
   training queue) and creating studies (`/studies`) keep their existing
   permission checks; remote access adds no new privilege.

## Remote Mode

`LX_ANNOTATE_REMOTE_MACHINES` is a host-owned JSON list rendered by LuxNix:

```json
[
  {
    "key": "gs-02",
    "display_name": "gs-02 central hub",
    "base_url": "https://gs-02.intern",
    "deployment_role": "central_hub"
  }
]
```

- `key` matches `^[a-z0-9][a-z0-9-]{0,31}$`; keys and origins are unique.
- `base_url` must be a bare `https://` origin without path, credentials, query
  or fragment.
- `deployment_role` is one of `standalone`, `site_node`, `local_study_server`
  or `central_hub`.
- A malformed value stops Django at startup. An empty value hides the selector.

`GET /endoreg-api/runtime/remote-machines/` (authenticated) returns the local
deployment role and the configured list. The navbar selector marks the current
origin and, on **Wechseln**, performs a full browser navigation to the selected
origin. The target serves its own SPA and Keycloak login, so no cross-origin
cookies, CORS credentials or additional CSRF trusted origins are needed.

## LuxNix Configuration

```nix
services.luxnix.lxAnnotateLocal.remoteAccess = {
  machines = [
    {
      key = "gs-02";
      displayName = "gs-02 central hub";
      baseUrl = "https://gs-02.intern";
      deploymentRole = "central_hub";
    }
  ];
  restrictToVpn = {
    enable = true;
    allowedClientCidrs = [ "172.16.255.0/24" ];
  };
};
```

- `restrictToVpn.enable` without CIDRs fails evaluation.
- Hub transfer locations set `allow all;` after their mTLS check, so
  same-cluster site nodes that reach the hub over local addresses keep
  transferring.
- The host firewall is not changed by this option. Confirm that 443 is reachable
  on the VPN interface of each target host.
- Each target host's Keycloak client must list its own origin as a redirect URI.

Enabling these options on a host is a fleet deployment change governed by
`feature-tracking/DeploymentSourceHygiene.yml`.
