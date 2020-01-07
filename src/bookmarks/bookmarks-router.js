const express = require('express')
const { isWebUri } = require('valid-url')
const uuid = require('uuid/v4')
const logger = require('../logger')
const {bookmarks} = require('../store')

const bookmarksRouter = express.Router()
const bodyParser = express.json()

bookmarksRouter 
    .route('/bookmarks')
    .get((req,res)=>{
        res.json(bookmarks)
    })
    .post(bodyParser,(req,res)=>{

        const { title,url,description,rating } = req.body

        //VALIDATION

        if(!title){
            logger.error('Title is required')
            return res 
                .status(400)
                .send('Title is required')
        }
        console.log(rating)

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
    .get((req,res)=>{
        const {id} = req.params
        const bookmark = bookmarks.find(bm=>bm.id==id)

        if(!bookmark){
            logger.error(`Bookmark with ${id} not found.`)
            return res  
                .status(404)
                .send('Bookmark Not Found')
        }

        res.json(bookmark)
    })
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