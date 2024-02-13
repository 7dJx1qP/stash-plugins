import json
import log
import sys
from audit_performer_urls import audit_performer_urls
try:
    from stashlib.stash_database import StashDatabase
    from stashlib.stash_interface import StashInterface
except ModuleNotFoundError:
    print("If you have pip (normally installed with python), run this command in a terminal (cmd): pip install pystashlib)", file=sys.stderr)
    sys.exit()

json_input = json.loads(sys.stdin.read())
name = json_input['args']['name']

def get_database_config():
    client = StashInterface(json_input["server_connection"])
    result = client.callGraphQL("""query Configuration { configuration { general { databasePath, blobsPath, blobsStorage } } }""")
    database_path = result["configuration"]["general"]["databasePath"]
    blobs_path = result["configuration"]["general"]["blobsPath"]
    blobs_storage = result["configuration"]["general"]["blobsStorage"]
    log.debug(f"databasePath: {database_path}")
    return database_path, blobs_path, blobs_storage

if name == 'audit_performer_urls':
    try:
        db = StashDatabase(*get_database_config())
    except Exception as e:
        log.error(str(e))
        sys.exit(0)
    audit_performer_urls(db)
    db.close()