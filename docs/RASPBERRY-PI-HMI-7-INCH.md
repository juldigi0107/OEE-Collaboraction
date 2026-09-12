# Raspberry Pi HMI 7-inch — OEE COLLABORACTION

Target: Raspberry Pi 4 Model B, display 7-inch capacitive touch, 1024x600 landscape, Ethernet preferred.

## 1. Hardware per machine
- Raspberry Pi 4 Model B 2GB or 4GB.
- 7-inch HDMI/DSI capacitive touchscreen. For lowest friction use HDMI + USB touch or official DSI display.
- 64GB High-Endurance microSD.
- Metal/DIN-rail case with cooling.
- 5V/3A regulated supply. In industrial panels prefer DIN-rail 5V supply or isolated 24V-to-5V converter.
- Ethernet patch cable. Wi-Fi is fallback only.
- Micro-HDMI cable if using HDMI display.
- Optional USB 1D/2D barcode scanner.
- Protective front bezel / panel enclosure appropriate to dust, vibration and cleaning chemicals.

## 2. Network architecture
Machine/PLC -> Edge Gateway -> Factory LAN -> HMI + Cloudflare Worker/D1.

HMI is not the PLC master. It only provides operator UI and consumes normalized machine state. The Edge Gateway handles OPC UA, Modbus TCP or local machine API.

Recommended VLANs:
- OT machine VLAN: PLC and Edge Gateway only.
- HMI VLAN: Raspberry Pi HMI devices.
- Enterprise/Internet route: Edge Gateway and HMI may reach approved HTTPS destinations only.
- Never expose PLC ports directly to the Internet.

## 3. Raspberry Pi OS installation
1. Flash Raspberry Pi OS 64-bit with Desktop using Raspberry Pi Imager.
2. Set unique hostname, e.g. `oee-hmi-apm7`.
3. Create a dedicated local kiosk user.
4. Set timezone `Asia/Jakarta`.
5. Enable desktop auto-login for the kiosk user.
6. Disable screen blanking.
7. Prefer DHCP reservation by MAC address; static IP is optional.
8. Install Chromium and CA certificates.
9. Keep SSH disabled unless maintenance policy requires it; if enabled use key authentication and restrict source subnet.

Useful commands:

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y chromium curl ca-certificates
sudo timedatectl set-timezone Asia/Jakarta
sudo raspi-config
```

In `raspi-config`: enable Desktop Autologin and disable Screen Blanking.

## 4. 7-inch kiosk URL
Each machine gets a fixed URL:

```text
https://juldigi0107.github.io/OEE-Collaboraction/?kiosk=hmi&machine=APM-7
```

Change `APM-7` to the approved machine code. Kiosk mode hides application sidebar/topbar and loads the Shopfloor HMI workspace.

## 5. Chromium kiosk autostart (Raspberry Pi OS / labwc)
Repository file: `edge/pi-kiosk/oee-kiosk.sh`.

Copy it to the kiosk user's home, make it executable, and set environment values before launching:

```bash
export OEE_MACHINE=APM-7
export OEE_APP_URL=https://juldigi0107.github.io/OEE-Collaboraction/
chmod +x ~/oee-kiosk.sh
```

Create `~/.config/labwc/autostart` and add:

```text
OEE_MACHINE=APM-7 OEE_APP_URL=https://juldigi0107.github.io/OEE-Collaboraction/ ~/oee-kiosk.sh &
```

The launcher restarts Chromium if it exits.

## 6. Screen and touch setup
- Landscape orientation is recommended.
- Target resolution is 1024x600 or higher.
- Touch target minimum is ~48 px; the application's kiosk stylesheet is optimized for this.
- Use 100% browser zoom.
- For HDMI touchscreens, HDMI carries video and USB normally carries touch.
- Verify touch calibration at all four corners before commissioning.

## 7. Login strategy
Recommended production strategy:
- HMI uses a dedicated operator account for the production department, not superadmin.
- Account receives only the exact permissions required for Start/Finish PRO and downtime actions.
- Superadmin credentials must never be stored on the Pi.
- Session recovery can use normal application login after reboot; auto-login to the web app should only be added later with a device-token design, never by storing a human password in a script.

## 8. Barcode scanner
USB barcode scanners behave like keyboards in most cases.
- Configure scanner suffix to Enter.
- Scan PRO/Work Order/Material barcode into the focused HMI field.
- Validate scanned values against released planning before Start Production.
- 2D scanners are preferred if both QR and 1D barcodes may be used.

## 9. Edge Gateway
One Edge Gateway can serve multiple machines if it can reach all machine controllers on the OT network.

Gateway responsibilities:
- read machine RUN/STOP/ALARM/counter/speed;
- normalize machine codes;
- detect state transitions immediately;
- send transition events to the Worker;
- send counter/speed snapshots at a controlled interval, normally 60 seconds;
- buffer events locally if WAN is unavailable;
- reconnect and replay safely without creating duplicates.

Do not send raw PLC polling at 1-second frequency to D1. Poll locally and only persist state transitions/minute snapshots.

## 10. Commissioning sequence per machine
1. Confirm final machine code and aliases.
2. Confirm PLC/controller type and communication protocol.
3. Record IP/VLAN/port.
4. Map RUN, STOP, ALARM, counter and speed tags/registers.
5. Validate counter direction and reset behavior.
6. Validate machine state for at least one full shift.
7. Install Raspberry Pi HMI and lock it to the machine URL.
8. Validate Start PRO, Finish PRO, PDT, UPDT, COJ, Quality/NG and maintenance call.
9. Validate barcode if used.
10. Simulate WAN failure and recovery.
11. Reconcile production quantity against existing source system.
12. Sign off machine as production-ready.

## 11. Maintenance checklist
Daily: visual check HMI, touch, network badge and machine heartbeat.
Monthly: OS updates in maintenance window, storage health, log review, cable/connector inspection.
Quarterly: restore-test a spare microSD/image, test gateway failover and replay queue.
Keep one prepared spare HMI unit for every 8–10 installed units.

## 12. Security minimum
- No PLC exposed to public Internet.
- Separate OT/HMI network segments where feasible.
- Edge ingest key stored as an OS secret, never in frontend JavaScript.
- Per-role application accounts.
- No superadmin password stored on HMI.
- HTTPS only to cloud services.
- Disable unused services and ports.
- Maintain a machine/IP/tag inventory under controlled access.

## 13. Production acceptance criteria
A station is accepted only when: boot-to-HMI works without keyboard, touch input is reliable, correct machine is locked, machine heartbeat is received, state transitions match the machine, production counter reconciles, operator flow succeeds, maintenance escalation succeeds, WAN recovery is tested, and no configuration/admin page is exposed to the operator role.
