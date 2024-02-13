import math
import sys
import log

try:
    import requests
except ModuleNotFoundError:
    print("If you have pip (normally installed with python), run this command in a terminal (cmd): pip install requests)", file=sys.stderr)
    sys.exit()

try:
    from stashlib.common import get_timestamp
    from stashlib.stash_database import StashDatabase
    from stashlib.stash_models import PerformersRow
except ModuleNotFoundError:
    print("If you have pip (normally installed with python), run this command in a terminal (cmd): pip install pystashlib)", file=sys.stderr)
    sys.exit()

def stashbox_call_graphql(endpoint, boxapi_key, query, variables=None):
    # this is basically the same code as call_graphql except it calls out to the stashbox.

    headers = {
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Connection": "keep-alive",
        "DNT": "1",
        "ApiKey": boxapi_key
    }
    json = {
        'query': query
    }
    if variables is not None:
        json['variables'] = variables
    try:
        response = requests.post(endpoint, json=json, headers=headers)
        if response.status_code == 200:
            result = response.json()
            if result.get("error"):
                for error in result["error"]["errors"]:
                    raise Exception("GraphQL error: {}".format(error))
            if result.get("data"):
                return result.get("data")
        elif response.status_code == 401:
            log.error(
                "[ERROR][GraphQL] HTTP Error 401, Unauthorised. You need to add a Stash box instance and API Key in your Stash config")
            return None
        else:
            raise ConnectionError(
                "GraphQL query failed:{} - {}".format(response.status_code, response.content))
    except Exception as err:
        log.error(err)
        return None

def get_stashbox_performer_favorite(endpoint, boxapi_key, stash_id):
    query = """
query FullPerformer($id: ID!) {
  findPerformer(id: $id) {
    id
    is_favorite
  }
}
    """

    variables = {
        "id": stash_id
    }

    return stashbox_call_graphql(endpoint, boxapi_key, query, variables)

def update_stashbox_performer_favorite(endpoint: str, boxapi_key: str, stash_id: str, favorite: bool):
    query = """
mutation FavoritePerformer($id: ID!, $favorite: Boolean!) {
  favoritePerformer(id: $id, favorite: $favorite)
}
"""

    variables = {
        "id": stash_id,
        "favorite": favorite
    }

    return stashbox_call_graphql(endpoint, boxapi_key, query, variables)

def get_favorite_performers_from_stashbox(endpoint: str, boxapi_key: str):
    query = """
query Performers($input: PerformerQueryInput!) {
  queryPerformers(input: $input) {
    count
    performers {
      id
      is_favorite
    }
  }
}
"""

    per_page = 100

    variables = {
        "input": {
            "names": "",
            "is_favorite": True,
            "page": 1,
            "per_page": per_page,
            "sort": "NAME",
            "direction": "ASC"
        }
    }

    performers = set()

    total_count = None
    request_count = 0
    max_request_count = 1

    performercounts = {}

    while request_count < max_request_count:
        result = stashbox_call_graphql(endpoint, boxapi_key, query, variables)
        request_count += 1
        variables["input"]["page"] += 1
        if not result:
            break
        query_performers = result.get("queryPerformers")
        if not query_performers:
            break
        if total_count is None:
            total_count = query_performers.get("count")
            max_request_count = math.ceil(total_count / per_page)

        log.info(f'Received page {variables["input"]["page"] - 1} of {max_request_count}')
        log.progress((variables["input"]["page"] - 1) / max_request_count)
        for performer in query_performers.get("performers"):
            performer_id = performer['id']
            if performer_id not in performercounts:
                performercounts[performer_id] = 1
            else:
                performercounts[performer_id] += 1
        performers.update([performer["id"] for performer in query_performers.get("performers")])
    return performers, performercounts

