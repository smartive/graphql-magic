module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      '@babel/typescript',
      [
        '@babel/env',
        {
          corejs: 3,
          useBuiltIns: 'usage',
          modules: 'umd',
        },
      ],
    ],
  };
};
