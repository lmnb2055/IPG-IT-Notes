# Debian 10 Server Update and CrowdStrike Falcon Sensor Install

**Applies to:** Debian 10 ("buster") servers, including TurnKey Linux appliances
**Sensor package:** `falcon-sensor_8.10.0-19403_amd64.deb`
**Last updated:** 2026-10-22

This guide fixes the broken package sources on Debian 10, installs the remaining OS updates, and installs the Falcon sensor. It also fixes this error from `dpkg -i`:

```
dpkg: dependency problems prevent configuration of falcon-sensor:
 falcon-sensor depends on libnl1 | libnl-3-200; however: ...
```

The commands are written for the Webmin **Command Shell**. They also work over SSH as root.

---

## Before you start

- **Take a VM snapshot** in Azure (or your hypervisor) before step 4.
- Have these ready:
  - the sensor package `.deb` file
  - the Falcon **CID**
  - the **provisioning token**
  - the **host tag** for this server's group (for example, `NJHQAzure`)
- Keep the CID and provisioning token out of tickets, email and chat.

### How the Webmin Command Shell behaves

- **It runs one command at a time.** Paste each code block below as a single line.
- **It can't answer prompts.** Any `[Y/n]` question is answered "Abort" automatically. That's why every `apt-get` command below includes `-y`.
- **Line breaks with `\` don't work.** If a command split with `\` is pasted as one line, you'll see errors like `sed: can't read  :`. Every command in this guide is already on one line.

---

## 1. Confirm the OS version

```sh
cat /etc/debian_version
```

A result of `10.x` means this guide applies. For any other version, steps 2 and 3 don't apply as written.

---

## 2. Point apt at the Debian archive

Debian 10 is end-of-life, and its packages have moved from `deb.debian.org` and `security.debian.org` to `archive.debian.org`. Until the sources are changed, `apt-get update` fails with `404 Not Found` and `no longer has a Release file`.

Back up the apt configuration:

```sh
cp -a /etc/apt /root/apt-backup
```

Rewrite the Debian repository lines. This leaves TurnKey's own repository lines unchanged:

```sh
sed -i -E -e 's#https?://deb\.debian\.org/debian/? #http://archive.debian.org/debian #' -e 's#https?://security\.debian\.org(/debian-security)?/? #http://archive.debian.org/debian-security #' /etc/apt/sources.list /etc/apt/sources.list.d/*.list
```

The message `sed: can't read /etc/apt/sources.list: No such file or directory` is harmless. TurnKey keeps its sources in `/etc/apt/sources.list.d/` instead.

Check the result:

```sh
grep -rn "debian.org" /etc/apt/sources.list /etc/apt/sources.list.d/
```

Each Debian line should now begin like one of these:

```
deb http://archive.debian.org/debian buster ...
deb http://archive.debian.org/debian-security buster/updates ...
```

---

## 3. Refresh the package lists

```sh
apt-get update
```

The output shouldn't contain any `Err:` lines.

If you see `Release file ... is expired`, run this instead:

```sh
apt-get -o Acquire::Check-Valid-Until=false update
```

---

## 4. Install the remaining Debian 10 updates (recommended)

This brings the server up to Debian 10's final patch level. Take the snapshot first.

If you can, run this step over SSH rather than in Webmin. If one of the updates is a Webmin package, the Webmin page can disconnect partway through.

```sh
DEBIAN_FRONTEND=noninteractive apt-get -y -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold upgrade
```

When an updated package includes a new configuration file, `--force-confold` keeps the server's existing one.

If the page disconnects during the upgrade, log back in and run:

```sh
dpkg --configure -a
```

If the upgrade output lists a `linux-image-...` package, reboot. Wait a few minutes, then log back in.


---

## 5. Install the Falcon sensor

Upload the `.deb` file to `/tmp` on the server. In Webmin, use **Tools → Upload and Download → Upload to Server** (on older Webmin versions it's under **Others**). You can also copy it with `scp`.

Install it with `apt-get` rather than `dpkg -i`, so the `libnl` libraries it depends on are installed automatically:

```sh
apt-get install -y /tmp/falcon-sensor_8.10.0-19403_amd64.deb
```

If you already ran `dpkg -i` and got `dependency problems - leaving unconfigured`, run this instead to finish that install:

```sh
apt-get install -f -y
```

Confirm the install:

```sh
dpkg -l falcon-sensor
```

The `falcon-sensor` line should start with `ii`.

---

## 6. Register and start the sensor

Replace the placeholders with your values, and set the tag to match this server's group:

```sh
/opt/CrowdStrike/falconctl -s --cid="<CID>" --provisioning-token="<TOKEN>" --tags="NJHQAzure"
```

No output means it worked.

```sh
systemctl start falcon-sensor
```

---

## 7. Verify

```sh
systemctl status falcon-sensor --no-pager
```

Check for these:

- `Active: active (running)`
- the log lines `SSLSocket connected successfully` and `CLOUDPROTO_ESTABLISHED`

A log line saying `Unable to connect ... via Application Proxy: c0000225` is normal. The sensor tries a proxy first, finds none, and then connects directly.

```sh
/opt/CrowdStrike/falconctl -g --rfm-state
```

Expected result: `rfm-state=false.`

```sh
/opt/CrowdStrike/falconctl -g --aid
```

Note the agent ID (AID). Within a few minutes, the host should appear in the **Falcon console → Host management** with its hostname and tag. Check that it has the correct prevention policy.

---

## Troubleshooting

| Error or message | Cause | Fix |
| --- | --- | --- |
| `dependency problems - leaving unconfigured` (`libnl1`, `libnl-3-200`, `libnl-genl-3-200`) | `dpkg -i` doesn't install dependencies. | Do steps 2–3, then run `apt-get install -f -y`. |
| `404 Not Found` / `no longer has a Release file` | Debian 10 has moved to the archive server. | Step 2. |
| `Release file ... is expired` | Archived release files can carry an old expiry date. | `apt-get -o Acquire::Check-Valid-Until=false update` |
| `Do you want to continue? [Y/n] Abort.` | The Webmin shell can't answer prompts. | Add `-y` to the `apt-get` command. |
| `sh: 1: Y: not found` | The typed answer ran as a separate command. | Add `-y` to the `apt-get` command. |
| `sed: can't read  :` | A command split with `\` was pasted as one line. | Harmless. Use the one-line commands in this guide. |
| `dpkg was interrupted, you must manually run 'dpkg --configure -a'` | An install or upgrade was cut off. | `dpkg --configure -a`, then `apt-get install -f -y`. |
| `falconctl` won't change an existing CID | A CID is already set. | Add `-f`: `/opt/CrowdStrike/falconctl -s -f --cid="<CID>" ...` |
| `rfm-state=true` | This sensor version doesn't support the running kernel. | Compare `uname -r` with CrowdStrike's supported kernel list. Do step 4, reboot, and check again. |
| The log never shows `CLOUDPROTO_ESTABLISHED` | Outbound HTTPS to CrowdStrike is blocked. | Allow outbound TCP 443 to `*.cloudsink.net` in the firewall or Azure NSG. |

---

## Note: Debian 10 is end-of-life

After step 4, the server is on the last packages Debian 10 will ever get. No new security fixes will come, and that includes PHP 7.3 on WordPress servers. Falcon detects threats, but it doesn't patch the OS. Plan to rebuild these servers on a supported release, such as a current TurnKey appliance on Debian 12.
