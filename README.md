## Description

The new FinBIF API, that FinBIF will slowly migrate to.

## Development

Check the [Get started wiki page](https://github.com/luomus/laji-api/wiki/Get-started)

### Stack

[Nest](https://github.com/nestjs/nest)

### Installation

```bash
$ npm install
```

Fill in `.env` file, using `.env.example` as as template.

You need to also install the oracle instantclient. Follow the instructions at https://node-oracledb.readthedocs.io/en/latest/user_guide/installation.html#instzip

### Run

```bash
$ LD_LIBRARY_PATH=/opt/oracle/instantclient npm run start:dev
```

### Test

Currently we rely on the e2e tests from the old api. Fill in `integration-test/config.json` and then you can run the tests:

```bash
$ LD_LIBRARY_PATH=/opt/oracle/instantclient npm run test:e2e-old
```


## Contact

You can contact us by sending feedback from [laji.fi](https://laji.fi).

## License

[MIT](LICENSE).
