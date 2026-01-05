# API V1 Migration Guide - Breaking Changes

https://api.laji.fi/

The new API uses [OpenAPI Specification v3](https://swagger.io/specification/v3/) (aka Swagger). It documents all query parameters, request bodies and response schemas accurately.
(Old API used Swagger v2 specifications and had misleading models/example values for certain endpoints, such as /taxa.) 

The OpenAPI specification (JSON) is available at https://api.laji.fi/openapi-json.

# Migration

The old API will remain available for one year to provide a migration window. 

Most requests you are doing right now already use the new API. However, some endpoints include breaking changes and are still served by the old API. To migrate those endpoints to the new API, add the `API-Version: 1` header to your requests.

Once the old API is removed, the `API-Version: 1` header will no longer be required, and all requests will use the new API by default.

## Base path

Previously, all endpoints were served under `https://api.laji.fi/v0`. The base path is now `https://api.laji.fi`.

```bash
curl https://api.laji.fi/v0/taxa
```

is now:

```bash
curl https://api.laji.fi/taxa
```

## Access token

There is no need to request new access tokens: existing tokens work with both API v0 and v1. However, the way access tokens are provided in requests has changed.

Access tokens are no longer accepted as the `access_token` query parameter. Instead, they must be sent using Bearer authentication in the `Authorization` header, in the following form: `Authorization: Bearer <ACCESS TOKEN>`.

What used to be:

```bash
curl 'https://api.laji.fi/v0/taxa?access_token=<ACCESS TOKEN>'
```

is now:

```bash
curl https://api.laji.fi/taxa -H 'Authorization: Bearer <ACCESS TOKEN>'
```


## Person token

Person tokens are no longer accepted as the `personToken` query parameter. Instead, they must be provided in the `Person-Token` request header.

What used to be:

```bash
curl 'https://api.laji.fi/v0/documents?personToken=<PERSON TOKEN>'
```

is now:

```bash
curl https://api.laji.fi/documents -H 'Person-Token: <PERSON TOKEN>'
```

## Localization

Previously, requests were localized using the `lang` query parameter. This has been replaced by the standard `Accept-Language` header (with values `en`, `fi`, or `sv`). Browsers typically set this header automatically based on the user’s language preferences. For example `en-GB;en;q=0.5` will be parsed as `en`.

What used to be:

```bash
curl 'https://api.laji.fi/v0/taxa?lang=fi'
```

is now:

```bash
curl https://api.laji.fi/taxa -H 'Accept-Language: fi'
```

## Errors

* Previously, errors were wrapped inside an `errors` object in the response body. Errors are now returned directly at the top level of the response body.
* Previously status code was in the JSON response. It's not included anymore; use the actual HTTP response's status code instead.

What used to be:

```
{
	"error": {
		"statusCode": 422,
		"name": "Error",
		"message": "Your login is not valid. Please log out and log in again."
	}
}
```
is now: 

```
{
	"message":"Your login is not valid. Please log out and log in again.",
	"errorCode":"PERSON_TOKEN_IS_INVALID",
	"localized":true
}
```

### Hint

* Errors include an `errorCode` that allows clients to identify the type of error.
* Some errors messages are localized. Localized errors have property `localized: true`. These messages are intended for end users and can be displayed directly.

## Endpoints

### Documents (validation)

`POST /documents/validate` doesn't accept `validationErrorFormat` parameter anymore. It used to default to a `"object"` format. The format is now always JSON pointer.

What used to be (note that the `error` wrapper is also removed, as explained earlier):

```
{
	"error": {
		"statusCode": 422,
		"details": { "a": { "b": ["validation error"] } }
	}
}
```

is now (with http status 422):

```
{
	"errorCode": "VALIDATION_EXCEPTION",
	"details": {
		"/a/b": ["validation error"]
	}
}
```

If the `errorCode` is `"VALIDATION_EXCEPTION"`, the response is guaranteed to include a details object.

Also, `POST /documents` and `PUT /documents` can return validation exceptions. They recognizable by the errorCode `"VALIDATION_EXCEPTION"`


### Areas

 `/areas` `type` param is deprecated. It's renamed to `areaType`, and the values are Qnames from https://schema.laji.fi/alt/ML.areaTypeEnum.

### Taxa

The new API's /taxa endpoints introduce many breaking changes. Key design changes in the API include:

* All query parameters used for filtering are now moved to the request body.
* Data can now be filtered using any property from the response model. (The old filter query parameters only allowed filtering by a limited set of fields.)
* Old filter parameter names are no longer supported. Use the corresponding property names from the model. For example, `informalGroupFilters` -> `informalTaxonGroups`
* Aggregate queries have been moved to their own endpoints: for example  `/taxa/{id}/species/aggregate`.
* Name fields (e.g., `vernacularName`) are now also available as multi-language objects (`vernacularNameMultiLang`), allowing translations to be displayed even though the old `lang` parameter is no longer available and cannot be set to `multi`.

Note that the above design changes __DO NOT__ apply to `/taxa/search` and `/autocomplete/taxa`. For taxon name search, filtering is still done using query parameters, but they have changed. See details in `/autocomplete/taxa` section of this document.

Here's the list of all parameters moved from request query parameters to the body:


* `species`
* `redListEvaluationGroups`
* `invasiveSpeciesMainGroups`
* `latestRedListEvaluation.threatenedAtArea`
* `latestRedListEvaluation.redListStatus`
* `latestRedListEvaluation.primaryThreat`
* `latestRedListEvaluation.threats`
* `latestRedListEvaluation.primaryEndangermentReason`
* `hasLatestRedListEvaluation`
* `latestRedListEvaluation.endangermentReasons`
* `taxonSets`
* `finnish` (used to be `onlyFinnish`)
* `invasiveSpecies` (used to be `invasiveSpeciesFilter`)
* `informalTaxonGroups` (used to be `informalGroupFilters`)
* `typeOfOccurrenceInFinland` (used to be `typesOfOccurrenceFilters` and `typesOfOccurrenceNotFilters`)
* `administrativeStatuses` (used to be `adminStatusFilters`
* `latestRedListStatusFinland.status` (used to be `redListStatusFilters`)
* `taxonRank` (used to be `taxonRanks`)
* `hasMultimedia` (used to be `hasMediaFilter`)
* `hasDescriptions` (used to be `hasDescriptionFilter`)
* `hasBold` (used to be `hasBoldData`)
* `primaryHabitat.habitat` (used to be `primaryHabitat`)
* `anyHabitatSearchStrings` (used to be `anyHabitat`)
* `latestRedListEvaluation.primaryHabitatSearchStrings` (used to be `latestRedListEvaluation.primaryHabitat`)
* `latestRedListEvaluation.anyHabitatSearchStrings` (used to be `latestRedListEvaluation.anyHabitat`)

The API swagger documents the filters:

> The request body is a JSON object where each property represents a filter.
> Properties are dot-separated (e.g., 'field.subfield') and correspond to the fields of taxon results. For array fields, the filter is done against each array item, so the dot-separated pointer shouldn't include array item path (if 'subfield' is an array that has property 'subsubfield', the pointer would be 'field.subfield.subsubfield').
> For array fields, the dot notation allows filtering by nested properties.
> 
> Each filter value can be one of the following types:
> - **boolean**: To filter by true/false values.
> - **string**: Filters by exact string matches. Adding an exclamation mark (!) at the beginning makes the filter act as a "must not" operator.
> - **array of strings**: Filters by multiple string values using an "OR" operator. The exclamation mark (!) syntax is also supported.
> 
> 
> Examples:
>
> ```
> {
>   "species": true,                               // Matches taxa that have "species": true
>   "informalTaxonGroups": "MVL.1",                // Matches taxa with informalTaxonGoup MVL.1
>   "informalTaxonGroups": ["MVL.1","!MVL.2"],     // Matches taxa with informalTaxonGoup MVL.1 but not MVL.2
>   "multimedia.author": "somebody",               // Matches taxa with any multimedia item having author "somebody"
>   "taxonRank": ["MX.genus", "MX.subGenus"],      // Matches taxa that are of rank genus or sub-genus
>   "secureLevel": "!MX.secureLevelNoShow"         // Matches everything but taxa with MX.secureLevelNoShow
> }
> ```

### Autocomplete

#### `/autocomplete/person`

* renamed as `/autocomplete/persons`
* results are wrapped in `results`
* query param `q` renamed as `query`
* query param `includePayload` is removed, fields can be filtered with `selectedFields` instead

#### `/autocomplete/friends`

* results are wrapped in `results`
* query param `q` renamed as `query`
* query param `includePayload` is removed, fields can be filtered with `selectedFields` instead
* query param `includeSelf` is removed, self is always included

#### `/autocomplete/taxon`

* renamed as `/autocomplete/taxa`
* results are wrapped in `results`
* query param `q` renamed as `query`
* in the result, the `taxonRankId` renamed as `taxonRank`
* in the result, the `informalTaxonGroups` renamed as `informalGroups`. It used to be an empty array also if it was empty, but it's just undefined now.
* in the result, the `matchType` renamed as `type`
* query param `includePayload` is removed, fields can be filtered with `selectedFields` instead

The following filters have been renamed (these changes also apply to `/taxa/search`):

* `taxonSet` -> `taxonSets`
* `informalTaxonGroup` and `excludedInformalTaxonGroup` -> `informalTaxonGroups`  (supports exclusion by !)
* `includedNameTypes` and `excludedNameTypes` -> `nameTypes` (supports exclusion by !)
* `includedLanguages` -> `languages`
* `onlySpecies` -> `species`
* `onlyFinnish` -> `finnish`
* `onlyInvasive` -> `invasiveSpecies`
* `observationMode` -> removed
* `includeNonMatching` -> removed

#### `/autocomplete/unit`

* Broken down to the following endpoints:
	* `/autocomplete/unit/list`
	* `/autocomplete/unit/shorthand/trip-report`
	* `/autocomplete/unit/shorthand/line-transect`
	* `/autocomplete/unit/shorthand/water-bird-pair-count`

### Person

* `GET /person/{personToken}` -> `GET /person` (with Person-Token as a header)
* `GET /person/by-id/{personId}` -> `GET /person/{id}`
* `GET /person/by-id/{personId}/profile` -> `GET /person/{id}/profile`
* `POST /person/{personToken}/friends/{id}` -> `POST /person/friends/{id}`
* `PUT /person/{personToken}/friends/{id}` -> `PUT /person/friends/{id}`
* `DELETE /person/{personToken}/friends/{id}` -> `DELETE /person/friends/{id}`
* `GET /person/{personToken}/profile` -> `GET /person/profile`
* `POST /person/{personToken}/profile` -> `POST /person/profile`
* `PUT /person/{personToken}/profile` -> `PUT /person/profile`

### Person token -> Authentication event

* `GET /person-token/{personToken}` -> `GET /authentication-event` (with person-token as header)
* `DELETE /person-token/{personToken}` -> `DELETE /authentication-event` (with person-token as header)

### Metadata

* `/metadata/classes` results are wrapped in `results`
* `/metadata/properties` results are wrapped in `results`
* `/metadata/ranges` -> `/metadata/alts` (same as `/metadata/ranges?asLookupObject=true`, while support for `?asLookupObject=false` is dropped)
* `/metadata/properties/{property}/ranges` -> `/metadata/properties/{property}/alts` (and wrapped in `results`)
* Class path params `property` and `class` must be the prefixed name. Old API accepted non-prefixed names (`MY.unit` vs `unit`)
* Properties `range` is a string instead of an array of strings

### Annotations

* `/annotation/tags` results are wrapped in `results`

### API User

* `/api-users` -> `/api-user`

### Organizations

* `/organization/by-id/{id}` -> `/organizations/{id}`
