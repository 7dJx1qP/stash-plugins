import json
import math
import yaml
from tqdm import tqdm
from stashlib.logger import logger as log
from stashlib.stash_database import StashDatabase
from stashlib.stash_models import PerformersRow

def update_performer_details(db: StashDatabase, performer_id: int, details, commit=True):
    encoded_details = json.dumps(details, ensure_ascii=False)
    db.performers.update_details_by_id(performer_id, encoded_details, commit)

def fields_to_dict(fields: list[str]):
    result = {}
    for field in fields:
        result[field] = None
    return result

def init_performer_details(db: StashDatabase, fields: list[str], performer: PerformersRow, commit=True):
    log.LogDebug(f"Initializing performer... {performer.id} {performer.name}")
    if not performer.details:
        log.LogTrace(f"No details. Updating performer...")
        details = {
            'custom': fields_to_dict(fields)
        }
        encoded_details = json.dumps(details, ensure_ascii=False)
        db.performers.update_details_by_id(performer.id, encoded_details, commit)
    else:
        log.LogTrace(f"Checking for performer details JSON...")
        details = {
            'custom': fields_to_dict(fields)
        }
        needs_update = False
        try:
            docs = json.loads(performer.details)
            if type(docs) is dict:
                details = docs
                log.LogTrace(f"JSON is dict, details: {'details' in details}, custom: {'custom' in details}")
                if 'details' in details and type(details['details']) is not str:
                    log.LogWarning(f"Malformed details key value. Expected str, got {type(details['details']).__name__}. Skipping... {performer.id} {performer.name}")
                    return
                if 'custom' not in details:
                    details['custom'] = fields_to_dict(fields)
                    needs_update = True
                    log.LogTrace(f"Added missing custom dict")
                elif type(details['custom']) is not dict:
                    log.LogWarning(f"Malformed custom key value. Expected dict, got {type(details['custom']).__name__}. Skipping... {performer.id} {performer.name}")
                    return
                else:
                    log.LogTrace(f"Has custom dict")
                    for field in fields:
                        if field not in details['custom']:
                            details['custom'][field] = None
                            needs_update = True
                            log.LogTrace(f"Added missing {field} field to custom dict")
            else:
                log.LogWarning(f"JSON detected but expected dict, got {type(docs).__name__}... {performer.id} {performer.name}")
                details['details'] = performer.details
                needs_update = True
        except:
            log.LogTrace(f"Invalid JSON")
            details['details'] = performer.details
            needs_update = True

        if needs_update:
            log.LogTrace(f"Updating performer details... {performer.id} {performer.name}")
            encoded_details = json.dumps(details, ensure_ascii=False)
            db.performers.update_details_by_id(performer.id, encoded_details, commit)
        else:
            log.LogTrace(f"No update needed... {performer.id} {performer.name}")

def init_performer_details_by_id(db: StashDatabase, fields: list[str], performer_id, commit=True):
    performer = db.performers.selectone_id(performer_id)
    if performer:
        init_performer_details(db, fields, performer, commit)

def init_all_performer_details(db: StashDatabase, fields: list[str]):
    performers = [PerformersRow().from_sqliterow(row) for row in db.performers.select()]
    log.LogInfo(f"Migrating {len(performers)} performer details...")
    for performer in performers:
        init_performer_details(db, fields, performer, commit=False)
    db.commit()