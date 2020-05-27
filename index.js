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

// start to apply callback rule
const saveFile = (filename, contents, callback) => {
    mkdirp(path.dirname(filename), err => {
        if (err) return callback(err)
        fs.writeFile(filename, contents, callback)
    })
}

const download = (url, filename, callback) => {
    console.log(`Downloading ${url}`)
    request(url, (err, res, body) => {
        if (err) return callback(err)
        saveFile(filename, body, err => {
            if (err) return callback(err)
            callback(null, body)
        })
    })
}

// using sequential execution
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

// using parallel execution
const spiderLinks = (currentUrl, body, nesting, callback) => {
    if (nesting === 0) return process.nextTick(callback)
    const links = utilities.getPageLinks(currentUrl, body)
    if (links.length === 0) return process.nextTick(callback)

    let completed = 0, hasErrors = false

    const done = err => {
        if (err) {
            hasErrors = true
            return callback(err)
        }
        if (++completed == links.length && !hasErrors) return callback()
    }

    links.forEach(link => spider(link, nesting - 1, done))
}

const spidering = new Map()

const spider = (url, nesting, callback) => {
    // adding a condition to solve a delay between calls and returns
    if (spidering.has(url)) return process.nextTick(callback)
    spidering.set(url, true)

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

spider(process.argv[2], 2, (err) => {
    if (err) {
        console.log(err)
        process.exit()
    } else {
        console.log('Download completed')
    }
    
})
