## Description

The new FinBIF API, that FinBIF will migrate to.

See [breaking changes against the old API](https://github.com/luomus/laji-api/blob/master/breaking-changes.md)

## Development

Check the [wiki](https://github.com/luomus/laji-api/wiki) for a more technically detailed documentation.

### Stack

[Nest](https://github.com/nestjs/nest)

### Installation & running

Fill in `.env` file, using `.env.example` as a template.

Note that access tokens are not read from a remote source, but a local file instead. Either generate tokens with the 'API User' endpoints or grab the `api-users.db` from staging machine.
 
The app can be ran inside a docker, or directly on the host machine.

#### Docker

Use `docker` to build & start the app:

```bash
npm run docker
```

*Hint*: The docker container runs any npm script, `start:dev` being the default. You can run other scripts like so:

```bash
npm run docker -- test:e2e
```

#### Without Docker

Install the dependencies:

```bash
npm ci
```

Install the following:

* [Redis](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/) >= 5
* [SQLite](https://sqlite.org/) (most likely it's available in your system's package manager)

##### Running

1. Start Redis
2. `npm run start:dev`

The app will be running at http://localhost:3004

### Test

*Hint*: The npm command works also with the aforementioned Docker container. These examples run `npm` directly for simplicity.

#### Unit tests

Unit tests cover so far only some core logic. They act also as documentation for how they are supposed to work.

With Docker:

```bash
npm run docker -- test
```

Without Docker:

```bash
npm test
```

#### Integration tests

Currently we rely on the e2e tests from the old api. Fill in `e2e/config.json` and then you can run the tests:

With Docker:

```bash
npm run docker -- test:e2e
```

Without Docker:

```bash
npm run test:e2e
```

## Contact

You can contact us by sending feedback from [laji.fi](https://laji.fi).

## License

[MIT](LICENSE).
