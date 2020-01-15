CREATE TABLE bookmark_items (
    id INTEGER PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT NOT NULL, 
    rating INTEGER NOT NULL
);