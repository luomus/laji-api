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

## Collection props lang hack

Old api treats these multilang props as non-multilang, returning them always as a string, using the "en" lang value. If the hack isn't recreated here, querying in other languages than "en" will not include these props.

Backward compatibility could be reached also by setting them as non multilang in schema (confirmed by Mikko that we could do so).

*	temporalCoverage
* taxonomicCoverage
* collectionLocation
* dataLocation
* methods
* coverageBasis
* geographicCoverage

# Minor changes

## Collection long name

Might be somewhat different now, the old logic was illogical and clunky to reproduce. It's simpler now.
