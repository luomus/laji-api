/* eslint-disable max-len */
import "dotenv";

const API_BASE = process.env.MAIL_API_BASE;

export const swaggerDescription =
`
## Authentication

This API requires an **Access Token**. To obtain a token:
1. [Send a \`POST\` request with your email address to the \`/api-user\` endpoint](https://${API_BASE}/openapi#/API%20user/ApiUsersController_register).
2. An access token will be sent to your email.

Include the token in all requests using the HTTP header: \`Authorization: Bearer <ACCESS_TOKEN>\`

Here on the API frontpage, you can configure the **Access Token**, **Person-Token**, and **Accept-Language** globally using the **Authorize** button below.

---

## Documentation & Resources

- **Additional API documentation:**
  [https://info.laji.fi/en/frontpage/api/api-laji-fi](https://info.laji.fi/en/frontpage/api/api-laji-fi)

- **OpenAPI / Swagger 3.0 specification (machine-readable):**
  [https://api.laji.fi/openapi-json](https://api.laji.fi/openapi-json)

---

## Support

If you have any questions, contact us at **helpdesk@laji.fi**.
`;
