const express = require('express')
const { isWebUri } = require('valid-url')
const uuid = require('uuid/v4')
const logger = require('../logger')
const {bookmarks} = require('../store')
const BookmarksService = require('./BookmarksService')

const bookmarksRouter = express.Router()
const bodyParser = express.json()

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: bookmark.title,
    url: bookmark.url,
    description: bookmark.description,
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
    //TODO: update post to use db
    .post(bodyParser,(req,res)=>{

        const { title,url,description,rating } = req.body

        //VALIDATION

        if(!title){
            logger.error('Title is required')
            return res 
                .status(400)
                .send('Title is required')
        }

        if(!isWebUri(url)){
            logger.error('Invalid URL supplied')
            return res 
                .status(400)
                .send('url must be a valid URL')
        }

        if(!Number.isInteger(rating)||rating<0||rating>5){
            logger.error('Invalid rating supplied')
            return res 
                .status(400)
                .send('Rating must be a number between 0 and 5')
        }

        const id = uuid()

        const bookmark = {
            id, 
            title,
            url,
            description,
            rating
        }

        bookmarks.push(bookmark)

        logger.info(`Bookmark with id ${id} created`)

        res
            .status(201)
            .location(`http://localhost:8000/bookmarks/${id}`)
            .json(bookmark)
    })

bookmarksRouter
    .route('/bookmarks/:id')
    .get((req,res,next)=>{
        const { id } = req.params
        const knexInstance = req.app.get('db')
        BookmarksService.getById(knexInstance,id)
            .then(bookmark=>{
                if(!bookmark){
                    logger.error(`Bookmark with id ${id} not found.`)
                    return res.status(404).json({
                        error:{message:`Bookmark Not Found`}
                    })
                }
                res.json(serializeBookmark(bookmark))
            })
            .catch(next)
    })
    //TODO: update delete to use db
    .delete(bodyParser,(req,res)=>{
        const {id} = req.params
        const bookmarkIndex = bookmarks.findIndex(bm => bm.id == id)
    
        if(bookmarkIndex === -1){
            logger.error(`Bookmark with ${id} not found.`)
            return res
                .status(404)
                .send('Bookmark Not Found')
        }

        bookmarks.splice(bookmarkIndex,1)

        logger.info(`List with id ${id} deleted.`)
        res
            .status(204)
            .end()
    })


module.exports = bookmarksRouter