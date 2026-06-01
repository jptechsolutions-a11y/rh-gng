/**
 * Code.gs — entrypoint do web app.
 */
function doGet(e) {
  const tpl = HtmlService.createTemplateFromFile('ui/index');
  return tpl.evaluate()
    .setTitle('RH G&G')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
