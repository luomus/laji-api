# Breaking changes against the old api

The API is completely rewritten, so there might be differences that have gone unnoticed. This is a completely different architecture, and we can't maintain high code quality without making some changes.

For major breaking changes (renamed endpoints & query params) we aim to maintain backward compatibility until further notice. Eventually, the OpenAPI (=Swagger) document will follow the v3 specification instead of v2.

## Return codes

OK return codes might change (e.g. 204 no content -> 201 created)

## Errors

Errors signature will change from:

```
{
	"error": {
		"statusCode": 422,
		"name": "Error",
		"message": "UserID cannot be changed"
	}
}
```

to: 

```
{
	"statusCode": 422,
	"message": "userID cannot be updated by this method"
}
```

Backward compatibility is maintained at the moment though.

Error messages might change.

## Image / audio API

* metadata POST missing `personToken` doesn't include `status: "INVALID_TOKEN"`. Instead, it's just 400 with a message
  about the missing token ("personToken is required").
* GET `/` removed (listing of images)
* Added access control for fetching media and it' metadata. `personToken` query parameter added for relevant endpoints.

## JSON-LD

### Paged result contexts

In old api most paged results have `@context` in the root. Pre-paged results being an exception. New API doesn't make exceptions in this - all paged results have `@context` in the root and the items don't have `@context` property.

## Person friend return value

/person/{personToken}/friends/{personId} returns profile, not `true`

## Page sizes

Default page size for all queries is 20. I didn't investigate if the page size changes per endpoint in the old API.

* `/forms` old API returned all forms with the page size equal to the forms length. New API was made to have page size 1000 by default, so the frontend works the same.

## Swagger JSON documentation

Old api had /explorer/swagger.json. New API doesn't currently have a similar functionality - probably not used?

## Form permission endpoint

Moved from "/formPermission" to "/form/permissions". Backward compatibility is kept.

## Checklist versions endpoint

Moved from "/checklistVersions" to "/checklist-versions". Backward compatibility is kept.

## Collection long name

Might be somewhat different now, the old logic was illogical and clunky to reproduce. It's simpler now.

## Named places

* Getting existing place without edit rights returns 403 instead of 404
* GET `/named-places` using `selectedFields` param doesn't automatically add 'id' to the param
* POST `/named-places` public place without edit rights to collection gives 403, not 422
* POST `/named-places` doesn't care about lang param
* Creating a named place with a prepopulatedDocument with null id doesn't automatically remove id: an error is raised instead
* Creating a named place with a prepopulatedDocument with empty gatherings doesn't try to create an empty gathering: an error is raised instead

 ## Documents

