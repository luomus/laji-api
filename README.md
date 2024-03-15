## Description

The new FinBIF API, that FinBIF will slowly migrate to.

## Development

Check the [wiki](https://github.com/luomus/laji-api/wiki) for higher level documetation.

### Stack

[Nest](https://github.com/nestjs/nest)

### Installation

```bash
$ npm ci
```

Fill in `.env` file, using `.env.example` as as template.

You need to also install the oracle instantclient. Follow the instructions at https://node-oracledb.readthedocs.io/en/latest/user_guide/installation.html#instzip

### Run

```bash
$ LD_LIBRARY_PATH=/opt/oracle/instantclient npm run start:dev
```

### Test

#### Unit tests

Unit tests coverage so far only some core logic. They act as documentation for how they are supposed to work.

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
