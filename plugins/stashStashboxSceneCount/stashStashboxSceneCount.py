import json
import log
import sys
from stashbox_scene_counts import stashbox_performer_scene_count, stashbox_studio_scene_count
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

plugin_settings = client.callGraphQL("""query Configuration { configuration { plugins } }""")['configuration']['plugins'].get('stashStashboxSceneCount', {})
include_subsidiary_studios = plugin_settings.get('includeSubsidiaryStudios', False)

try:
    db = StashDatabase(*get_database_config())
except Exception as e:
    log.error(str(e))
    sys.exit(0)

endpoint = json_input['args']['endpoint']
api_key = json_input['args']['api_key']
stash_id = json_input['args']['stash_id']

if name == 'stashbox_performer_scene_count':
    log.debug(f"stashbox_performer_scene_count: endpoint={endpoint}, stash_id={stash_id}")
    scene_count = stashbox_performer_scene_count(endpoint, api_key, stash_id)
    database_scene_count = db.fetchone("""SELECT COUNT(DISTINCT b.stash_id)
FROM scenes a
JOIN scene_stash_ids b ON a.id = b.scene_id
JOIN performers_scenes c ON a.id = c.scene_id
JOIN performer_stash_ids d ON c.performer_id = d.performer_id
WHERE d.stash_id = ?""", (stash_id, ))[0]
    log.debug(f"{stash_id}: {database_scene_count}/{scene_count}")
elif name == 'stashbox_studio_scene_count':
    log.debug(f"stashbox_studio_scene_count: endpoint={endpoint}, stash_id={stash_id}")
    log.debug(f"include_subsidiary_studios: {include_subsidiary_studios}")
    scene_count = stashbox_studio_scene_count(endpoint, api_key, stash_id, include_subsidiary_studios)
    if not include_subsidiary_studios:
        database_scene_count = db.fetchone("""SELECT COUNT(DISTINCT b.stash_id)
    FROM scenes a
    JOIN scene_stash_ids b ON a.id = b.scene_id
    JOIN studio_stash_ids c ON c.studio_id = a.studio_id
    WHERE c.stash_id = ?""", (stash_id, ))[0]
    else:
        database_scene_count = db.fetchone("""WITH RECURSIVE rec_studios(studio_id, endpoint) AS
(SELECT ssi.studio_id, ssi.endpoint  
 FROM studio_stash_ids ssi WHERE ssi.stash_id = ?
 UNION
 SELECT s.id  , rec_studios.endpoint  FROM studios as s
 JOIN rec_studios ON s.parent_id = rec_studios.studio_id)
SELECT COUNT(DISTINCT ssi.stash_id)
FROM scenes s 
JOIN scene_stash_ids ssi ON s.id = ssi.scene_id AND (ssi.endpoint,s.studio_id  ) IN (SELECT endpoint,studio_id  FROM rec_studios)""", (stash_id, ))[0]
    log.debug(f"{stash_id}: {database_scene_count}/{scene_count}")

db.close()