import json
import subprocess
import sys
from performer_details import init_all_performer_details, init_performer_details_by_id
try:
    from stashlib.logger import logger as log
    from stashlib.stash_database import StashDatabase
    from stashlib.stash_interface import StashInterface
except ModuleNotFoundError:
    print("If you have pip (normally installed with python), run this command in a terminal (cmd): pip install pystashlib)", file=sys.stderr)
    sys.exit()

json_input = json.loads(sys.stdin.read())

name = json_input.get('args', {}).get('name')
hook_type = json_input.get("args", {}).get("hookContext", {}).get("type")
performer_id = json_input.get("args", {}).get("hookContext", {}).get("id")

client = StashInterface(json_input["server_connection"])
result = client.callGraphQL("""query Configuration { configuration { general { databasePath } } }""")
database_path = result["configuration"]["general"]["databasePath"]
log.LogDebug(f"databasePath: {database_path}")

def get_fields():
    plugin_settings = client.callGraphQL("""query Configuration { configuration { plugins } }""")['configuration']['plugins'].get('stashPerformerCustomFields', {})
    fields = plugin_settings.get('fields', 'notes,paths,urls').replace(' ', '').split(',')
    log.LogDebug(f'fields: {json.dumps(fields)}')
    return fields

try:
    with StashDatabase(database_path, None, None) as db:
        if name == 'explorer':
            path = json_input['args']['path']
            log.LogDebug(f"{name}: {path}")
            subprocess.Popen(f'explorer "{path}"')
        elif name == 'init_all_performer_details':
            fields = get_fields()
            client.callGraphQL("""mutation BackupDatabase($input: BackupDatabaseInput!) { backupDatabase(input: $input) }""", { 'input': {} })
            init_all_performer_details(db, fields)
            log.LogInfo("Performer details migration done.")
        elif hook_type == 'Performer.Create.Post':
            fields = get_fields()
            init_performer_details_by_id(db, fields, performer_id)
except Exception as e:
    log.LogError(str(e))
    sys.exit(0)