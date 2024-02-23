# Stash Stats

Adds stats to stats page

## Default Configuration

The plugin comes with a default configuration file that currently adds the following stats:
* Scene StashIDs %
* Studio StashIDs %
* Performer StashIDs %
* Favorite Performers
* Markers
* Tag Images %
* Movie Images %
* Performer Images %
* Studio Images %
* HD Scenes %

The default configuration file location is `<plugins folder>/stashStats/config.default.json`

## Custom Configuration

You can provide your own stats configuration file that the plugin will use instead of the default file.

The path to your custom stats configuration file should be `<plugins folder>/stashStats/config.json`

**Do not directly modify the default file, config.default.json. Any changes made to this file will be lost whenever the plugin is updated or uninstalled.**

## Configuration Schema

The data is JSON and consists of a nested array of objects that represent each stat.

The top-level array can contain multiple arrays, with each array representing a stat row.

Each stat row array can contain multiple stat objects.

### Stat Object Structure

Each stat object must have the following properties:

* variables: An object containing the variables for the stat. Each property name is used as a variable name and the property values are objects that should follow the [variable object structure](#variable-object-structure).
* header: A display name for the stat.
* template: A template string that defines the stat calculation and formatting.

The following example is the Scene StashIDs stat object taken from the default configuration file.
```
{
            "variables": {
                "stashIdCount": {
                    "variables": {
                        "scene_filter": {
                            "stash_id_endpoint": {
                                "endpoint": "",
                                "stash_id": "",
                                "modifier": "NOT_NULL"
                            }
                        }
                    },
                    "query": "query FindScenes($filter: FindFilterType, $scene_filter: SceneFilterType, $scene_ids: [Int!]) {\n  findScenes(filter: $filter, scene_filter: $scene_filter, scene_ids: $scene_ids) {\n    count\n  }\n}",
                    "path": "data.findScenes.count"
                },
                "totalCount": {
                    "variables": {
                        "scene_filter": {}
                    },
                    "query": "query FindScenes($filter: FindFilterType, $scene_filter: SceneFilterType, $scene_ids: [Int!]) {\n  findScenes(filter: $filter, scene_filter: $scene_filter, scene_ids: $scene_ids) {\n    count\n  }\n}",
                    "path": "data.findScenes.count"
                }
            },
            "header": "Scene StashIDs",
            "template": "${(variables.stashIdCount / variables.totalCount * 100).toFixed(2)}%"
        }
```
Two variables are used in this stat, stashIdCount and totalCount.

When the plugin executes a variable's gql query, the gql query response object would look like:
```
{
  "data": {
    "findScenes": {
      "count": 114081
    }
  }
}
```
Different gql queries have differently structured responses, so the path value `data.findScenes.count` defines how to get the count value 114081 from this query response.

The template `${(variables.stashIdCount / variables.totalCount * 100).toFixed(2)}%` divides the two variable values and formats the result as a percentage.

### Variable Object Structure

These objects are the property values within the stat variables object. They define the GQL query whose result will be used as the variable value to be used as the stat or in the stat calculation.

Variable objects must have the following properties:
* variables: GQL query variables
* query: GQL query
* path: Used to get a value from the GQL response.