const express = require('express')
const { isWebUri } = require('valid-url')
const xss = require('xss')
const uuid = require('uuid/v4')
const logger = require('../logger')
const {bookmarks} = require('../store')
const BookmarksService = require('./BookmarksService')

const bookmarksRouter = express.Router()
const bodyParser = express.json()

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: bookmark.url,
    description: xss(bookmark.description),
    rating: Number(bookmark.rating),
})

bookmarksRouter 
    .route('/bookmarks')
    .get((req,res,next)=>{
        const knexInstance = req.app.get('db')
        BookmarksService.getAllBookmarks(knexInstance)
            .then(bookmarks=>{
                res.json(bookmarks.map(serializeBookmark))
            })
            
            .catch(next)
    })
    .post(bodyParser,(req,res, next)=>{

        const { title,url,description,rating } = req.body
        const newBookmark = { title,url,description,rating } 

        //VALIDATION

        if(!newBookmark.title){
            logger.error('Title is required')
            return res 
                .status(400)
                .send({error: {message:`Missing 'title' in request body`}})
        }

        if(!isWebUri(newBookmark.url)){
            logger.error('Invalid URL supplied')
            return res 
                .status(400)
                .send({error: {message:`'url' must be a valid URL`}})
        }

        if(!Number.isInteger(newBookmark.rating)||newBookmark.rating<0||rating>5){
            logger.error('Invalid rating supplied')
            return res 
                .status(400)
                .send({error:{message:`'rating' must be an integer between 0 and 5`}})
        }

        //validation end

        BookmarksService.insertBookmark(
            req.app.get('db'),
            newBookmark
        )
            .then(bookmark=>{
                res 
                    .status(201)
                    .location(`/bookmarks/${bookmark.id}`)
                    .json(serializeBookmark(bookmark))
            })
            .catch(next)
    })

bookmarksRouter
    .route('/bookmarks/:id')
    .all((req,res,next)=>{
        BookmarksService.getById(
            req.app.get('db'),
            req.params.id
        )
            .then(bookmark=>{
                if(!bookmark){
                    return res.status(404).json({
                        error:{message:`Bookmark Not Found`}
                    })
                }
                res.bookmark = bookmark 
                next()
            })
            .catch(next)
    })
    .get((req,res,next)=>{
        res.json(serializeBookmark(res.bookmark))
    })
    //TODO: update delete to use db
    .delete((req,res,next)=>{
        BookmarksService.deleteBookmark(
            req.app.get('db'),
            req.params.id
        )
            .then(()=>{
                res.status(204).end()
            })
            .catch(next)
    })


module.exports = bookmarksRouter