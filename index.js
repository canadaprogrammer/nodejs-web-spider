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
const exists = utilities.promisify(fs.exists)
const unlink = utilities.promisify(fs.unlink)

// delete downloaded file for testing
const rimraf = require('rimraf')

const downloaded = './' + process.argv[2].replace(/^http[s]?:\/\//, '')
const dfile = downloaded + '.html'
const dfolder = downloaded
console.log('file: ' + dfile, typeof dfile, 'folder: ' + dfolder)

try {
    // if (fs.existsSync(dfile)) {
    //     console.log('The file exist')
    //     fs.unlinkSync(dfile)
    // }
    rimraf.sync(dfolder)
} catch(e) {
    console.log(e)
}

// use promise
exists(dfile)
    .then(
        err => {console.warn('The file did not exist')},
        () => {
        console.log('deleted: ' + dfile, 'folder: ' + dfolder)
        unlink(dfile)
        }
    )

// // apply callback rule
// const saveFile = (filename, contents, callback) => {
//     mkdirp(path.dirname(filename), err => {
//         if (err) return callback(err)
//         // fs.writeFile(filename, contents, callback)
//         writeFile(filename, contents, callback)
//     })
// }

// const download = (url, filename, callback) => {
//     console.log(`Downloading ${url}`)

//     request(url, (err, res, body) => {
//         if (err) return callback(err)
//         saveFile(filename, body, err => {
//             if (err) return callback(err)
//             callback(null, body)
//         })
//     })

// use promise
const download = (url, filename) => {
    console.log(`Downloading ${url}`)
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

// using queue to prevent overflow
// limited parallel execution
// limited concurrency
const TaskQueue = require('./taskQueue')
const initialConcurrency = process.argv[3] ? parseInt(process.argv[3]) + 50 : 50
let downloadQueue = new TaskQueue(initialConcurrency)

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
    // return links.reduce(
    //     (prev, link) => prev.then(() => spider(link, nesting - 1)),
    //     Promise.resolve()
    // )

    // // parallel execution flow
    // const promise = links.map(link => spider(link, nesting - 1))
    // return Promise.all(promise)

    // use limited parallel execution flow
    if (links.length === 0) return Promise.resolve()

    return new Promise((resolve, reject) => {
        let completed = 0, hasErrors = false
        console.log('length of links:', links.length)
    
        if (downloadQueue.getConcurrency < links.length) {
            downloadQueue.setConcurrency(links.length)
        }
    
        links.forEach(link => {
            let task = () => {
                return spider(link, nesting -1)
                        .then(() => {
                            if (++completed === links.length) resolve()
                        })
                        .catch(() => {
                            if (!hasErrors) {
                                hasErrors = true
                                reject()
                            }
                        })
            }
            downloadQueue.pushTask(task)
        })
    })
}

const spidering = new Map()

const spider = (url, nesting) => {
    if (spidering.has(url)) return Promise.resolve()
    spidering.set(url, true)

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
