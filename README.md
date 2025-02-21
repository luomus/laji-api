## Description

The new FinBIF API, that FinBIF will migrate to.

See [breaking changes against the old API](https://github.com/luomus/laji-api/blob/master/breaking-changes.md)

## Development

Check the [wiki](https://github.com/luomus/laji-api/wiki) for a more technically detailed documentation.

### Stack

[Nest](https://github.com/nestjs/nest)

### Installation

```bash
$ npm ci
```

Fill in `.env` file, using `.env.example` as as template.

#### Other requirements

* [Redis](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/) >= 5
* [Oracle Instantclient](https://node-oracledb.readthedocs.io/en/latest/user_guide/installation.html#instzip)

### Run

Start Redis, and then run:

```bash
$ LD_LIBRARY_PATH=/opt/oracle/instantclient npm run start:dev
```

### Test

#### Unit tests

Unit tests coverage so far only some core logic. They act also as documentation for how they are supposed to work.

```bash
npm test
```

#### Integration tests

Currently we rely on the e2e tests from the old api. Fill in `integration-test/config.json` and then you can run the tests:

```bash
$ LD_LIBRARY_PATH=/opt/oracle/instantclient npm run test:e2e-old
```


## Contact

You can contact us by sending feedback from [laji.fi](https://laji.fi).

## License

[MIT](LICENSE).
