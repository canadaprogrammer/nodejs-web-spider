"use strict"

const request = require('request')
const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')
const utilities = require('./utilities')

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

// // start to apply callback rule
// const saveFile = (filename, contents, callback) => {
//     mkdirp(path.dirname(filename), err => {
//         if (err) return callback(err)
//         fs.writeFile(filename, contents, callback)
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
// }

// apply async.series() for sequential execution flow
const async = require('async')
const download = (url, filename, callback) => {
    console.log(`Downloading ${url}`)

    let body
    
    async.series([
        callback => {
            request(url, (err, res, resBody) => {
                if (err) return callback(err)
                body = resBody
                callback()
            })
        },
        mkdirp.bind(null, path.dirname(filename)),

        callback => fs.writeFile(filename, body, callback)
    ], err => {
        if (err) return callback

        console.log(`Downloaded and saved: ${url}`)
        callback(null, body)
    })
}

// const spiderLinks = (currentUrl, body, nesting, callback) => {
//     if (nesting === 0) return process.nextTick(callback)
//     const links = utilities.getPageLinks(currentUrl, body)
//     if (links.length === 0) return process.nextTick(callback)

//     // // repeat links
//     // const iterate = index => {
//     //     if (index === links.length) return callback()
//     //     spider(links[index], nesting - 1, err => {
//     //         if (err) return callback(err)
//     //         iterate(index + 1)
//     //     })
//     // }
//     // iterate(0)

//     // apply async.eachSeries for sequential iteration
//     async.each(links, (link, callback) => {
//         spider(link, nesting - 1, callback)
//     }, callback)
// }

// limited parallel execution
const downloadQueue = async.queue((taskData, callback) => {
    spider(taskData.link, taskData.nesting - 1, callback)
}, 2)

const spiderLinks = (currentUrl, body, nesting, callback) => {
    if (nesting === 0) return process.nextTick(callback)
    const links = utilities.getPageLinks(currentUrl, body)
    if (links.length === 0) return process.nextTick(callback)

    let completed = 0, hasErrors = false

    links.forEach(link => {
        const taskData = {link, nesting}
        downloadQueue.push(taskData, err => {
            if (err) {
                hasErrors = true
                return callback(err)
            }
            if (++completed === links.length && !hasErrors) callback()
        })
    })
}

const spider = (url, nesting, callback) => {
    const filename = utilities.urlToFilename(url)
    fs.readFile(filename, 'utf8', (err, body) => {
        if (err) {
            if (err.code !== 'ENOENT') return callback(err)

            return download(url, filename, (err, body) => {
                if (err) return callback(err)
                spiderLinks(url, body, nesting, callback)
            })
        }

        spiderLinks(url, body, nesting, callback)
    })
}
// end

spider(process.argv[2], 1, (err) => {
    if (err) {
        console.log(err)
        process.exit()
    } else {
        console.log('Download completed')
    }
    
})
