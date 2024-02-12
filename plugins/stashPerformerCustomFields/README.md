# Stash Performer Custom Fields

Adds custom fields to performers that are stored in performer details as JSON.

**Note: Make sure you fully understand how this plugin will affect your performer details data before attempting to use it.**

## Overview

This plugin provides the following:

* A task for migrating existing performer detail data to JSON format
* A performer creation hook that adds custom fields to performer details data
* UI updates to performer pages for viewing and editing performer details and custom fields

## Consequences

Since this plugin combines existing performer details data and custom field data in JSON format for storage as performer details in the stash database, this has some consequences and limitations to consider:

* Custom fields cannot be filtered on directly

* Filtering on performer details will include custom fields data.

* Direct editing of performer details is discouraged
  * However, an alternative is provided by the updated UI.

* The raw performer details data is less human-readable due to it being JSON instead of just unformatted text.
  * This shouldn't matter if you just use the updated UI for editing details and custom fields data.

## Performer Details Migration Task

The first thing the task does is run the backup task. Then it goes through all performers and converts details data to JSON with custom fields. Existing details data is preserved within the JSON.

A performer without any existing details will end up with `{"custom": {"notes": null, "paths": null, "urls": null}}`

A performer with existing details of `"This is a performer bio"` will have their details changed to `{"custom": {"notes": null, "paths": null, "urls": null}, "details": "This is a performer bio"}`.

No existing details data is lost, because it is still embedded within the JSON.

*Examples assume the default fields setting `notes,paths,urls`*

## Performer Creation Hook

Whenever a new performer is created, the plugin hook with the default field setting `notes,paths,urls` will set the performer details to `{"custom": {"notes": null, "paths": null, "urls": null}}`.

## Performer Page UI Changes

The plugin displays custom fields just as the normal performer fields are displayed. Data in the `urls` and `paths` custom fields will display as links. Clicking a url link will open the link in a new tab and clicking a path will open File Explorer at that location.

A toggle button is added to the Details section that allows you to switch to the editing mode. The editing mode allows adding and remove custom field data entries.

The editing mode also provides a textbox for editing the normal Details section. This is a substitute for editing performer details the normal way.

Manually editing performer details data the normal way is no longer recommended unless you are familiar with JSON and understand the data format used by the plugin.

## Plugin Settings

### Fields

The fields setting defines the custom fields that will be used. The value should be a comma-separated list of custom field names. The default value is `notes,paths,urls`. Only the `paths` and `urls` custom field names have special UI behavior.

Field names should not contain spaces. You can use underscores instead and they will be replaced with spaces in the field name labels on the performers page.

### Show Edit

This setting is tied to the toggle button that is added to the performer page details that switches between view and edit mode.

## JSON Format

Custom field data along with performer details data is saved to the existing performer details field as JSON.

The performer details JSON is an object with a `custom` key and an optional `details` key. The `custom` value is an object and the `details` value is a string.

The field names in the field setting are used as keys in the `custom` object. The key values are either null or an array of strings.

*Examples assume the default fields setting `notes,paths,urls`*

Without performer details and no urls, paths, or notes:
```
{
  "custom": {
    "notes": null,
    "paths": null,
    "urls": null
  }
}
```

With performer details and no urls, paths, or notes:
```
{
  "custom": {
    "notes": null,
    "paths": null,
    "urls": null
  },
  "details": "Performer details go here"
}
```

With performer details, urls, paths, and notes:
```
{
  "custom": {
    "notes": ["Note 1","Note 2"],
    "paths": ["C:\Videos\Alice","C:\Videos\Alice 2"],
    "urls": ["https://github.com/stashapp/stash","https://github.com/7dJx1qP/stash-plugins"]
  },
  "details": "Performer details go here"
}
```