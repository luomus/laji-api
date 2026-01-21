# API V1 User Authentication Flow Migration Guide

Full [User Auth Flow](https://info.laji.fi/en/frontpage/api/api-laji-fi/user-auth/) documentation for web apps and native apps is available.

# Migration

The old API (v0) will remain available until 17.1.2027 to provide a migration window. To the new API, add the `API-Version: 1` header to your requests.

Once the old API is removed, the `API-Version: 1` header will no longer be required, and all requests will use the new API by default.

## Web application login flow migration

A logged in user with a personToken parameter is redirected to your Web app login page using GET or POST (as defined in the login URI) the same way as before.

The changes apply to steps for reading information about the logged in user and logging out.

What used to be:

```bash
curl 'https://api.laji.fi/v0/person-token/<PERSON_TOKEN>?access_token=<ACCESS_TOKEN>'
curl 'https://api.laji.fi/v0/person/<PERSON_TOKEN>?access_token=<ACCESS_TOKEN>'
curl -X DELETE 'https://api.laji.fi/v0/person-token/<PERSON_TOKEN>?access_token=<ACCESS_TOKEN>'
```

is now:

```bash
curl 'https://api.laji.fi/authentication-event' -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'Person-Token: <PERSON_TOKEN>' -H 'API-Version: 1'
curl 'https://api.laji.fi/person' -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'Person-Token: <PERSON_TOKEN>' -H 'API-Version: 1'
curl -X DELETE 'https://api.laji.fi/authentication-event' -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'Person-Token: <PERSON_TOKEN>' -H 'API-Version: 1'
```

## Native  app login flow migration

What used to be:

```bash
curl 'https://api.laji.fi/v0/login?offerPermanent=true|false&access_token=<ACCESS_TOKEN>'
curl -X POST 'https://api.laji.fi/v0/login/check?tmpToken=<TMP_TOKEN>&access_token=<ACCESS_TOKEN>'
curl 'https://api.laji.fi/v0/person-token/<PERSON_TOKEN>?access_token=<ACCESS_TOKEN>'
curl 'https://api.laji.fi/v0/person/<PERSON_TOKEN>?access_token=<ACCESS_TOKEN>'
curl -X DELETE 'https://api.laji.fi/v0/person-token/<PERSON_TOKEN>?access_token=<ACCESS_TOKEN>'
```

is now:

```bash
curl 'https://api.laji.fi/login?offerPermanent=true|false' -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'API-Version: 1'
curl -X POST 'https://api.laji.fi/login/check?tmpToken=<TMP_TOKEN>' -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'API-Version: 1'
curl 'https://api.laji.fi/authentication-event' -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'Person-Token: <PERSON_TOKEN>' -H 'API-Version: 1'
curl 'https://api.laji.fi/person' -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'Person-Token: <PERSON_TOKEN>' -H 'API-Version: 1'
curl -X DELETE 'https://api.laji.fi/authentication-event' -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'Person-Token: <PERSON_TOKEN>' -H 'API-Version: 1'
```
