# Breaking changes against the old api

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

Error messages might change.

## JSON-LD

###  @context path

Will be changed like so:

```
+  "@context": "http://tun.fi/MA.person"
-  "@context": "http://schema.laji.fi/context/person-en.jsonld"
```

### Paged result contexts

In old api most paged results have `@context` in the root. Pre-paged results being an exception. New API doesn't make exceptions in this - all paged results have `@context` in the root and the items don't have `@context` proeprty.

## Person friend return value

/person/{personToken}/friends/{personId} returns profile, not `true`

## Page sizes

Default page size for all queries is 20. I didn't investigate if the page size changes per endpoint in the old API.

* `/forms` old API returned all forms with the page size equal to the forms length. New API was made to have page size 1000 by default, so the frontend works the same.

## Collection props lang hack

Old api treats these multilang props as non-multilang, returning them always as a string, using the "en" lang value. If the hack isn't recreated here, querying in other languages than "en" will not include these props.

Backward compatibility could be reached also by setting them as non multilang in schema (confirmed by Mikko that we could do so).

* temporalCoverage
* taxonomicCoverage
* collectionLocation
* dataLocation
* methods
* coverageBasis
* geographicCoverage

## Form permissions

Old API had a hard coded linking of parent/child collections, so that when requesting a form permission for a child it would return the form permissions of the parent collection.

In the new implementation, collections' child/parent info is pulled from the collections themselves. Requesting a form permission for a collection returns the form permissions for the first collectionID in the collection tree that has the form permissions feature enabled (= has `options.restrictAccess` or `options.hasAdmins`).

> :warning: Production release

* Remove `restrictAccess` & `hasAdmins` from `MHL.27` & `MHL.28`, so they will inherit form permissions from the line transect parent collection.

## Swagger JSON documentation

Old api had /explorer/swagger.json. New API doesn't currently have a similar functionality - probably not used?

# Minor changes

## Collection long name

Might be somewhat different now, the old logic was illogical and clunky to reproduce. It's simpler now.

## Form permission endpoint

Moved from "/formPermission" to "/form/permissions". Backward compatibility is kept.

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
* Document `dateCreated` & `dateEdited` uses zulu date (eg if clock in Finland is 17.25:09 on 21.3.2024, it's `2024-03-21T15:25:09.850Z` instead of `2024-03-21T17:25:09+02:00`)
* Document `/count/byYear` includes `formID` in the query.

 ## Documents validation

 * POST `/documents/validate/` `formID` and `type` params dropped. `formID` is derived from the body, `type` is never used.
 * POST `/documents/validate/` valid response has no body. In the old API it was `{}`.
 * POST `/documents/validate/` removed `validators` `overlapWithNamedPlace`, `waterbirdPairCount` and `wbcNamedPlaceExist`, as they are not used by any form.
 * PUT `/documents/` editing a locked document throws 403, not 422.

 ## Documents batch job

 * All documents must have the same formID. laji.fi front side uses only one formID so this is a problem only for 3rd
   party clients

## Access token renewal

Old API checked that the renewal wasn't being spammed. New API doesn't care - the renewal endpoint isn't so particularly special that we should protect it from spamming? Or is it more delicate since it uses a db connection? Anyways a more robust & thorough spam blocking would be better.

## Store query interpreting

Old API filtered out non QNames from queries. For example, when querying named place with `?municipality=all`, the municipality filter was actually dropped from the query because "all" isn't a QName. New API bypasses all values and doesn't check if the queries make sense (other than checking for injections). This is left to the client's responsibility.

# Database changes

> :warning: Production release

`APIUSER` `PASSWORD` should be made nullable. Seems that the column isn't used. Or delete the whole col?

Delete `ACCESSTOKEN` `TTL` column, since not used. Old API had it for some loopback stuff but didn't really use it.

# Blocked work

* Trait DB swagger paged results https://www.pivotaltracker.com/story/show/187328917
