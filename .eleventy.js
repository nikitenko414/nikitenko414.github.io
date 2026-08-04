module.exports = function (eleventyConfig) {
  // Output lands directly in the repo root, exactly where GitHub Pages
  // already expects "main / (root)" to serve from — no Pages settings
  // change, no new deploy Action. src/, scripts/, .github/, telegram-inbox/
  // etc. all live outside the "views" input dir, so 11ty never touches them.
  return {
    dir: {
      input: 'views',
      output: '.',
      includes: '_includes',
    },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };
};
