"use strict"

const urlParse = require('url').parse
const slug = require('slug')
const path = require('path')
const urlResolve = require('url').resolve;
const cheerio = require('cheerio');

module.exports.urlToFilename = url => {
  const parsedUrl = urlParse(url)
  const urlPath = parsedUrl.path.split('/')
                  .filter(component => component !== '')
                  .map(component => slug(component, {remove: null}))
                  .join('/')
  let filename = path.join(parsedUrl.hostname, urlPath)
  if (!path.extname(filename).match(/htm/)) filename += '.html'
  return filename
}

module.exports.getLinkUrl = (currentUrl, element) => {
  const link = urlResolve(currentUrl, element.attribs.href || "")
  const parsedLink = urlParse(link)
  const currentParsedUrl = urlParse(currentUrl)
  if (parsedLink.hostname !== currentParsedUrl.hostname || !parsedLink.pathname) return null
  return link
};

// get list of all links
module.exports.getPageLinks = (currentUrl, body) => {
  return [].slice.call(cheerio.load(body)('a'))
        .map(element => module.exports.getLinkUrl(currentUrl, element))
        .filter(element => element)
};