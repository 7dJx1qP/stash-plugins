import sys
import log

try:
    import requests
except ModuleNotFoundError:
    print("If you have pip (normally installed with python), run this command in a terminal (cmd): pip install requests)", file=sys.stderr)
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

def get_scene_count_from_stashbox(endpoint, boxapi_key, performer_stash_ids=[], studio_stash_ids=[], include_subsidiary_studios=False):
    query = """
query Scenes($input: SceneQueryInput!) {
  queryScenes(input: $input) {
    count
  }
}
"""
    variables = {
        "input": {
            "page": 1,
            "per_page": 40,
            "sort": "DATE",
            "direction": "DESC",
            "performers": {
                "value": performer_stash_ids,
                "modifier": "INCLUDES"
            },
            "studios": {
                "value": studio_stash_ids,
                "modifier": "INCLUDES"
            }
        }
    }
    if include_subsidiary_studios:
        del variables['input']['studios']
        variables['input']['parentStudio'] = studio_stash_ids[0]
    result = stashbox_call_graphql(endpoint, boxapi_key, query, variables)
    return result.get("queryScenes").get("count")

def stashbox_performer_scene_count(endpoint, boxapi_key, stash_id):
    scene_count = get_scene_count_from_stashbox(endpoint, boxapi_key, [stash_id], [])
    log.debug(f"scene_count: {scene_count}")
    return int(scene_count)

def stashbox_studio_scene_count(endpoint, boxapi_key, stash_id, include_subsidiary_studios):
    scene_count = get_scene_count_from_stashbox(endpoint, boxapi_key, [], [stash_id], include_subsidiary_studios)
    log.debug(f"scene_count: {scene_count}")
    return int(scene_count)