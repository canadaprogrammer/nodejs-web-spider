"use strict"

const thunkify = require('thunkify')
const co = require('co')

const fs = require('fs')
const request = thunkify(require('request'))
const mkdirp = thunkify(require('mkdirp'))
const readFile = thunkify(fs.readFile)
const writeFile = thunkify(fs.writeFile)
const nextTick = thunkify(process.nextTick)

const path = require('path')
const utilities = require('./utilities')


function* download(url, filename) {
    console.log(`Downloading ${url}`)
    const response = yield request(url)
    const body = response[1]
    yield mkdirp(path.dirname(filename))
    yield writeFile(filename, body)
    console.log(`Downloaded and saved ${url}`)
    return body
}

// // sequential execution
// function* spiderLinks(currentUrl, body, nesting) {
//     if (nesting === 0) return nextTick()
//     const links = utilities.getPageLinks(currentUrl, body)
//     for (let i = 0; i < links.length; i++) {
//         yield spider(links[i], nesting - 1)
//     }
// }

// // parallel execution
// function spiderLinks(currentUrl, body, nesting) {
//     if (nesting === 0) return nextTick()

//     // return thunk
//     return callback => {
//         let completed = 0, hasErrors = false
//         const links = utilities.getPageLinks(currentUrl, body)
//         if (links.length === 0) return process.nextTick(callback)

//         function done(err, result) {
//             if (err && !hasErrors) {
//                 hasErrors = true
//                 return callback(err)
//             }
//             if (++completed === links.length && !hasErrors) callback()
//         }

//         for (let i = 0; i < links.length; i++) {
//             co(spider(links[i], nesting - 1)).then(done)
//         }
//     }
// }

// limited parallel execution
const TaskQueue = require('./taskQueue')
const downloadQueue = new TaskQueue(2)

function spiderLinks(currentUrl, body, nesting) {
    if (nesting === 0) return nextTick()

    // return thunk
    return callback => {
        let completed = 0, hasErrors = false
        const links = utilities.getPageLinks(currentUrl, body)
        if (links.length === 0) return process.nextTick(callback)

        function done(err, result) {
            if (err && !hasErrors) {
                hasErrors = true
                return callback(err)
            }
            if (++completed === links.length && !hasErrors) callback()
        }

        links.forEach(link => {
            downloadQueue.pushTask(function* () {
                yield spider(link, nesting - 1)
                done()
            })
        })
    }
}
function* spider(url, nesting) {
    const filename = utilities.urlToFilename(url)
    let body
    try {
        body = yield readFile(filename, 'utf8')
    } catch(err) {
        if (err.code !== 'ENOENT') throw err
        body = yield download(url, filename)
    }
    yield spiderLinks(url, body, nesting)
}

co(function* () {
    try {
        yield spider(process.argv[2], 1)
        console.log('Download complete')
    } catch(err) {
        console.log(err)
    }
})
