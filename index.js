"use strict"

const request = require('request')
const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')
const utilities = require('./utilities')

// delete downloaded file for testing
const rimraf = require('rimraf')
try {
    const dfile = './code.visualstudio.com.html'
    const dfolder ='./code.visualstudio.com' 
    if (fs.existsSync(dfile)) fs.unlinkSync(dfile)
    rimraf.sync(dfolder)
} catch(e) {
    console.log(e)
}

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
            console.log(`Downloaded and saved: ${url}`)
            callback(null, body)
        })
    })
}

// using queue to prevent overflow
// limitted parallel execution
// limitted concurrency
const TaskQueue = require('./taskQueue')
const initialConcurrency = process.argv[3] ? parseInt(process.argv[3]) : 50
let downloadQueue = new TaskQueue(initialConcurrency)

const spiderLinks = (currentUrl, body, nesting, callback) => {
    if (nesting === 0) return process.nextTick(callback)
    const links = utilities.getPageLinks(currentUrl, body)
    if (links.length === 0) return process.nextTick(callback)

    let completed = 0, hasErrors = false
    console.log('length of links:', links.length)

    if (downloadQueue.getConcurrency < links.length) {
        downloadQueue.setConcurrency(links.length)
    }

    links.forEach(link => {
        downloadQueue.pushTask(done => {
            spider(link, nesting - 1, err => {
                if (err) {
                    console.log('here', count)
                    hasErrors = true
                    return callback(err)
                }
                if (++completed === links.length && !hasErrors) {
                    callback()
                }
                done()
            })
        })
    })
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
                // console.log('err: ', err)
                if (err) return callback(err)
                spiderLinks(url, body, nesting, callback)
            })
        }

        spiderLinks(url, body, nesting, callback)
    })
}
// end

// for testing
// spider(process.argv[2], parseInt(process.argv[3]), (err) => {
// In case of https://yarnpkg.org
// when nesting was 2, concurrency needed to be greater than or equal to the highest length of links
// when nesting was 3, concurrency needed to be greater than 140 but the highest length of links was 108
// However, the results of nesting 2 and 3 were not different 

spider(process.argv[2], 2, (err) => {
    if (err) {
        console.log(err)
        process.exit()
    } else {
        console.log('Download completed')
    }
    
})


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

// // using parallel execution
// const spiderLinks = (currentUrl, body, nesting, callback) => {
//     if (nesting === 0) return process.nextTick(callback)
//     const links = utilities.getPageLinks(currentUrl, body)
//     if (links.length === 0) return process.nextTick(callback)

//     let completed = 0, hasErrors = false

//     const done = err => {
//         if (err) {
//             hasErrors = true
//             return callback(err)
//         }
//         if (++completed === links.length && !hasErrors) callback()
//     }

//     links.forEach(link => {
//         spider(link, nesting - 1, done)
//     })
// }
