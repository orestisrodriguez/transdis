[![NPM Version](https://img.shields.io/npm/v/transdis.svg?style=flat)]()
[![NPM License](https://img.shields.io/npm/l/all-contributors.svg?style=flat)](https://github.com/orestisrodriguez/transdis/blob/master/LICENSE)
[![NPM Downloads](https://img.shields.io/npm/dt/transdis.svg?style=flat)]()  

# Transdis

Transdis is a utility to migrate data between Redis instances, with TLS support.

## Installation

Use [yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/package/npm) to install Transdis.

```bash
yarn add transdis

npm install transdis
```

## Usage

```js
import transdis from 'transdis'

const source = {
  host: '<source_instance_host>',
  port: 6379,
}

const destination = {
  host: '<destination_instance_host>',
  port: 6379,
  tls: {},
}

const opts = {}

transdis.migrate(source, destination, opts)
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://choosealicense.com/licenses/mit/)
