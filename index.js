"use strict"

// const request = require('request')
// const mkdirp = require('mkdirp')
const fs = require('fs')
const path = require('path')
const utilities = require('./utilities')

// apply promisification
const request = utilities.promisify(require('request'))
const mkdirp = utilities.promisify(require('mkdirp'))
const readFile = utilities.promisify(fs.readFile)
const writeFile = utilities.promisify(fs.writeFile)

// const spider = (url, callback) => {
//     const filename = utilities.urlToFilename(url)
//     fs.exists(filename, exists => {
//         if (!exists) {
//             console.log(`Downloading ${url}`)
//             request(url, (err, res, body) => {
//                 if (err) return callback(err)
//                 mkdirp(path.dirname(filename), err => {
//                     if (err) return callback(err)
//                     fs.writeFile(filename, body, err => {
//                         if (err) return callback(err)
//                         callback(null, filename, true)
//                     })
//                 })
//             })
//         } else callback(null, filename, false)
//     })
// }

// start to apply callback rule
const saveFile = (filename, contents, callback) => {
    mkdirp(path.dirname(filename), err => {
        if (err) return callback(err)
        // fs.writeFile(filename, contents, callback)
        writeFile(filename, contents, callback)
    })
}

const download = (url, filename, callback) => {
    console.log(`Downloading ${url}`)
    // request(url, (err, res, body) => {
    //     if (err) return callback(err)
    //     saveFile(filename, body, err => {
    //         if (err) return callback(err)
    //         callback(null, body)
    //     })
    // })

    // use promise
    let body
    return request(url)
                .then(response => {
                    body = response.body
                    return mkdirp(path.dirname(filename))
                })
                .then(() => writeFile(filename, body))
                .then(() => {
                    console.log(`Downloaded and saved: ${url}`)
                    return body
                })
}

// const spiderLinks = (currentUrl, body, nesting, callback) => {
//     if (nesting === 0) return process.nextTick(callback)
//     const links = utilities.getPageLinks(currentUrl, body)
//     // repeat links
//     const iterate = index => {
//         if (index === links.length) return callback()
//         spider(links[index], nesting - 1, err => {
//             if (err) return callback(err)
//             iterate(index + 1)
//         })
//     }
//     iterate(0)
// }

// const spider = (url, nesting, callback) => {
//     const filename = utilities.urlToFilename(url)
//     fs.readFile(filename, 'utf8', (err, body) => {
//         if (err) {
//             if (err.code !== 'ENOENT') return callback(err)

//             return download(url, filename, (err, body) => {
//                 if (err) return callback(err)
//                 spiderLinks(url, body, nesting, callback)
//             })
//         }

//         spiderLinks(url, body, nesting, callback)
//     })
// }

// use promise
const spiderLinks = (currentUrl, body, nesting) => {
    // // use forEach
    // let promise = Promise.resolve()
    // if (nesting === 0) return promise
    // const links = utilities.getPageLinks(currentUrl, body)
    // links.forEach(link => promise = promise.then(() => spider(link, nesting - 1)))
    // return promise

    // use reduce
    if (nesting === 0) return Promise.resolve()
    const links = utilities.getPageLinks(currentUrl, body)
    return links.reduce(
        (prev, link) => prev.then(() => spider(link, nesting - 1)),
        Promise.resolve()
    )
}
const spider = (url, nesting) => {
    let filename = utilities.urlToFilename(url)
    return readFile(filename, 'utf8')
            .then(
                body => spiderLinks(url, body, nesting),
                err => {
                    if (err.code !== 'ENOENT') throw err
                    return download(url, filename)
                            .then(body => spiderLinks(url, body, nesting))
                }
            )
}
// end

// spider(process.argv[2], 1, (err) => {
//     if (err) {
//         console.log(err)
//         process.exit()
//     } else {
//         console.log('Download completed')
//     }
    
// })

// use primise
spider(process.argv[2], 1)
    .then(() => console.log('Download completed'))
    .catch(err => console.log(err))
