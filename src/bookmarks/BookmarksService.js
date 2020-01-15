const BookmarksService = {
    getAllBookmarks(knex){
        return knex.select('*').from('bookmark_items')
    },
    getById(knex,id){
        return knex.from('bookmark_items').select('*').where('id',id).first()
    }
}

module.exports = BookmarksService