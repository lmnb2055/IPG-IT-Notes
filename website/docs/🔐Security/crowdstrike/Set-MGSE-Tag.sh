#!/bin/bash
# ============================================================
#  Set-MGSE-Tag.sh   (v2)
#  Inteplast IT - CrowdStrike Falcon sensor grouping tag (Linux)
#
#  Usage:  sudo bash Set-MGSE-Tag.sh
#
#  EDIT TAG BELOW FOR EACH PLANT. Do not ship MGSE to another site.
# ============================================================

# ---- EDIT THESE --------------------------------------------
TAG="MGSE"
MAINT_TOKEN=""
#   ^ Leave empty unless the sensor refuses with a maintenance-
#     protection error (sensor 7.20+ with protection armed).
#     Get it from the Falcon console:
#     Host management > select host > Actions > Reveal maintenance token
#
#     NOTE: sources disagree on the exact flag. Confirm on ONE host with
#           sudo /opt/CrowdStrike/falconctl --help | grep -i token
#           and adjust TOKEN_ARG below if needed.
TOKEN_ARG="--maintenance-token"
# ------------------------------------------------------------

FALCONCTL="/opt/CrowdStrike/falconctl"

SCRIPT_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)" || SCRIPT_DIR="/tmp"
LOGFILE="$SCRIPT_DIR/Set-Tag-Log.txt"
touch "$LOGFILE" 2>/dev/null || LOGFILE="/tmp/Set-Tag-Log.txt"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S')  $(hostname)  tag=$TAG  result=$1" >> "$LOGFILE" 2>/dev/null
}

# --- must run as root ---------------------------------------
if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: must run as root.  Try:  sudo bash $0"
    exit 1
fi

# --- sensor installed? --------------------------------------
if [ ! -x "$FALCONCTL" ]; then
    echo "ERROR: $FALCONCTL not found."
    echo "       The Falcon sensor does not appear to be installed."
    log "NO_SENSOR"
    exit 1
fi

# --- show what is there now ---------------------------------
PREV="$("$FALCONCTL" -g --tags 2>/dev/null)"
echo "Previous tag: ${PREV:-(none - this is the expected state)}"
echo

# --- set the tag --------------------------------------------
# -s = set, -f = force (REQUIRED when a tag already exists)
# NOTE: -s OVERWRITES all existing tags. To keep existing ones,
#       list them all:  TAG="MGSE,LinuxServer"
echo "Setting tag to: $TAG"

if [ -n "$MAINT_TOKEN" ]; then
    "$FALCONCTL" -s -f --tags="$TAG" "$TOKEN_ARG=$MAINT_TOKEN"
else
    "$FALCONCTL" -s -f --tags="$TAG"
fi

if [ $? -ne 0 ]; then
    echo
    echo "ERROR: failed to set the tag."
    echo "       If the error mentions maintenance protection, fill in"
    echo "       MAINT_TOKEN at the top of this script and run it again."
    log "SET_FAILED"
    exit 1
fi

# --- restart is REQUIRED on Linux ---------------------------
# Without a restart the sensor will NOT sync the new tag.
echo "Restarting falcon-sensor ..."
RESTART_OK=1
systemctl restart falcon-sensor 2>/dev/null || RESTART_OK=0

if [ "$RESTART_OK" -eq 0 ]; then
    echo
    echo "ERROR: could not restart falcon-sensor."
    echo "       The tag is written but will NOT sync until the service"
    echo "       restarts. Restart it manually, then re-run this script"
    echo "       to confirm. (Non-systemd host?  service falcon-sensor restart)"
    log "RESTART_FAILED"
    exit 1
fi

# --- verify the tag actually took ---------------------------
sleep 2
CURRENT="$("$FALCONCTL" -g --tags 2>/dev/null)"
echo
echo "Current tag: ${CURRENT:-(empty)}"

case "$CURRENT" in
    *"$TAG"*)
        log "OK"
        echo
        echo "OK - tag verified on this host."
        echo "It appears in the Falcon console at the next check-in"
        echo "(usually a few minutes). Verify under Host management."
        echo "Logged to: $LOGFILE"
        exit 0
        ;;
    *)
        echo
        echo "ERROR: tag was set without error but does NOT read back as '$TAG'."
        echo "       Do not mark this host as done. Check the sensor status:"
        echo "       systemctl status falcon-sensor"
        log "VERIFY_FAILED"
        exit 1
        ;;
esac