def tag_performer(db: StashDatabase, stash_id: str, tag_id: int):
    rows = db.fetchall("""SELECT a.*
FROM performers a
JOIN performer_stash_ids b ON a.id = b.performer_id
WHERE b.stash_id = ?""", (stash_id, ))
    performers = [PerformersRow().from_sqliterow(row) for row in rows]
    for performer in performers:
        tag_ids = [performer_tag.tag_id for performer_tag in db.performers_tags.select_performer_id(performer.id)]
        if tag_id not in tag_ids:
            log.debug(f'Tagging performer {stash_id} {performer.id} {performer.name}')
            db.performers_tags.insert(performer.id, tag_id)
        else:
            log.debug(f'Performer already tagged {stash_id} {performer.id} {performer.name}')

def set_stashbox_favorite_performers(db: StashDatabase, endpoint: str, boxapi_key: str, tagErrors: bool, tagName: str):
    stash_ids = set([row["stash_id"] for row in db.fetchall("""SELECT DISTINCT b.stash_id
FROM performers a
JOIN performer_stash_ids b
ON a.id = b.performer_id
WHERE a.favorite = 1""")])
    log.info(f'Stashbox endpoint {endpoint}')
    log.info(f'Stash {len(stash_ids)} favorite performers')
    tag = None
    if tagErrors and tagName:
        log.info(f'Tagging errors with performer tag: {tagName}')
        tag = db.tags.selectone_name(tagName)
        if not tag:
            log.info(f'Tag missing. Creating...')
            db.tags.insert(tagName, get_timestamp(), get_timestamp(), True, 'Tag created by Set Stashbox Favorite Performers plugin. Applied to performers found to have stash ids deleted from stashbox.', None)
            tag = db.tags.selectone_name(tagName)
            if not tag:
                log.error(f"Failed to create tag.")
    else:
        log.info(f'Not tagging errors')
    log.info(f'Fetching Stashbox favorite performers...')
    stashbox_stash_ids, performercounts = get_favorite_performers_from_stashbox(endpoint, boxapi_key)
    log.info(f'Stashbox {len(stashbox_stash_ids)} favorite performers')

    favorites_to_add = stash_ids - stashbox_stash_ids
    favorites_to_remove = stashbox_stash_ids - stash_ids
    log.info(f'{len(favorites_to_add)} favorites to add')
    log.info(f'{len(favorites_to_remove)} favorites to remove')

    for stash_id in favorites_to_add:
        log.trace(f'Adding stashbox favorite {stash_id}')
        if not update_stashbox_performer_favorite(endpoint, boxapi_key, stash_id, True).get('favoritePerformer'):
            log.warning(f'Failed adding stashbox favorite {stash_id}')
            if tag:
                tag_performer(db, stash_id, tag.id)
    log.info('Add done.')

    for stash_id in favorites_to_remove:
        log.trace(f'Removing stashbox favorite {stash_id}')
        update_stashbox_performer_favorite(endpoint, boxapi_key, stash_id, False)
        if not update_stashbox_performer_favorite(endpoint, boxapi_key, stash_id, True).get('favoritePerformer'):
            log.warning(f'Failed removing stashbox favorite {stash_id}')
            if tag:
                tag_performer(db, stash_id, tag.id)
    log.info('Remove done.')

    for performer_id, count in performercounts.items():
        if count > 1:
            log.trace(f'Fixing duplicate stashbox favorite {performer_id} count={count}')
            update_stashbox_performer_favorite(endpoint, boxapi_key, performer_id, False)
            update_stashbox_performer_favorite(endpoint, boxapi_key, performer_id, True)
    log.info('Fixed duplicates.')

def set_stashbox_favorite_performer(endpoint, boxapi_key, stash_id, favorite):
    result = get_stashbox_performer_favorite(endpoint, boxapi_key, stash_id)
    if not result:
        return
    if favorite != result["findPerformer"]["is_favorite"]:
        update_stashbox_performer_favorite(endpoint, boxapi_key, stash_id, favorite)
        log.info(f'Updated Stashbox performer {stash_id} favorite={favorite}')
    else:
        log.info(f'Stashbox performer {stash_id} already in sync favorite={favorite}')