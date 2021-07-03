module.exports = {
  scripts: {
    test: {
      default: 'mocha \'./test/**/*-test.js\'',
      unit: 'mocha \'test/unit/**/*-test.js\'',
      it: 'mocha ./test/it/**/*-test.js',
    },
  },
}