* Checking if form has `documentsViewableForAll` option is checked from the collectionID, not from the formID.
* GET `/documents` `observationYear` doesn't accept `null` anymore for getting documents without any date
* GET `/documents` `observationYear` queries only with `gatheringEvent.date{Begin,end}`, not with `$.gatherings[*].dateBegin` or `$.gatherings[*].units[*].unitGathering.dateBegin`
* Document `dateCreated` & `dateEdited` uses zulu date (eg if clock in Finland is 17.25:09 on 21.3.2024, it's `2024-03-21T15:25:09.850Z` instead of `2024-03-21T17:25:09+02:00`)
* Document `/count/byYear` includes `formID` in the query.
* Document `/count/stats` doesn't check for `personToken` and it queries for all named places instead of the first 10.

 ## Documents validation

 * POST `/documents/validate/` `formID` and `type` params dropped. `formID` is derived from the body, `type` is never used
 * POST `/documents/validate/` valid response has no body. In the old API it was `{}`
 * POST `/documents/validate/` removed `validators` `overlapWithNamedPlace`, `waterbirdPairCount` and `wbcNamedPlaceExist`, as they are not used by any form
 * PUT `/documents/` editing a locked document throws 403, not 422
 * Added `jsonPointer` validationErrorFormat
 * Added `dotNotation` validationErrorFormat
 * POST `/documents/validate` document with MZ.publicityRestrictionsPrivate skips form validations
 * Document validation error message doesn't include `"Name": "Error"`

 ## Documents batch job

 * All documents must have the same formID. laji.fi front side uses only one formID so this is a problem only for 3rd party clients

## Information

* Information doesn't try to populate empty strings to "id", "content", "title", "author" and "posted"
* 404 is thrown for not found information. It used to return an object with some nulls & empty strings

## Areas

* Areas have `countryCodeISOnumeric` property. It's in the result from triplestore, I don't see why we would filter it out.
* `/areas` `type` param is deprecated. It's renamed to `areaType`, and the values are actual Qnames from https://schema.laji.fi/alt/ML.areaTypeEnum. Backward compatibility is kept

## Organizations

* Renamed the endpoint `/organization/by-id/:id` to `/organizations/:id`

 ## TODO

 * What is up with `editor` & `editors`? When a document is created, the creator is assigned for `editor`, but when querying documents, `editors` is used as search term instead of `editor`... This logic is inherited from the old API.

## Store query interpreting

Old API filtered out non QNames from queries. For example, when querying named place with `?municipality=all`, the municipality filter was actually dropped from the query because "all" isn't a QName. New API bypasses all values and doesn't check if the queries make sense (other than checking for injections). This is left to the client's responsibility.

## Annotations

* `/annotation/convert` deprecated. At least laji.fi doesn't use it, I'm not aware what other system would use it.
* When trying to create an annotation with duplicate tags or schematically incorrect tags, an error is thrown. Old API just filtered the duplicates & incorrect tags.
* POST `/annotation` (annotation creation) doesn't accept "full document URI", like http://tun.fi/JX.1243 as the rootID. Only simple Qnames are accepted.
* When removing an annotation, the persons to notify about it is dug from the warehouse's response's `editorUserIds`.  Old API uses `editors` field but that's not documented in https://laji.fi/about/1400 so I hope this one is correct?  (ask Esko later)

## Informal taxon groups

* `/informal-taxon-groups/tree` isn't paged anymore.

## Taxa

* TODO document query param renaming & filter body

## Autocomplete

### `/autocomplete/person`

* renamed as `/autocomplete/persons`
* results are wrapped in `results`
* query param `q` renamed as `query`
* query param `includePayload` is removed, fields can be filtered with `selectedFields` instead

### `/autocomplete/friends`

* results are wrapped in `results`
* query param `q` renamed as `query`
* query param `includePayload` is removed, fields can be filtered with `selectedFields` instead
* query param `includeSelf` is removed, self is always included

### `/autocomplete/taxon`

* renamed as `/autocomplete/taxa`
* results are wrapped in `results`
* query param `q` renamed as `query`
* in the result, the `taxonRankId` renamed as `taxonRank`
* in the result, the `informalTaxonGroups` renamed as `informalGroups`. It used to be an empty array also if it was empty, but it's just undefined now.
* in the result, the `matchType` renamed as `type`
* query param `includePayload` is removed, fields can be filtered with `selectedFields` instead

### `/autocomplete/unit`

* Broken down to the following endpoints:
	* `/autocomplete/unit/list`
	* `/autocomplete/unit/shorthand/trip-report`
	* `/autocomplete/unit/shorthand/line-transect`
	* `/autocomplete/unit/shorthand/water-bird-pair-count`

## Person

* `GET /person/{personToken}` -> `GET /person`
* `GET /person/by-id/{personId}` -> `GET /person/{id}`
* `GET /person/by-id/{personId}/profile` -> `GET /person/{id}/profile`
* `POST /person/{personToken}/friends/{friendPersonID}` -> `POST /person/friends/{id}`
* `PUT /person/{personToken}/friends/{friendPersonID}` -> `PUT /person/friends/{id}`
* `DELETE /person/{personToken}/friends/{friendPersonID}` -> `DELETE /person/friends/{id}`
* `GET /person/{personToken}/profile` -> `GET /person/profile`
* `POST /person/{personToken}/profile` -> `POST /person/profile`
* `PUT /person/{personToken}/profile` -> `PUT /person/profile`

## Person token

* `GET /person-token/{personToken}` -> `GET /authentication-event` (with person-token as header)
* `DELETE /person-token/{personToken}` -> `DELETE /authentication-event` (with person-token as header)

## Coordinates

* `/coordinates/location` doesn't have { "status": "OK" } in the response JSON. Use the actual HTTP status instead.

## Metadata

* `/metadata/classes` results are wrapped in `results`
* `/metadata/properties` results are wrapped in `results`
* `/metadata/ranges` -> `/metadata/alts` (same as `/metadata/ranges?asLookupObject=true`, while support for `?asLookupObject=false` is dropped)
* `/metadata/properties/{property}/ranges` -> `/metadata/properties/{property}/alts` (and wrapped in `results`)
* Class path params `property` and `class` must be the prefixed name. Old API accepted non-prefixed names (`MY.unit` vs `unit`)
* Properties `range` is a string instead of an array of strings
