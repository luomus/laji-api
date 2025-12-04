/* eslint-disable max-len */
export const swaggerDescription =
`
Access token is needed to use this API. To get a token, send a POST request with your email address to /api-users (under section "API User") endpoint and one will be sent to your email. Include the token to each request as a Bearer token (http header "Authorization: Bearer \\<ACCESS TOKEN\\>")

Access token, person token and language can be globally configured using the "Authorize" button.

You can find more documentation [here](https://info.laji.fi/en/frontpage/api/api-laji-fi/).

If you have any questions you can contact us at helpdesk@laji.fi.

## Endpoints

## Observations and collections
* Warehouse - Observation Data Warehouse API
* Collection - Collection metadata
* Source - Information sources (IT systems)
* Annotation - Quality control

## Taxonomy
* Checklist - Mainly you only work with one checklits: the FinBIF master checklist. There are others.
* Taxa - Taxonomy API
* InformalTaxonGroup - Informal taxon groups are used in taxa and warehouse endpoints
* Publication - Scientific publications

## Other master data
* Metadata - Variable descriptions
* Area - Countries, municipalities and biogeographical provinces of Finland, etc.
* Person - Information about people.

## Helpers
* APIUser - Register as an API user
* AuthenticationEvent - Information about the authentication event of a person token
* Autocomplete - For making an autocomplete filed for taxa, collections or persons (friends)
* Login - Login for standalone applications (contact helpdesk if you want to use this)
* Shorthand - Vihko form shorthand service

## Vihko observation system
* Audio - Audio of a document
* Form - Form definition
* Document - Document instance of a form
* Image - Image of a document

## Laji.fi portal
* Feedback - Feedback form API
* Information - CMS content of information pages
* Logger - Error logging from user's browsers to FinBIF
* News - News
`;
