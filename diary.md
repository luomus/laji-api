# Breaking changes

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


## JSON LD @context path

Will be changed like so:

```
-  "@context": "http://tun.fi/MA.person"
+  "@context": "http://schema.laji.fi/context/person-en.jsonld"
```


* /person/{personToken}/friends/{personId} returns profile, not `true`
