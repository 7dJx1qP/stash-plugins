import json
import log
import os
import pathlib
import sys
from favorite_performers_sync import set_stashbox_favorite_performers, set_stashbox_favorite_performer
try:
    from stashlib.stash_database import StashDatabase
    from stashlib.stash_interface import StashInterface
except ModuleNotFoundError:
    print("If you have pip (normally installed with python), run this command in a terminal (cmd): pip install pystashlib)", file=sys.stderr)
    sys.exit()

json_input = json.loads(sys.stdin.read())
name = json_input['args']['name']

client = StashInterface(json_input["server_connection"])

def get_database_config():
    result = client.callGraphQL("""query Configuration { configuration { general { databasePath, blobsPath, blobsStorage } } }""")
    database_path = result["configuration"]["general"]["databasePath"]
    blobs_path = result["configuration"]["general"]["blobsPath"]
    blobs_storage = result["configuration"]["general"]["blobsStorage"]
    log.debug(f"databasePath: {database_path}")
    return database_path, blobs_path, blobs_storage

plugin_settings = client.callGraphQL("""query Configuration { configuration { plugins } }""")['configuration']['plugins'].get('stashSetStashboxFavoritePerformers', {})
tag_errors = plugin_settings.get('tagErrors', False)
tag_name = plugin_settings.get('tagName')

if name == 'favorite_performers_sync':
    endpoint = json_input['args']['endpoint']
    api_key = json_input['args']['api_key']
    try:
        db = StashDatabase(*get_database_config())
    except Exception as e:
        log.error(str(e))
        sys.exit(0)
    set_stashbox_favorite_performers(db, endpoint, api_key, tag_errors, tag_name)
    db.close()
elif name == 'favorite_performer_sync':
    endpoint = json_input['args']['endpoint']
    api_key = json_input['args']['api_key']
    stash_id = json_input['args']['stash_id']
    favorite = json_input['args']['favorite']
    log.debug(f"Favorite performer sync: endpoint={endpoint}, stash_id={stash_id}, favorite={favorite}")
    set_stashbox_favorite_performer(endpoint, api_key, stash_id, favorite)