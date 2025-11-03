## Description

The new FinBIF API, that FinBIF will migrate to.

See [breaking changes against the old API](https://github.com/luomus/laji-api/blob/master/breaking-changes.md)

## Development

Check the [wiki](https://github.com/luomus/laji-api/wiki) for a more technically detailed documentation.

### Stack

[Nest](https://github.com/nestjs/nest)

### Installation & running

Fill in `.env` file, using `.env.example` as a template.

The app can be ran inside a docker, or directly on the host machine.

#### Docker (recommended)

Use `docker` to build & start the app:

```bash
npm run docker
```

*Hint:* The docker container runs any npm script, `start:dev` being the default. You can run other scripts like so:

```bash
npm run docker -- test:e2e
```

#### Without Docker

Install the dependencies:

```bash
$ npm ci
```

Install the following:

* [Redis](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/) >= 5
* [Oracle Instant Client](https://node-oracledb.readthedocs.io/en/latest/user_guide/installation.html#instzip)


##### Running

1. Start Redis
2. Make sure the Oracle Instant Client is installed at `/opt/oracle/instantclient` or adjust the next step accordingly:
3. 
```bash
$ LD_LIBRARY_PATH=/opt/oracle/instantclient npm run start:dev
```

The UI will be available at http://localhost:3004

### Test

Hint: The npm command works also with the aforementioned Docker container. These examples run `npm` directly for simplicity.

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
$ npm run docker -- test:e2e
```

Without Docker:

```bash
$ LD_LIBRARY_PATH=/opt/oracle/instantclient npm run test:e2e
```

## Contact

You can contact us by sending feedback from [laji.fi](https://laji.fi).

## License

[MIT](LICENSE).
