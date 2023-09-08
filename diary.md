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

Default page size for all queries is 20. I didn't investigate it the page size changes per endpoint in the old API.

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

## Access token renewal

Old API checked that the renewal wasn't being spammed. New API doesn't care - the renewal endpoint isn't so particularly special that we should protect it from spamming? Or is it more delicate since it uses a db connection? Anyways a more robust & thorough spam blocking would be better.

# Database changes

> :warning: Production release

`APIUSER` `PASSWORD` should be made nullable. Seems that the column isn't used. Or delete the whole col?

Delete `ACCESSTOKEN` `TTL` column, since not used. Old API had it for some loopback stuff but didn't really use it.

