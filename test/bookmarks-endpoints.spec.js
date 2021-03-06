const knex = require('knex')
const fixtures = require('./bookmarks-fixtures')
const app = require('../src/app')

describe('Bookmarks Endpoints', () => {
    let db
  
    before('make knex instance', () => {
      db = knex({
        client: 'pg',
        connection: process.env.TEST_DB_URL,
      })
      app.set('db', db)
    })
  
    after('disconnect from db', () => db.destroy())
  
    before('cleanup', () => db('bookmark_items').truncate())
  
    afterEach('cleanup', () => db('bookmark_items').truncate())
  
    //Authorization tests
    describe(`Unauthorized requests`, () => {
      const testBookmarks = fixtures.makeBookmarksArray()
      
      beforeEach('insert bookmarks',()=>{
        return db 
          .into('bookmark_items')
          .insert(testBookmarks)
      })

      it(`responds with 401 Unauthorized for GET /bookmarks`, () => {
        return supertest(app)
          .get('/api/bookmarks')
          .expect(401, { error: 'Unauthorized request' })
      })
  
      it(`responds with 401 Unauthorized for POST /bookmarks`, () => {
        return supertest(app)
          .post('/api/bookmarks')
          .send({ title: 'test-title', url: 'http://some.thing.com', rating: 1 })
          .expect(401, { error: 'Unauthorized request' })
      })
  
      it(`responds with 401 Unauthorized for GET /bookmarks/:id`, () => {
        const secondBookmark = testBookmarks[1]
        return supertest(app)
          .get(`/api/bookmarks/${secondBookmark.id}`)
          .expect(401, { error: 'Unauthorized request' })
      })
  
      it(`responds with 401 Unauthorized for DELETE /bookmarks/:id`, () => {
        const aBookmark = testBookmarks[1]
        return supertest(app)
          .delete(`/api/bookmarks/${aBookmark.id}`)
          .expect(401, { error: 'Unauthorized request' })
      })

    })
  
    //GET /bookmarks tests
    describe('GET /bookmarks', () => {

      context(`Given no bookmarks`, () => {
        it(`responds with 200 and an empty list`, () => {
          return supertest(app)
            .get('/api/bookmarks')
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(200, [])
        })
      })
  
      context('Given there are bookmarks in the database', () => {
        const testBookmarks = fixtures.makeBookmarksArray()
  
        beforeEach('insert bookmarks', () => {
          return db
            .into('bookmark_items')
            .insert(testBookmarks)
        })
  
        it('gets the bookmarks from the store', () => {
          return supertest(app)
            .get('/api/bookmarks')
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(200, testBookmarks)
        })
      })

      //INSERT XSS tests here
      context(`Given an XSS attack bookmark`,()=>{
        const {maliciousBookmark,expectedBookmark} = fixtures.makeMaliciousBookmark()

        beforeEach('insert malicious bookmark',()=>{
          return db 
            .into('bookmark_items')
            .insert([maliciousBookmark])
        })

        it('removes XSS attack content',()=>{
          return supertest(app)
            .get(`/api/bookmarks`)
            .set('Authorization',`Bearer ${process.env.API_TOKEN}`)
            .expect(200)
            .expect(res=>{
              expect(res.body[0].title).to.eql(expectedBookmark.title)
              expect(res.body[0].description).to.eql(expectedBookmark.description)
            })
        })
      })

    })
  
    //GET /bookmarks/:id tests
    describe('GET /bookmarks/:id', () => {
      context(`Given no bookmarks`, () => {
        it(`responds 404 when bookmark doesn't exist`, () => {
          return supertest(app)
            .get(`/api/bookmarks/123`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(404, {
              error: { message: `Bookmark Not Found` }
            })
        })
      })
  
      context('Given there are bookmarks in the database', () => {
        const testBookmarks = fixtures.makeBookmarksArray()
  
        beforeEach('insert bookmarks', () => {
          return db
            .into('bookmark_items')
            .insert(testBookmarks)
        })
  
        it('responds with 200 and the specified bookmark', () => {
          const bookmarkId = 2
          const expectedBookmark = testBookmarks[bookmarkId - 1]
          return supertest(app)
            .get(`/api/bookmarks/${bookmarkId}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(200, expectedBookmark)
        })
      })
      
      //INSERT XSS tests here
      context(`Given an XSS attack bookmark`,()=>{
        const { maliciousBookmark, expectedBookmark } = fixtures.makeMaliciousBookmark()

        beforeEach('insert malicious bookmark', () => {
          return db
            .into('bookmark_items')
            .insert([maliciousBookmark])
        })

        it('removes XSS attack content', () => {
          return supertest(app)
            .get(`/api/bookmarks/${maliciousBookmark.id}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(200)
            .expect(res => {
              expect(res.body.title).to.eql(expectedBookmark.title)
              expect(res.body.description).to.eql(expectedBookmark.description)
            })
        })

      })

    })

    //DELETE /bookmarks/:id tests
    describe('DELETE /bookmarks/:id',()=>{
      
      context(`Given no bookmarks`,()=>{
        it(`responds 404 when bookmark doesn't exist`,()=>{
          return supertest(app)
            .delete(`/api/bookmarks/123`)
            .set('Authorization',`Bearer ${process.env.API_TOKEN}`)
            .expect(404, {
              error:{message:`Bookmark Not Found`}
            })
        })
      })
    
      context('Given there are bookmarks in the database',()=>{
        const testBookmarks = fixtures.makeBookmarksArray()

        beforeEach('insert bookmarks',()=>{
          return db 
            .into('bookmark_items')
            .insert(testBookmarks)
        })

        it('removes the bookmark by ID from the store',()=>{
          const idToRemove = 2
          const expectedBookmarks = testBookmarks.filter(bm=>bm.id !== idToRemove)
          return supertest(app)
            .delete(`/api/bookmarks/${idToRemove}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(204)
            .then(()=>
              supertest(app)
                .get('/api/bookmarks')
                .set('Authorization',`Bearer ${process.env.API_TOKEN}`)
                .expect(expectedBookmarks)
            )
        })
      })
    })

    //POST /bookmarks tests
    describe('POST /bookmarks',()=>{
      
      it(`responds with 400 missing 'title' if not supplied`,()=>{
        const newBookmarkMissingTitle = {
          //title: 'test-title'
          url: 'https://test.com',
          rating:1,
        }
        return supertest(app)
          .post(`/api/bookmarks`)
          .send(newBookmarkMissingTitle)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(400, {
            error: {message:`Missing 'title' in request body`}
          })
      })

      it(`responds with 400 invalid 'url' if not a valid URL`,()=>{
        const newBookmarkInvalidUrl = {
          title: 'test-title',
          url: 'htp://invalid-url',
          rating: 1,
        }
        return supertest(app)
          .post(`/api/bookmarks`)
          .send(newBookmarkInvalidUrl)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(400,{
            error:{message:`'url' must be a valid URL`}
          })
      })
      
      it(`responds with 400 'rating' must be between an integer 0 and 5 if not`,()=>{
        const newBookmarkInvalidRating = {
          title: 'test-title',
          url: 'https://test.com',
          rating: 50
        }
        return supertest(app)
          .post(`/api/bookmarks`)
          .send(newBookmarkInvalidRating)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(400,{
            error:{message:`'rating' must be an integer between 0 and 5`}
          })
      })

      it('adds a new bookmark to the store',()=>{
        const newBookmark = {
          title:'test-title',
          url: 'https://test.com',
          description: 'test description',
          rating: 1
        }
        return supertest(app)
          .post(`/api/bookmarks`) 
          .send(newBookmark)
          .set('Authorization',`Bearer ${process.env.API_TOKEN}`)
          .expect(201)
          .expect(res=>{
            expect(res.body.title).to.eql(newBookmark.title)
            expect(res.body.url).to.eql(newBookmark.url)
            expect(res.body.description).to.eql(newBookmark.description)
            expect(res.body.rating).to.eql(newBookmark.rating)
            expect(res.body).to.have.property('id')
            expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
          })
          .then(res=>
            supertest(app)
              .get(`/api/bookmarks/${res.body.id}`)
              .set('Authorization',`Bearer ${process.env.API_TOKEN}`)
              .expect(res.body)
          )
      })
      
      //INSERT XSS tests here
      it('removes XSS attack content from response',()=>{
        const {maliciousBookmark,expectedBookmark} = fixtures.makeMaliciousBookmark()
        return supertest(app)
          .post(`/api/bookmarks`)
          .send(maliciousBookmark)
          .set('Authorization',`Bearer ${process.env.API_TOKEN}`)
          .expect(201)
          .expect(res => {
            expect(res.body.title).to.eql(expectedBookmark.title)
            expect(res.body.description).to.eql(expectedBookmark.description)
          })
      })
    })

    describe.only(`PATCH /api/bookmarks/:id`,()=>{
      context(`Given no bookmarks`,()=>{
        it(`respond with 404`,()=>{
          const bookmarkId = 123456
          return supertest(app)
            .patch(`/api/bookmarks/${bookmarkId}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(404, {error:{message: `Bookmark Not Found`}})
        })
      })

      context(`Given there are bookmarks in the database`,()=>{
        const testBookmarks = fixtures.makeBookmarksArray()

        beforeEach('insert bookmarks',()=>{
          return db 
            .into('bookmark_items')
            .insert(testBookmarks)
        })

        it('responds with 204 and updates the article',()=>{
          const idToUpdate=2
          const updateBookmark={
            title: 'updated title',
            url: 'https://invalid-url.com',
            rating: 1,
            description: 'updated description'
          }
          const expectedBookmark = {
            ...testBookmarks[idToUpdate-1],
            ...updateBookmark
          }
          return supertest(app)
            .patch(`/api/bookmarks/${idToUpdate}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .send(updateBookmark)
            .expect(204)
            .then(res=>
              supertest(app)
                .get(`/api/bookmarks/${idToUpdate}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(updateBookmark)
                .expect(expectedBookmark)  
            )
        })

        it(`responds with 400 when no required fields supplied`,()=>{
          const idToUpdate = 2
          return supertest(app)
            .patch(`/api/bookmarks/${idToUpdate}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .send({irrelevantField:'foo'})
            .expect(400,{
              error:{message:`Request body must contain either 'title','url','rating' or 'description'`}
            })
        })

        it(`responds with 204 when updating only a subset of fields`,()=>{
          const idToUpdate=2
          const updateBookmark={
            title:'update bookmark title'
          }
          const expectedBookmark = {
            ...testBookmarks[idToUpdate-1],
            ...updateBookmark
          }

          return supertest(app)
            .patch(`/api/bookmarks/${idToUpdate}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .send({
              ...updateBookmark,
              fieldToIgnore:'should not be in GET response'
            })
            .expect(204)
            .then(res=>
              supertest(app)
                .get(`/api/bookmarks/${idToUpdate}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(expectedBookmark)  
            )

        })

      })
    })


  })