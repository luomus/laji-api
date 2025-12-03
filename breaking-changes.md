# Breaking changes against the old api

# Api V1

https://api.laji.fi/

The new API uses Swagger v3.

Swagger JSON is at https://api.laji.fi/openapi-json

# Migration

For most requests you are already using the new API. There are some endpoints that have breaking changes, and for those your client still uses the old API. To migrate your client to use the new API for those endpoints, you need to add `API-Version: 1` header to the requests.

## Base path

Previously all endpoints were under https://api.laji.fi/v0. Now the basepath is simply https://api.laji.fi/.

```bash
curl https://api.laji.fi/v0/taxa
```

is now:

```bash
curl https://api.laji.fi/taxa
```

## Access token

* Access token isn't accepted as a query parameter `access_token` anymore. Instead, it's passed as a Bearer token authentication. Simply put it to `Authorization` header as `Bearer <token>`.

What used to be:

```bash
curl https://api.laji.fi/v0/taxa?access_token=<ACCESS TOKEN>
```

is now:

```bash
curl https://api.laji.fi/taxa -H 'Authorization: Bearer <PERSON TOKEN>'
```

## Person token

* Person token isn't accepted as a query parameter `personToken` anymore. Instead, it's passed as a `Person-Token` header.

What used to be:

```bash
curl https://api.laji.fi/v0/documents?personToken=<PERSON TOKEN>
```

is now:

```bash
curl https://api.laji.fi/documents -H 'Person-Token: <PERSON TOKEN>'
```

## Localization

* Requests used to be localized with query param `lang`.  It is replaced with `Accept-Language` header (with value `en`, `fi` or `sv`). Browsers usually add the header automatically to requests according to the user's localization preferences.

What used to be:

```bash
curl https://api.laji.fi/v0/taxa?lang=fi
```

is now:

```bash
curl https://api.laji.fi/taxa -H 'Accept-Language: fi'
```

## Errors

* Errors used to be wrapped in the response body inside a `errors` object. The `errors` content is now just flattened to the response body

What used to be:


```
{
	"error": {
		"statusCode": 422,
		"name": "Error",
		"message": "UserID cannot be changed"
	}
}
```

is now: 

```
{
	"statusCode": 422,
	"message": "userID cannot be updated by this method"
}
```


### Hint

* Errors will include an `errorCode` that allows clients to detect what kind of error is happening.
* Some errors messages are localized. Localized error messages are property `localizedMessage`. The localized message content aims to be helpful for the end-user, so you might want to display them.

## Endpoints

### Areas

* Areas have `countryCodeISOnumeric` property. It's in the result from triplestore, I don't see why we would filter it out.
* `/areas` `type` param is deprecated. It's renamed to `areaType`, and the values are actual Qnames from https://schema.laji.fi/alt/ML.areaTypeEnum. Backward compatibility is kept

### Taxa

The new API's /taxa endpoints bring many breaking changes. Main design changes in the API:

* All query parameters that affect filtering are moved to the request body. The body is called "filters". Filtering can be now done by any property.
* Aggregate queries are separated to their own endpoints (`/aggregate`)
* Some of the filter parameters are also renamed to reflect the actual properties from the taxa elastic
* Name fields ("vernacularName" etc) are served also as multi-lang ("vernacularNameMultiLang"), so the translations can be shown even though `lang` param isn't `multi`

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

The API swagger documents the filters like so:

> The request body is a JSON object where each property represents a filter.
> Properties are dot-separated (e.g., 'field.subfield') and correspond to the fields of taxon results. For array fields, the filter is done against each array item, so the dot-separated pointer shouldn't include array item path (if 'subfield' is an array that has property 'subsubfield', the pointer would be 'field.subfield.subsubfield').
> For array fields, the dot notation allows filtering by nested properties.
> 
> Each filter value can be one of the following types:
> - **boolean**: To filter by true/false values.
> - **string**: To filter by exact string matches. Adding an excalamation mark (!) in the beginning makes the filter work as a "must not" operator, 
> - **array of strings**: To filter by multiple string values as an "OR" operator. Supports also exclamation mark syntax
> 
> 
> Example for syntax:
>
> ```
> {
>   "species": true,                               // Matches taxa that have "species": true
>   "informalTaxonGroups": "MVL.1",                // Matches taxa with informalTaxonGoup MVL.1
>   "multimedia.author": "somebody",               // Matches taxa with any multimedia item having author "somebody"
>   "taxonRank": ["MX.genus", "MX.subGenus"]       // Matches taxa that are of rank genus or sub-genus
>   "scientificName": "!MX.genus", "MX.subGenus"]  // Matches taxa that are of rank genus or sub-genus
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

###### `/autocomplete/taxon`

* renamed as `/autocomplete/taxa`
* results are wrapped in `results`
* query param `q` renamed as `query`
* in the result, the `taxonRankId` renamed as `taxonRank`
* in the result, the `informalTaxonGroups` renamed as `informalGroups`. It used to be an empty array also if it was empty, but it's just undefined now.
* in the result, the `matchType` renamed as `type`
* query param `includePayload` is removed, fields can be filtered with `selectedFields` instead

###### `/autocomplete/unit`

* Broken down to the following endpoints:
	* `/autocomplete/unit/list`
	* `/autocomplete/unit/shorthand/trip-report`
	* `/autocomplete/unit/shorthand/line-transect`
	* `/autocomplete/unit/shorthand/water-bird-pair-count`

#### Person

* `GET /person/{personToken}` -> `GET /person` (with Person-Token as a aheader)
* `GET /person/by-id/{personId}` -> `GET /person/{id}`
* `GET /person/by-id/{personId}/profile` -> `GET /person/{id}/profile`
* `POST /person/{personToken}/friends/{id}` -> `POST /person/friends/{id}`
* `PUT /person/{personToken}/friends/{id}` -> `PUT /person/friends/{id}`
* `DELETE /person/{personToken}/friends/{id}` -> `DELETE /person/friends/{id}`
* `GET /person/{personToken}/profile` -> `GET /person/profile`
* `POST /person/{personToken}/profile` -> `POST /person/profile`
* `PUT /person/{personToken}/profile` -> `PUT /person/profile`

#### Person token

* `GET /person-token/{personToken}` -> `GET /authentication-event` (with person-token as header)
* `DELETE /person-token/{personToken}` -> `DELETE /authentication-event` (with person-token as header)

#### Metadata

* `/metadata/classes` results are wrapped in `results`
* `/metadata/properties` results are wrapped in `results`
* `/metadata/ranges` -> `/metadata/alts` (same as `/metadata/ranges?asLookupObject=true`, while support for `?asLookupObject=false` is dropped)
* `/metadata/properties/{property}/ranges` -> `/metadata/properties/{property}/alts` (and wrapped in `results`)
* Class path params `property` and `class` must be the prefixed name. Old API accepted non-prefixed names (`MY.unit` vs `unit`)
* Properties `range` is a string instead of an array of strings

#### Annotations

* `/annotation/tags` results are wrapped in `results`
