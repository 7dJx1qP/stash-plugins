import json
import log
import sys
import subprocess

json_input = json.loads(sys.stdin.read())
name = json_input['args']['name']

if name == 'mediaplayer':
    mediaplayer_path = json_input['args']['mediaPlayerPath']
    path = json_input['args']['path']
    log.debug(f"mediaplayer_path: {mediaplayer_path}")
    log.debug(f"{name}: {path}")
    subprocess.Popen([mediaplayer_path, path])