const BookmarksService = {
    getAllBookmarks(knex){
        return knex.select('*').from('bookmark_items')
    },
    getById(knex,id){
        return knex.from('bookmark_items').select('*').where('id',id).first()
    },
    insertBookmark(knex,newBookmark){
        return knex
            .insert(newBookmark)
            .into('bookmark_items')
            .returning('*')
            .then(rows=>{
                return rows[0]
            })
    },
    deleteBookmark(knex,id){
        return knex('bookmark_items')
            .where({id})
            .delete()
    }
}

module.exports = BookmarksService